use regex::Regex;
use std::{
  collections::HashSet,
  path::{Path, PathBuf},
  sync::Mutex,
};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;

const MAX_TEXT_FILE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_PROJECT_FILES: usize = 700;
const MAX_PROJECT_DEPTH: usize = 8;
const MAX_SEARCH_RESULTS: usize = 1000;

#[derive(Default)]
struct FileAccess {
  files: Mutex<HashSet<PathBuf>>,
  roots: Mutex<HashSet<PathBuf>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedFile {
  path: String,
  name: String,
  content: String,
  encoding: String,
  eol: String,
  read_only: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedFile {
  path: String,
  name: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFolder {
  root: String,
  files: Vec<ProjectFile>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFile {
  path: String,
  relative_path: String,
  size: u64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
  path: String,
  relative_path: String,
  line_number: usize,
  line: String,
}

#[tauri::command]
async fn pick_text_file(app: AppHandle, access: State<'_, FileAccess>) -> Result<Option<OpenedFile>, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app
    .dialog()
    .file()
    .set_title("Open File")
    .pick_file(move |path| {
      let _ = tx.send(path);
    });

  let Some(path) = rx.await.map_err(|error| error.to_string())? else {
    return Ok(None);
  };
  let path = path.into_path().map_err(|error| error.to_string())?;
  allow_file(&access, &path)?;
  read_opened_file(&path, &access)
}

#[tauri::command]
async fn pick_project_folder(
  app: AppHandle,
  access: State<'_, FileAccess>,
) -> Result<Option<ProjectFolder>, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app
    .dialog()
    .file()
    .set_title("Open Project Folder")
    .pick_folder(move |path| {
      let _ = tx.send(path);
    });

  let Some(root) = rx.await.map_err(|error| error.to_string())? else {
    return Ok(None);
  };
  let root = root.into_path().map_err(|error| error.to_string())?;
  let root = canonicalize_existing(&root)?;
  allow_root(&access, &root)?;
  let files = list_project_files_inner(&root)?;
  Ok(Some(ProjectFolder {
    root: root.to_string_lossy().to_string(),
    files,
  }))
}

#[tauri::command]
async fn save_text_file_as(
  app: AppHandle,
  access: State<'_, FileAccess>,
  default_name: String,
  contents: String,
  encoding: String,
) -> Result<Option<SavedFile>, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app
    .dialog()
    .file()
    .set_title("Save File")
    .set_file_name(default_name)
    .save_file(move |path| {
      let _ = tx.send(path);
    });

  let Some(path) = rx.await.map_err(|error| error.to_string())? else {
    return Ok(None);
  };
  let path = path.into_path().map_err(|error| error.to_string())?;
  write_text_file_inner(&path, contents, &encoding)?;
  allow_file_for_write(&access, &path)?;
  Ok(Some(saved_file(&path)))
}

#[tauri::command]
fn read_text_file(path: PathBuf, access: State<FileAccess>) -> Result<Option<OpenedFile>, String> {
  let opened = read_opened_file(&path, &access)?;
  if opened.is_some() {
    allow_file(&access, &path)?;
  }
  Ok(opened)
}

#[tauri::command]
fn write_text_file(
  path: PathBuf,
  contents: String,
  encoding: String,
  access: State<FileAccess>,
) -> Result<SavedFile, String> {
  ensure_authorized_for_write(&path, &access)?;
  write_text_file_inner(&path, contents, &encoding)?;
  allow_file_for_write(&access, &path)?;
  Ok(saved_file(&path))
}

#[tauri::command]
fn list_project_files(root: PathBuf, access: State<FileAccess>) -> Result<Vec<ProjectFile>, String> {
  ensure_authorized_root(&root, &access)?;
  list_project_files_inner(&canonicalize_existing(&root)?)
}

#[tauri::command]
fn search_project_files(
  root: PathBuf,
  query: String,
  regex: bool,
  case_sensitive: bool,
  access: State<FileAccess>,
) -> Result<Vec<SearchResult>, String> {
  ensure_authorized_root(&root, &access)?;
  let root = canonicalize_existing(&root)?;
  let files = list_project_files_inner(&root)?;
  let matcher = if regex {
    let pattern = if case_sensitive {
      query.clone()
    } else {
      format!("(?i){query}")
    };
    Some(Regex::new(&pattern).map_err(|error| format!("Invalid regex: {error}"))?)
  } else {
    None
  };
  let needle = if case_sensitive {
    query
  } else {
    query.to_lowercase()
  };
  let mut results = Vec::new();

  for file in files {
    if results.len() >= MAX_SEARCH_RESULTS {
      break;
    }
    let path = PathBuf::from(&file.path);
    let Ok((content, _, _)) = decode_text_file(&path) else {
      continue;
    };

    for (index, line) in content.lines().enumerate() {
      let matched = if let Some(matcher) = &matcher {
        matcher.is_match(line)
      } else if case_sensitive {
        line.contains(&needle)
      } else {
        line.to_lowercase().contains(&needle)
      };

      if matched {
        results.push(SearchResult {
          path: file.path.clone(),
          relative_path: file.relative_path.clone(),
          line_number: index + 1,
          line: line.trim().chars().take(240).collect(),
        });
        if results.len() >= MAX_SEARCH_RESULTS {
          break;
        }
      }
    }
  }

  Ok(results)
}

fn read_opened_file(path: &Path, access: &State<FileAccess>) -> Result<Option<OpenedFile>, String> {
  ensure_authorized_for_read(path, access)?;
  let (content, encoding, eol) = decode_text_file(path)?;
  let canonical = canonicalize_existing(path)?;
  let name = canonical
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or("untitled")
    .to_string();
  Ok(Some(OpenedFile {
    path: canonical.to_string_lossy().to_string(),
    name,
    content,
    encoding,
    eol,
    read_only: false,
  }))
}

fn decode_text_file(path: &Path) -> Result<(String, String, String), String> {
  let metadata =
    std::fs::metadata(path).map_err(|error| format!("Failed to inspect {}: {error}", path.display()))?;
  if metadata.len() > MAX_TEXT_FILE_BYTES {
    return Err(format!(
      "{} is too large to open safely in this preview build ({} MB max)",
      path.display(),
      MAX_TEXT_FILE_BYTES / 1024 / 1024
    ));
  }

  let bytes = std::fs::read(path)
    .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
  let (content, encoding) = decode_bytes(&bytes);
  let eol = detect_eol(&content);
  Ok((content, encoding, eol))
}

fn decode_bytes(bytes: &[u8]) -> (String, String) {
  if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
    return (
      String::from_utf8_lossy(&bytes[3..]).to_string(),
      "UTF-8 BOM".to_string(),
    );
  }
  if bytes.starts_with(&[0xFF, 0xFE]) {
    let units: Vec<u16> = bytes[2..]
      .chunks_exact(2)
      .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
      .collect();
    return (
      String::from_utf16_lossy(&units),
      "UTF-16 LE".to_string(),
    );
  }
  if bytes.starts_with(&[0xFE, 0xFF]) {
    let units: Vec<u16> = bytes[2..]
      .chunks_exact(2)
      .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
      .collect();
    return (
      String::from_utf16_lossy(&units),
      "UTF-16 BE".to_string(),
    );
  }
  match String::from_utf8(bytes.to_vec()) {
    Ok(value) => (value, "UTF-8".to_string()),
    Err(_) => (
      bytes.iter().map(|byte| char::from(*byte)).collect(),
      "Latin-1 fallback".to_string(),
    ),
  }
}

fn detect_eol(content: &str) -> String {
  let crlf = content.matches("\r\n").count();
  let without_crlf = content.replace("\r\n", "");
  let lf = without_crlf.matches('\n').count();
  let cr = without_crlf.matches('\r').count();
  match (crlf > 0, lf > 0 || cr > 0) {
    (true, true) => "mixed".to_string(),
    (true, false) => "CRLF".to_string(),
    (false, true) if cr > 0 && lf == 0 => "CR".to_string(),
    (false, true) => "LF".to_string(),
    (false, false) => "LF".to_string(),
  }
}

fn write_text_file_inner(path: &Path, contents: String, encoding: &str) -> Result<(), String> {
  std::fs::write(path, encode_text(&contents, encoding))
    .map_err(|error| format!("Failed to write {}: {error}", path.display()))
}

fn encode_text(contents: &str, encoding: &str) -> Vec<u8> {
  match encoding {
    "UTF-8 BOM" => {
      let mut bytes = vec![0xEF, 0xBB, 0xBF];
      bytes.extend_from_slice(contents.as_bytes());
      bytes
    }
    "UTF-16 LE" => {
      let mut bytes = vec![0xFF, 0xFE];
      for unit in contents.encode_utf16() {
        bytes.extend_from_slice(&unit.to_le_bytes());
      }
      bytes
    }
    "UTF-16 BE" => {
      let mut bytes = vec![0xFE, 0xFF];
      for unit in contents.encode_utf16() {
        bytes.extend_from_slice(&unit.to_be_bytes());
      }
      bytes
    }
    "Latin-1 fallback" => contents
      .chars()
      .map(|character| {
        let value = character as u32;
        if value <= 0xFF { value as u8 } else { b'?' }
      })
      .collect(),
    _ => contents.as_bytes().to_vec(),
  }
}

fn list_project_files_inner(root: &PathBuf) -> Result<Vec<ProjectFile>, String> {
  let mut files = Vec::new();
  collect_project_files(root, root, &mut files, 0)
    .map_err(|error| format!("Failed to list {}: {error}", root.display()))?;
  files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
  Ok(files)
}

fn collect_project_files(
  root: &PathBuf,
  current: &PathBuf,
  files: &mut Vec<ProjectFile>,
  depth: usize,
) -> std::io::Result<()> {
  if files.len() >= MAX_PROJECT_FILES || depth > MAX_PROJECT_DEPTH {
    return Ok(());
  }

  for entry in std::fs::read_dir(current)? {
    if files.len() >= MAX_PROJECT_FILES {
      break;
    }

    let entry = entry?;
    let path = entry.path();
    let name = entry.file_name().to_string_lossy().to_string();
    if should_skip_entry(&name) {
      continue;
    }

    let file_type = entry.file_type()?;
    if file_type.is_symlink() {
      continue;
    }
    let metadata = entry.metadata()?;
    if metadata.is_dir() {
      collect_project_files(root, &path, files, depth + 1)?;
    } else if metadata.is_file() && is_text_like(&path) {
      let relative_path = path
        .strip_prefix(root)
        .unwrap_or(&path)
        .to_string_lossy()
        .to_string();
      files.push(ProjectFile {
        path: path.to_string_lossy().to_string(),
        relative_path,
        size: metadata.len(),
      });
    }
  }

  Ok(())
}

fn should_skip_entry(name: &str) -> bool {
  matches!(
    name.to_ascii_lowercase().as_str(),
    ".cache"
      | ".ds_store"
      | ".git"
      | ".idea"
      | ".mypy_cache"
      | ".next"
      | ".pytest_cache"
      | ".ruff_cache"
      | ".tox"
      | ".venv"
      | ".vscode"
      | "__pycache__"
      | "build"
      | "checkpoint"
      | "checkpoints"
      | "ckpt"
      | "ckpts"
      | "data"
      | "datasets"
      | "dist"
      | "env"
      | "logs"
      | "models"
      | "node_modules"
      | "output"
      | "outputs"
      | "runs"
      | "site-packages"
      | "target"
      | "venv"
      | "wandb"
      | "weights"
  )
}

fn is_text_like(path: &Path) -> bool {
  let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
    return true;
  };

  matches!(
    extension.to_ascii_lowercase().as_str(),
    "aos8"
      | "aoss"
      | "apstra"
      | "arubaap"
      | "arubacx"
      | "bash"
      | "c"
      | "cfg"
      | "cli"
      | "conf"
      | "css"
      | "csv"
      | "go"
      | "h"
      | "html"
      | "iap"
      | "ini"
      | "java"
      | "js"
      | "json"
      | "jsonc"
      | "junos"
      | "juniper"
      | "log"
      | "md"
      | "mist"
      | "py"
      | "rs"
      | "set"
      | "sh"
      | "switchcfg"
      | "toml"
      | "ts"
      | "tsx"
      | "txt"
      | "xml"
      | "yaml"
      | "yml"
      | "zsh"
  )
}

fn saved_file(path: &Path) -> SavedFile {
  SavedFile {
    path: path.to_string_lossy().to_string(),
    name: path
      .file_name()
      .and_then(|value| value.to_str())
      .unwrap_or("untitled")
      .to_string(),
  }
}

fn canonicalize_existing(path: &Path) -> Result<PathBuf, String> {
  path
    .canonicalize()
    .map_err(|error| format!("Failed to access {}: {error}", path.display()))
}

fn canonicalize_for_write(path: &Path) -> Result<PathBuf, String> {
  if path.exists() {
    return canonicalize_existing(path);
  }
  let parent = path
    .parent()
    .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
  let parent = canonicalize_existing(parent)?;
  let file_name = path
    .file_name()
    .ok_or_else(|| format!("{} has no file name", path.display()))?;
  Ok(parent.join(file_name))
}

fn allow_file(access: &State<FileAccess>, path: &Path) -> Result<(), String> {
  let canonical = canonicalize_existing(path)?;
  access
    .files
    .lock()
    .map_err(|_| "File access state is unavailable".to_string())?
    .insert(canonical);
  Ok(())
}

fn allow_file_for_write(access: &State<FileAccess>, path: &Path) -> Result<(), String> {
  let canonical = canonicalize_for_write(path)?;
  access
    .files
    .lock()
    .map_err(|_| "File access state is unavailable".to_string())?
    .insert(canonical);
  Ok(())
}

fn allow_root(access: &State<FileAccess>, root: &Path) -> Result<(), String> {
  let canonical = canonicalize_existing(root)?;
  access
    .roots
    .lock()
    .map_err(|_| "Folder access state is unavailable".to_string())?
    .insert(canonical);
  Ok(())
}

fn ensure_authorized_for_read(path: &Path, access: &State<FileAccess>) -> Result<PathBuf, String> {
  let canonical = canonicalize_existing(path)?;
  if is_allowed_for_read(&canonical, access)? {
    Ok(canonical)
  } else {
    Err(format!(
      "{} is not allowed. Open it with GreenText's file or folder picker first.",
      path.display()
    ))
  }
}

fn ensure_authorized_for_write(path: &Path, access: &State<FileAccess>) -> Result<PathBuf, String> {
  let canonical = canonicalize_for_write(path)?;
  if is_explicitly_allowed_file(&canonical, access)? {
    Ok(canonical)
  } else {
    Err(format!(
      "{} is not allowed. Save it with GreenText's Save As picker first.",
      path.display()
    ))
  }
}

fn ensure_authorized_root(root: &Path, access: &State<FileAccess>) -> Result<PathBuf, String> {
  let canonical = canonicalize_existing(root)?;
  let roots = access
    .roots
    .lock()
    .map_err(|_| "Folder access state is unavailable".to_string())?;
  if roots.contains(&canonical) {
    Ok(canonical)
  } else {
    Err(format!(
      "{} is not allowed. Open it with GreenText's folder picker first.",
      root.display()
    ))
  }
}

fn is_allowed_for_read(path: &Path, access: &State<FileAccess>) -> Result<bool, String> {
  if is_explicitly_allowed_file(path, access)? {
    return Ok(true);
  }

  let roots = access
    .roots
    .lock()
    .map_err(|_| "Folder access state is unavailable".to_string())?;
  Ok(roots.iter().any(|root| {
    path.starts_with(root)
      && path
        .strip_prefix(root)
        .map(|relative| !has_skipped_component(relative))
        .unwrap_or(false)
      && is_text_like(path)
  }))
}

fn is_explicitly_allowed_file(path: &Path, access: &State<FileAccess>) -> Result<bool, String> {
  let files = access
    .files
    .lock()
    .map_err(|_| "File access state is unavailable".to_string())?;
  Ok(files.contains(path))
}

fn has_skipped_component(path: &Path) -> bool {
  path
    .components()
    .any(|component| should_skip_entry(&component.as_os_str().to_string_lossy()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(FileAccess::default())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      list_project_files,
      pick_project_folder,
      pick_text_file,
      read_text_file,
      save_text_file_as,
      search_project_files,
      write_text_file
    ])
    .on_menu_event(|app, event| {
      let _ = app.emit("greentext-menu", event.id().as_ref());
    })
    .setup(|app| {
      setup_menu(app.handle())?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn setup_menu(app: &AppHandle) -> tauri::Result<()> {
  use tauri::menu::{MenuBuilder, SubmenuBuilder};

  let menu = MenuBuilder::new(app)
    .item(
      &SubmenuBuilder::new(app, "File")
        .text("file-new", "New")
        .text("file-open", "Open...")
        .text("file-open-folder", "Open Folder...")
        .separator()
        .text("file-save", "Save")
        .text("file-save-as", "Save As...")
        .text("file-save-all", "Save All")
        .separator()
        .text("file-revert", "Revert")
        .build()?,
    )
    .item(
      &SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .text("edit-find", "Find")
        .text("edit-replace", "Find and Replace")
        .text("edit-pretty-indent", "Pretty Indent")
        .build()?,
    )
    .item(
      &SubmenuBuilder::new(app, "Text")
        .text("text-upper", "Change Case: UPPERCASE")
        .text("text-lower", "Change Case: lowercase")
        .separator()
        .text("text-sort", "Sort Lines")
        .text("text-reverse", "Reverse Lines")
        .text("text-dedupe", "Process Duplicate Lines")
        .separator()
        .text("text-zap", "Zap Gremlins")
        .text("text-trim", "Trim Trailing Whitespace")
        .build()?,
    )
    .item(
      &SubmenuBuilder::new(app, "View")
        .text("view-toggle-sidebar", "Toggle Sidebar")
        .text("view-toggle-tools", "Toggle Tools")
        .separator()
        .text("view-toggle-wrap", "Toggle Word Wrap")
        .text("view-toggle-invisibles", "Show Invisibles")
        .separator()
        .text("theme-neutral", "Editor Theme: Neutral Dark")
        .text("theme-google", "Editor Theme: Google Gray")
        .text("theme-greencli", "Editor Theme: GreenCLI Slate")
        .text("theme-soft", "Editor Theme: Soft Gray")
        .separator()
        .text("view-zoom-in", "Zoom In")
        .text("view-zoom-out", "Zoom Out")
        .text("view-zoom-reset", "Reset Zoom")
        .separator()
        .text("view-edit", "Edit Mode")
        .text("view-split", "Split View")
        .text("view-diff", "Diff Against Saved")
        .separator()
        .text("view-terminal", "SSH Terminal")
        .text("view-vault", "Credential Vault")
        .text("view-mcp", "MCP Servers")
        .separator()
        .text("view-regex", "Pattern Playground (Regex)")
        .text("view-sftp", "SFTP Browser")
        .separator()
        .text("view-help", "Help & Shortcuts")
        .build()?,
    )
    .item(
      &SubmenuBuilder::new(app, "Tools")
        .text("tools-auto-detect", "Auto Detect Language")
        .text("tools-find-project", "Find in Project")
        .text("tools-scan-problems", "Scan Problems")
        .text("tools-template", "New From Template")
        .text("tools-checklist", "Change Checklist")
        .build()?,
    )
    .build()?;

  app.set_menu(menu)?;
  Ok(())
}
