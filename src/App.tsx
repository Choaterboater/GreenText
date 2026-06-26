import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { DiffEditor, type BeforeMount, type OnMount } from '@monaco-editor/react';
import * as monacoRuntime from 'monaco-editor';
import type * as monacoEditor from 'monaco-editor';
import {
  Braces,
  Code2,
  FileCode2,
  FilePlus2,
  FolderOpen,
  PanelLeft,
  Save,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { GREEN_TEXT_LANGUAGES, detectLanguage, languageLabel } from './data/languages';
import type { GreenTextLanguageId } from './data/languages';
import { TEMPLATE_PACKS, templatesForLanguage } from './data/templates';
import type { TemplateDefinition } from './data/templates';
import { setupMonaco } from './editor/monacoSetup';
import { prettyIndentText } from './utils/format';

interface EditorBuffer {
  id: string;
  name: string;
  content: string;
  savedContent: string;
  language: GreenTextLanguageId;
  filePath: string | null;
  encoding: string;
  eol: string;
  readOnly: boolean;
  pinned: boolean;
  dirty: boolean;
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Recovery and recents are best-effort; editing must never crash because storage is full.
  }
}

interface OpenedFile {
  path: string;
  name: string;
  content: string;
  encoding: string;
  eol: string;
  readOnly: boolean;
}

function disposeUnusedMonacoModels(openBuffers: EditorBuffer[]): void {
  const keep = new Set(
    openBuffers.flatMap((buffer) => {
      const path = buffer.filePath ?? buffer.name;
      return [path, `${path}.preview`];
    }),
  );

  for (const model of monacoRuntime.editor.getModels()) {
    const uri = model.uri.toString();
    const path = model.uri.path.replace(/^\//, '');
    const keepModel = Array.from(keep).some((candidate) => (
      uri === candidate ||
      path === candidate ||
      uri.endsWith(candidate) ||
      path.endsWith(candidate)
    ));
    if (!keepModel) model.dispose();
  }
}

interface ProjectFileGroup {
  directory: string;
  files: ProjectFile[];
}

interface SavedFile {
  path: string;
  name: string;
}

interface ProjectFolder {
  root: string;
  files: ProjectFile[];
}

interface ProjectFile {
  path: string;
  relativePath: string;
  size: number;
}

interface SearchResult {
  path: string;
  relativePath: string;
  lineNumber: number;
  line: string;
}

interface AutomationDraft {
  title: string;
  content: string;
  count?: number;
}

interface CommandAction {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

type ViewMode = 'edit' | 'split' | 'diff' | 'compare';
type VisualTheme = 'neutral' | 'google' | 'greencli' | 'soft';
type TabSortMode = 'manual' | 'name' | 'language' | 'dirty' | 'path';
type ProjectSortMode = 'path' | 'name' | 'type' | 'size';

interface OutlineEntry {
  label: string;
  detail: string;
  lineNumber: number;
}

const RECENT_FILES_KEY = 'greentext.recentFiles';
const RECOVERY_KEY = 'greentext.recoveryBuffers';
const MAX_RECOVERY_CHARS = 120_000;

const welcomeConfig = `! Welcome to GreenText
! Language-aware editing, auto-indent, shortcuts, and network templates are ready.

hostname {{hostname}}
!
vlan 10
name USERS
!
interface 1/1/1
description User access port
no shutdown
vlan access 10
spanning-tree port-type admin-edge
!
show running-config
`;

function id(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function newBuffer(name: string, content = '', language: GreenTextLanguageId = 'plaintext'): EditorBuffer {
  return {
    id: id(),
    name,
    content,
    savedContent: content,
    language,
    filePath: null,
    encoding: 'UTF-8',
    eol: 'LF',
    readOnly: false,
    pinned: false,
    dirty: false,
  };
}

function bufferFromOpenedFile(file: OpenedFile): EditorBuffer {
  return {
    id: id(),
    name: file.name,
    content: file.content,
    savedContent: file.content,
    language: detectLanguage(file.name, file.content),
    filePath: file.path,
    encoding: file.encoding,
    eol: file.eol,
    readOnly: file.readOnly,
    pinned: false,
    dirty: false,
  };
}

function welcomeBuffer(): EditorBuffer {
  return newBuffer('welcome.arubacx', welcomeConfig, 'aruba-cx');
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

function basename(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() || path;
}

function dirname(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/[^/]*$/, '') || path;
}

function extensionOf(path: string): string {
  return path.match(/\.([^.\\/]+)$/)?.[1]?.toLowerCase() ?? '';
}

function directoryOf(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '.';
}

function sortBuffersForDisplay(buffers: EditorBuffer[], sortMode: TabSortMode): EditorBuffer[] {
  const pinnedFirst = (left: EditorBuffer, right: EditorBuffer) => Number(right.pinned) - Number(left.pinned);
  const sorted = [...buffers];
  if (sortMode === 'manual') return sorted.sort(pinnedFirst);
  return sorted.sort((left, right) => {
    const pinned = pinnedFirst(left, right);
    if (pinned !== 0) return pinned;
    if (sortMode === 'language') return languageLabel(left.language).localeCompare(languageLabel(right.language)) || left.name.localeCompare(right.name);
    if (sortMode === 'dirty') return Number(right.dirty) - Number(left.dirty) || left.name.localeCompare(right.name);
    if (sortMode === 'path') return (left.filePath ?? left.name).localeCompare(right.filePath ?? right.name);
    return left.name.localeCompare(right.name, undefined, { numeric: true });
  });
}

function sortProjectFilesForDisplay(files: ProjectFile[], sortMode: ProjectSortMode): ProjectFile[] {
  return [...files].sort((left, right) => {
    if (sortMode === 'name') return basename(left.relativePath).localeCompare(basename(right.relativePath), undefined, { numeric: true });
    if (sortMode === 'type') return extensionOf(left.relativePath).localeCompare(extensionOf(right.relativePath)) || left.relativePath.localeCompare(right.relativePath);
    if (sortMode === 'size') return right.size - left.size || left.relativePath.localeCompare(right.relativePath);
    return left.relativePath.localeCompare(right.relativePath, undefined, { numeric: true });
  });
}

function groupProjectFilesForDisplay(files: ProjectFile[]): ProjectFileGroup[] {
  const groups = new Map<string, ProjectFile[]>();
  for (const file of files) {
    const directory = directoryOf(file.relativePath);
    groups.set(directory, [...(groups.get(directory) ?? []), file]);
  }
  return Array.from(groups, ([directory, groupFiles]) => ({ directory, files: groupFiles }));
}

function loadRecentFiles(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(RECENT_FILES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function loadRecoveredBuffers(): EditorBuffer[] {
  if (typeof localStorage === 'undefined') return [welcomeBuffer()];
  const raw = localStorage.getItem(RECOVERY_KEY);
  if (!raw) return [welcomeBuffer()];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcomeBuffer()];
    return parsed
      .filter((buffer) => typeof buffer?.name === 'string' && typeof buffer?.content === 'string')
      .slice(0, 24)
      .map((buffer) => ({
        id: id(),
        name: buffer.name,
        content: buffer.content,
        savedContent: typeof buffer.savedContent === 'string' ? buffer.savedContent : buffer.content,
        language: detectLanguage(buffer.name, buffer.content),
        filePath: null,
        encoding: typeof buffer.encoding === 'string' ? buffer.encoding : 'UTF-8',
        eol: typeof buffer.eol === 'string' ? buffer.eol : 'LF',
        readOnly: Boolean(buffer.readOnly),
        pinned: Boolean(buffer.pinned),
        dirty: Boolean(buffer.dirty),
      }));
  } catch {
    return [welcomeBuffer()];
  }
}

function browserOpenFile(): Promise<{ name: string; content: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, content: String(reader.result ?? '') });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function browserSaveFile(buffer: EditorBuffer): void {
  const blob = new Blob([contentForSave(buffer)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buffer.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function contentForSave(buffer: Pick<EditorBuffer, 'content' | 'eol'>): string {
  if (buffer.eol === 'mixed') return buffer.content;
  const normalized = buffer.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (buffer.eol === 'CRLF') return normalized.replace(/\n/g, '\r\n');
  if (buffer.eol === 'CR') return normalized.replace(/\n/g, '\r');
  return normalized;
}

function countLines(text: string): number {
  if (!text) return 1;
  return text.split(/\r\n|\r|\n/).length;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function uniqueTemplateVariables(template: TemplateDefinition): string[] {
  return Array.from(new Set([...template.variables, ...scanVariables(template.body)])).sort();
}

function renderTemplateWithPromptedVariables(template: TemplateDefinition): string | null {
  let output = template.body;
  for (const variable of uniqueTemplateVariables(template)) {
    const value = window.prompt(`Value for {{${variable}}}`, variable.replaceAll('_', ' '));
    if (value === null) return null;
    output = output.replaceAll(`{{${variable}}}`, value);
  }
  return output;
}

function scanVariables(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g), (match) => match[1]))).sort();
}

function firstMatches(text: string, pattern: RegExp, limit = 10): string[] {
  return Array.from(new Set(Array.from(text.matchAll(pattern), (match) => match[0]))).slice(0, limit);
}

function automationDraftFor(
  action: 'explain' | 'review' | 'variables' | 'checklist',
  text: string,
  language: GreenTextLanguageId,
  bufferName: string,
): AutomationDraft {
  const source = text.trim() || 'No selected text; use the active buffer or select config first.';
  const lines = source.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  const variables = scanVariables(source);
  const interfaces = firstMatches(source, /\b(?:interface\s+)?(?:\d+(?:\/\d+){1,3}|(?:ge|xe|et|irb|lo|ae)-?\d+(?:\/\d+){0,3}(?:\.\d+)?)\b/gi);
  const vlans = firstMatches(source, /\bvlan(?:-id)?\s+\d+\b|\bvlan\s+members\s+[\w.-]+/gi);
  const risks = [
    /\bpassword\b/i.test(source) ? 'Contains password-related lines; verify secrets are not stored in plain text.' : '',
    /\bsnmp\s+community\s+(?:public|private)\b/i.test(source) ? 'Uses public/private SNMP community names.' : '',
    /\btelnet\b/i.test(source) ? 'Mentions Telnet; prefer SSH where possible.' : '',
    /\bhttp\s+server\b|\bweb-management\s+plaintext\b/i.test(source) ? 'Mentions plaintext HTTP management.' : '',
    /\bno\s+shutdown\b/i.test(source) ? 'Enables one or more interfaces; confirm maintenance window and cabling.' : '',
  ].filter(Boolean);

  if (action === 'variables') {
    return {
      title: `Variables for ${bufferName}`,
      content: `# Template variables: ${bufferName}

- Language: ${languageLabel(language)}
- Variables found: ${variables.length || 0}

${variables.length > 0 ? variables.map((variable) => `- {{${variable}}}`).join('\n') : '- No {{variables}} found.'}
`,
    };
  }

  if (action === 'review') {
    return {
      title: `Config review for ${bufferName}`,
      content: `# GreenText config review: ${bufferName}

- Language: ${languageLabel(language)}
- Lines reviewed: ${lines.length}
- Interfaces spotted: ${interfaces.length ? interfaces.join(', ') : 'none'}
- VLAN references: ${vlans.length ? vlans.join(', ') : 'none'}

## Risk checks

${risks.length > 0 ? risks.map((risk) => `- ${risk}`).join('\n') : '- No obvious local-pattern risks found.'}

## Suggested next checks

- Confirm management access, rollback path, and change window.
- Pretty Indent the file before comparing or committing changes.
- Use Diff mode to review changes against the last saved copy.
`,
    };
  }

  if (action === 'checklist') {
    return {
      title: `Change checklist for ${bufferName}`,
      content: `# Change checklist: ${bufferName}

1. Save a backup of the current running configuration.
2. Pretty Indent the candidate config in GreenText.
3. Review variables/placeholders: ${variables.length ? variables.map((variable) => `{{${variable}}}`).join(', ') : 'none found'}.
4. Validate interface references: ${interfaces.length ? interfaces.join(', ') : 'none spotted'}.
5. Validate VLAN references: ${vlans.length ? vlans.join(', ') : 'none spotted'}.
6. Apply in a maintenance window.
7. Verify services and capture post-change evidence.
8. Keep rollback commands ready.
`,
    };
  }

  return {
    title: `Explanation for ${bufferName}`,
    content: `# Explain selection: ${bufferName}

- Language: ${languageLabel(language)}
- Non-empty lines: ${lines.length}
- Interfaces spotted: ${interfaces.length ? interfaces.join(', ') : 'none'}
- VLAN references: ${vlans.length ? vlans.join(', ') : 'none'}
- Template variables: ${variables.length ? variables.map((variable) => `{{${variable}}}`).join(', ') : 'none'}

## Plain-English summary

This snippet appears to be ${languageLabel(language)} configuration text. It references ${
      interfaces.length ? `${interfaces.length} interface-related item(s)` : 'no obvious interface blocks'
    } and ${vlans.length ? `${vlans.length} VLAN-related item(s)` : 'no obvious VLAN lines'}. Use the review action for local risk checks and Diff mode before saving/applying.
`,
  };
}

function buildOutline(text: string, language: GreenTextLanguageId): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;
    const arubaMatch = trimmed.match(/^(interface|vlan|vrf|router|wlan|aaa-profile|user-role|ssid-profile)\s+(.+)$/i);
    const junosMatch = trimmed.match(/^set\s+(interfaces|vlans|protocols|routing-options|policy-options|system|snmp)\s+(.+)$/i);
    if (arubaMatch) {
      entries.push({
        label: `${arubaMatch[1]} ${arubaMatch[2]}`.slice(0, 80),
        detail: languageLabel(language),
        lineNumber,
      });
    } else if (junosMatch) {
      entries.push({
        label: `${junosMatch[1]} ${junosMatch[2]}`.slice(0, 80),
        detail: 'Junos set',
        lineNumber,
      });
    }
  });
  return entries.slice(0, 120);
}

function scanProblems(text: string, language: GreenTextLanguageId, bufferName: string): AutomationDraft {
  const rows: string[] = [];
  const variables = scanVariables(text);
  const lines = text.split(/\r\n|\r|\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/\b(todo|fixme|hack)\b/i.test(line)) rows.push(`- Line ${lineNumber}: TODO/FIXME marker: \`${line.trim()}\``);
    if (/\bpassword\b/i.test(line)) rows.push(`- Line ${lineNumber}: password-related text: \`${line.trim()}\``);
    if (/\bsnmp\s+community\s+(public|private)\b/i.test(line)) rows.push(`- Line ${lineNumber}: default SNMP community: \`${line.trim()}\``);
    if (/\btelnet\b/i.test(line)) rows.push(`- Line ${lineNumber}: Telnet mention: \`${line.trim()}\``);
    if (language.startsWith('aruba') && /^interface\s+\S+/i.test(line.trim())) {
      const nextLines = lines.slice(index + 1, index + 5).join('\n');
      if (!/\bdescription\b/i.test(nextLines)) rows.push(`- Line ${lineNumber}: interface block may be missing a description.`);
    }
  });

  return {
    title: `Problems for ${bufferName}`,
    count: rows.length,
    content: `# Problems and checks: ${bufferName}

- Language: ${languageLabel(language)}
- Template variables: ${variables.length ? variables.map((variable) => `{{${variable}}}`).join(', ') : 'none'}

## Findings

${rows.length ? rows.join('\n') : '- No local checks found problems.'}
`,
  };
}

function App() {
  const [buffers, setBuffers] = useState<EditorBuffer[]>(() => loadRecoveredBuffers());
  const [activeBufferId, setActiveBufferId] = useState(buffers[0].id);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_PACKS[0].id);
  const [autoFormat, setAutoFormat] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('GreenText is ready.');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [visualTheme, setVisualTheme] = useState<VisualTheme>('neutral');
  const [compareBufferId, setCompareBufferId] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [indentSize, setIndentSize] = useState(2);
  const [fontSize, setFontSize] = useState(13);
  const [tabSortMode, setTabSortMode] = useState<TabSortMode>('manual');
  const [projectSortMode, setProjectSortMode] = useState<ProjectSortMode>('path');
  const [groupProjectFiles, setGroupProjectFiles] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [recentFiles, setRecentFiles] = useState<string[]>(() => loadRecentFiles());
  const [automationDraft, setAutomationDraft] = useState<AutomationDraft | null>(null);
  const [projectSearchResults, setProjectSearchResults] = useState<SearchResult[]>([]);
  const [projectSearchTitle, setProjectSearchTitle] = useState('Project search');
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const commandsRef = useRef<CommandAction[]>([]);
  const selectedTemplateRef = useRef<TemplateDefinition>(TEMPLATE_PACKS[0]);
  const newFromTemplateRef = useRef<(template: TemplateDefinition) => void>(() => undefined);

  const activeBuffer = useMemo(
    () => buffers.find((buffer) => buffer.id === activeBufferId) ?? buffers[0],
    [activeBufferId, buffers],
  );

  const availableTemplates = useMemo(
    () => templatesForLanguage(activeBuffer.language),
    [activeBuffer.language],
  );

  const selectedTemplate = useMemo(
    () =>
      availableTemplates.find((template) => template.id === selectedTemplateId) ??
      availableTemplates[0] ??
      TEMPLATE_PACKS[0],
    [availableTemplates, selectedTemplateId],
  );

  const filteredProjectFiles = useMemo(() => {
    const query = projectFilter.trim().toLowerCase();
    const filtered = query
      ? projectFiles.filter((file) => file.relativePath.toLowerCase().includes(query))
      : projectFiles;
    return sortProjectFilesForDisplay(filtered, projectSortMode);
  }, [projectFiles, projectFilter, projectSortMode]);

  const projectFileGroups = useMemo(
    () => groupProjectFilesForDisplay(filteredProjectFiles),
    [filteredProjectFiles],
  );

  const orderedBuffers = useMemo(
    () => sortBuffersForDisplay(buffers, tabSortMode),
    [buffers, tabSortMode],
  );

  const outline = useMemo(
    () => buildOutline(activeBuffer.content, activeBuffer.language),
    [activeBuffer.content, activeBuffer.language],
  );

  const updateRecentFiles = useCallback((path: string) => {
    setRecentFiles((current) => {
      const next = [path, ...current.filter((item) => item !== path)].slice(0, 12);
      safeSetLocalStorage(RECENT_FILES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateActiveBuffer = useCallback((updates: Partial<EditorBuffer>) => {
    setBuffers((current) =>
      current.map((buffer) =>
        buffer.id === activeBufferId
          ? {
              ...buffer,
              ...updates,
            }
          : buffer,
      ),
    );
  }, [activeBufferId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      let used = 0;
      const recoverable = [];
      for (const buffer of buffers) {
        if (!buffer.dirty && buffer.filePath) continue;
        if (buffer.content.length > MAX_RECOVERY_CHARS) continue;
        if (used + buffer.content.length > MAX_RECOVERY_CHARS) break;
        used += buffer.content.length;
        recoverable.push({
          name: buffer.name,
          content: buffer.content,
          savedContent: '',
          filePath: null,
          encoding: buffer.encoding,
          eol: buffer.eol,
          readOnly: buffer.readOnly,
          pinned: buffer.pinned,
          dirty: buffer.dirty,
        });
      }
      safeSetLocalStorage(RECOVERY_KEY, JSON.stringify(recoverable));
    }, 1000);

    return () => window.clearTimeout(handle);
  }, [buffers]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!buffers.some((buffer) => buffer.dirty)) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [buffers]);

  useEffect(() => {
    if (viewMode === 'diff' || viewMode === 'compare') {
      editorRef.current = null;
    }
  }, [viewMode]);

  const createBuffer = useCallback(() => {
    const next = newBuffer(`untitled-${buffers.length + 1}.txt`);
    setBuffers((current) => [...current, next]);
    setActiveBufferId(next.id);
    setViewMode('edit');
    setStatusMessage('Created a new text buffer.');
  }, [buffers.length]);

  const createMarkdownBuffer = useCallback((name: string, content: string) => {
    const next = newBuffer(name, content, 'markdown');
    setBuffers((current) => [...current, next]);
    setActiveBufferId(next.id);
    setViewMode('edit');
    setStatusMessage(`Created ${name}.`);
  }, []);

  const closeBuffer = useCallback((bufferId: string) => {
    setBuffers((current) => {
      if (current.length === 1) return current;
      const closing = current.find((buffer) => buffer.id === bufferId);
      if (closing?.dirty && !window.confirm(`${closing.name} has unsaved changes. Close it anyway?`)) {
        return current;
      }
      const index = current.findIndex((buffer) => buffer.id === bufferId);
      const nextBuffers = current.filter((buffer) => buffer.id !== bufferId);
      window.setTimeout(() => disposeUnusedMonacoModels(nextBuffers), 0);
      if (bufferId === activeBufferId) {
        const nextActive = nextBuffers[Math.max(0, index - 1)] ?? nextBuffers[0];
        setActiveBufferId(nextActive.id);
      }
      return nextBuffers;
    });
  }, [activeBufferId]);

  const openPath = useCallback(async (path: string) => {
    const existing = buffers.find((buffer) => buffer.filePath === path);
    if (existing) {
      setActiveBufferId(existing.id);
      setStatusMessage(`Focused ${existing.name}.`);
      return;
    }

    try {
      const file = await invoke<OpenedFile | null>('read_text_file', { path });
      if (!file) return;
      const buffer = bufferFromOpenedFile(file);
      setBuffers((current) => [...current, buffer]);
      setActiveBufferId(buffer.id);
      setViewMode('edit');
      updateRecentFiles(path);
      setStatusMessage(`Opened ${buffer.name} (${buffer.encoding}, ${buffer.eol}).`);
    } catch (error) {
      setStatusMessage(errorMessage(error));
    }
  }, [buffers, updateRecentFiles]);

  const openFile = useCallback(async () => {
    try {
      if (isTauriRuntime()) {
        const file = await invoke<OpenedFile | null>('pick_text_file');
        if (!file) return;
        const buffer = bufferFromOpenedFile(file);
        setBuffers((current) => [...current, buffer]);
        setActiveBufferId(buffer.id);
        setViewMode('edit');
        updateRecentFiles(buffer.filePath ?? file.path);
        setStatusMessage(`Opened ${buffer.name} (${buffer.encoding}, ${buffer.eol}).`);
        return;
      }

      const file = await browserOpenFile();
      if (!file) return;
      const buffer = newBuffer(file.name, file.content, detectLanguage(file.name, file.content));
      setBuffers((current) => [...current, buffer]);
      setActiveBufferId(buffer.id);
      setViewMode('edit');
      setStatusMessage(`Opened ${file.name}.`);
    } catch (error) {
      setStatusMessage(`Open failed: ${errorMessage(error)}`);
    }
  }, [updateRecentFiles]);

  const openProjectFolder = useCallback(async () => {
    if (!isTauriRuntime()) {
      setStatusMessage('Folder browsing is available in the desktop app.');
      return;
    }

    try {
      const folder = await invoke<ProjectFolder | null>('pick_project_folder');
      if (!folder) return;
      setProjectRoot(folder.root);
      setProjectFiles(folder.files);
      setProjectFilter('');
      setSidebarOpen(true);
      setStatusMessage(`Loaded ${folder.files.length} project files from ${basename(folder.root)}.`);
    } catch (error) {
      setStatusMessage(errorMessage(error));
    }
  }, []);

  const applySavedSnapshot = useCallback((
    bufferId: string,
    saved: SavedFile,
    snapshot: string,
    encoding: string,
  ) => {
    setBuffers((current) =>
      current.map((buffer) => {
        if (buffer.id !== bufferId) return buffer;
        const unchangedSinceSaveStarted = buffer.content === snapshot;
        return {
          ...buffer,
          name: saved.name,
          filePath: saved.path,
          savedContent: snapshot,
          encoding,
          dirty: unchangedSinceSaveStarted ? false : true,
        };
      }),
    );
  }, []);

  const saveFile = useCallback(async () => {
    const snapshot = activeBuffer.content;
    const saveEncoding = activeBuffer.encoding || 'UTF-8';
    try {
      if (isTauriRuntime()) {
      const targetPath =
        activeBuffer.filePath;
      if (!targetPath) {
        const saved = await invoke<SavedFile | null>('save_text_file_as', {
          defaultName: activeBuffer.name,
          contents: contentForSave(activeBuffer),
          encoding: saveEncoding,
        });
        if (!saved) return;
        applySavedSnapshot(activeBuffer.id, saved, snapshot, saveEncoding);
        updateRecentFiles(saved.path);
        setStatusMessage(`Saved ${saved.name}.`);
        return;
      }

      const saved = await invoke<SavedFile>('write_text_file', {
        path: targetPath,
        contents: contentForSave(activeBuffer),
        encoding: saveEncoding,
      });
      applySavedSnapshot(activeBuffer.id, saved, snapshot, saveEncoding);
      updateRecentFiles(saved.path);
      setStatusMessage(`Saved ${saved.name}.`);
      return;
    }

    browserSaveFile(activeBuffer);
    applySavedSnapshot(activeBuffer.id, { path: activeBuffer.filePath ?? activeBuffer.name, name: activeBuffer.name }, snapshot, saveEncoding);
    setStatusMessage(`Downloaded ${activeBuffer.name}.`);
    } catch (error) {
      setStatusMessage(`Save failed: ${errorMessage(error)}`);
    }
  }, [activeBuffer, applySavedSnapshot, updateRecentFiles]);

  const saveAsFile = useCallback(async () => {
    const snapshot = activeBuffer.content;
    const saveEncoding = activeBuffer.encoding || 'UTF-8';
    try {
      if (!isTauriRuntime()) {
      browserSaveFile(activeBuffer);
      applySavedSnapshot(activeBuffer.id, { path: activeBuffer.filePath ?? activeBuffer.name, name: activeBuffer.name }, snapshot, saveEncoding);
      setStatusMessage(`Downloaded ${activeBuffer.name}.`);
      return;
    }

    const saved = await invoke<SavedFile | null>('save_text_file_as', {
      defaultName: activeBuffer.name,
      contents: contentForSave(activeBuffer),
      encoding: saveEncoding,
    });
    if (!saved) return;

    applySavedSnapshot(activeBuffer.id, saved, snapshot, saveEncoding);
    updateRecentFiles(saved.path);
    setStatusMessage(`Saved ${saved.name}.`);
    } catch (error) {
      setStatusMessage(`Save As failed: ${errorMessage(error)}`);
    }
  }, [activeBuffer, applySavedSnapshot, updateRecentFiles]);

  const saveAllFiles = useCallback(async () => {
    const dirtyBuffers = buffers.filter((buffer) => buffer.dirty);
    if (dirtyBuffers.length === 0) {
      setStatusMessage('Nothing to save.');
      return;
    }

    const updates = new Map<string, { saved: SavedFile; snapshot: string; encoding: string }>();
    let savedCount = 0;
    let failureCount = 0;

    for (const buffer of dirtyBuffers) {
      const snapshot = buffer.content;
      const saveEncoding = buffer.encoding || 'UTF-8';
      if (!isTauriRuntime()) {
        browserSaveFile(buffer);
        updates.set(buffer.id, {
          saved: { path: buffer.filePath ?? buffer.name, name: buffer.name },
          snapshot,
          encoding: saveEncoding,
        });
        savedCount += 1;
        continue;
      }

      try {
        const saved = buffer.filePath
          ? await invoke<SavedFile>('write_text_file', {
              path: buffer.filePath,
              contents: contentForSave(buffer),
              encoding: saveEncoding,
            })
          : await (async () => {
              return invoke<SavedFile | null>('save_text_file_as', {
                defaultName: buffer.name,
                contents: contentForSave(buffer),
                encoding: saveEncoding,
              });
            })();
        if (!saved) continue;

        updates.set(buffer.id, { saved, snapshot, encoding: saveEncoding });
        updateRecentFiles(saved.path);
        savedCount += 1;
      } catch {
        failureCount += 1;
      }
    }

    if (updates.size > 0) {
      setBuffers((current) =>
        current.map((buffer) => {
          const update = updates.get(buffer.id);
          if (!update) return buffer;
          const unchangedSinceSaveStarted = buffer.content === update.snapshot;
          return {
            ...buffer,
            name: update.saved.name,
            filePath: update.saved.path,
            savedContent: update.snapshot,
            encoding: update.encoding,
            dirty: unchangedSinceSaveStarted ? false : true,
          };
        }),
      );
    }
    setStatusMessage(`Saved ${savedCount} buffer${savedCount === 1 ? '' : 's'}${failureCount ? `; ${failureCount} failed` : ''}.`);
  }, [buffers, updateRecentFiles]);

  const revertActiveBuffer = useCallback(() => {
    if (!activeBuffer.dirty) {
      setStatusMessage(`${activeBuffer.name} has no unsaved changes.`);
      return;
    }
    if (!window.confirm(`Revert ${activeBuffer.name} to its last saved state?`)) return;
    updateActiveBuffer({
      content: activeBuffer.savedContent,
      dirty: false,
    });
    setStatusMessage(`Reverted ${activeBuffer.name}.`);
  }, [activeBuffer, updateActiveBuffer]);

  const prettyIndent = useCallback(async () => {
    const editor = editorRef.current;
    const formatAction = editor?.getAction('editor.action.formatDocument');
    if (formatAction) {
      await formatAction.run();
      setStatusMessage(`Pretty indented ${activeBuffer.name}.`);
      return;
    }

    updateActiveBuffer({
      content: prettyIndentText(activeBuffer.content, activeBuffer.language, indentSize),
      dirty: true,
    });
    setStatusMessage(`Pretty indented ${activeBuffer.name}.`);
  }, [activeBuffer, indentSize, updateActiveBuffer]);

  const insertTemplate = useCallback((template: TemplateDefinition) => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    if (editor && selection) {
      editor.executeEdits('insert-template', [
        {
          range: selection,
          text: template.body,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
      setStatusMessage(`Inserted ${template.name}.`);
      return;
    }

    updateActiveBuffer({
      content: `${activeBuffer.content}${activeBuffer.content.endsWith('\n') ? '' : '\n'}${template.body}`,
      dirty: true,
    });
    setStatusMessage(`Inserted ${template.name}.`);
  }, [activeBuffer.content, updateActiveBuffer]);

  const insertFilledTemplate = useCallback((template: TemplateDefinition) => {
    const rendered = renderTemplateWithPromptedVariables(template);
    if (rendered === null) return;
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    if (editor && selection) {
      editor.executeEdits('insert-filled-template', [
        {
          range: selection,
          text: rendered,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
    } else {
      updateActiveBuffer({
        content: `${activeBuffer.content}${activeBuffer.content.endsWith('\n') ? '' : '\n'}${rendered}`,
        dirty: true,
      });
    }
    setStatusMessage(`Filled and inserted ${template.name}.`);
  }, [activeBuffer.content, updateActiveBuffer]);

  const newFromTemplate = useCallback((template: TemplateDefinition) => {
    const rendered = renderTemplateWithPromptedVariables(template);
    if (rendered === null) return;
    const safeName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const next = newBuffer(`${safeName || template.id}.cfg`, rendered, template.language);
    next.dirty = true;
    setBuffers((current) => [...current, next]);
    setActiveBufferId(next.id);
    setViewMode('edit');
    setStatusMessage(`Created ${template.name} from template.`);
  }, []);

  useEffect(() => {
    newFromTemplateRef.current = newFromTemplate;
  }, [newFromTemplate]);

  const selectedOrBufferText = useCallback(() => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const model = editor?.getModel();
    if (selection && model && !selection.isEmpty()) {
      return model.getValueInRange(selection);
    }
    return activeBuffer.content;
  }, [activeBuffer.content]);

  const runAutomation = useCallback((action: 'explain' | 'review' | 'variables' | 'checklist') => {
    const draft = automationDraftFor(action, selectedOrBufferText(), activeBuffer.language, activeBuffer.name);
    setAutomationDraft(draft);
    setInspectorOpen(true);
    setStatusMessage(`Generated ${draft.title}.`);
  }, [activeBuffer.language, activeBuffer.name, selectedOrBufferText]);

  const scanActiveProblems = useCallback(() => {
    const draft = scanProblems(activeBuffer.content, activeBuffer.language, activeBuffer.name);
    setAutomationDraft(draft.count ? draft : null);
    setStatusMessage(
      draft.count
        ? `Scan complete: ${draft.count} issue${draft.count === 1 ? '' : 's'} found. Open Tools to inspect.`
        : `Scan complete: no problems found in ${activeBuffer.name}.`,
    );
  }, [activeBuffer.content, activeBuffer.language, activeBuffer.name]);

  const autoDetectActiveLanguage = useCallback(() => {
    const detected = detectLanguage(activeBuffer.name, activeBuffer.content);
    updateActiveBuffer({ language: detected });
    setStatusMessage(`Auto detected ${languageLabel(detected)}.`);
  }, [activeBuffer.content, activeBuffer.name, updateActiveBuffer]);

  const findInProject = useCallback(async () => {
    if (projectFiles.length === 0) {
      setStatusMessage('Open a project folder before using Find in Project.');
      return;
    }

    const query = window.prompt('Find in project');
    if (!query?.trim()) return;
    const useRegex = window.confirm('Use regex search? OK = regex, Cancel = literal');
    const caseSensitive = window.confirm('Case-sensitive search? OK = yes, Cancel = no');
    const results = await invoke<SearchResult[]>('search_project_files', {
      root: projectRoot,
      query: query.trim(),
      regex: useRegex,
      caseSensitive,
    });
    const matches = results
      .slice(0, 120)
      .map((result) => `- ${result.relativePath}:${result.lineNumber}: \`${result.line}\``);
    setProjectSearchResults(results);
    setProjectSearchTitle(`Project search: ${query}`);

    setAutomationDraft({
      title: `Project search: ${query}`,
      content: `# Project search: ${query}

- Root: ${projectRoot ?? 'unknown'}
- Files scanned: ${projectFiles.length}
- Matches shown: ${matches.length}

${matches.length ? matches.join('\n') : '- No matches found.'}
`,
    });
    setInspectorOpen(true);
    setStatusMessage(`Found ${matches.length} project matches for "${query}".`);
  }, [projectFiles, projectRoot]);

  const convertEol = useCallback((eol: string) => {
    const converted = contentForSave({ content: activeBuffer.content, eol });
    updateActiveBuffer({
      content: converted,
      eol,
      dirty: converted !== activeBuffer.savedContent,
    });
    setStatusMessage(`Converted ${activeBuffer.name} to ${eol} line endings.`);
  }, [activeBuffer.content, activeBuffer.name, activeBuffer.savedContent, updateActiveBuffer]);

  const zoomIn = useCallback(() => {
    setFontSize((size) => Math.min(28, size + 1));
    setStatusMessage('Zoomed in.');
  }, []);

  const zoomOut = useCallback(() => {
    setFontSize((size) => Math.max(10, size - 1));
    setStatusMessage('Zoomed out.');
  }, []);

  const resetZoom = useCallback(() => {
    setFontSize(13);
    setStatusMessage('Reset editor zoom.');
  }, []);

  const togglePinBuffer = useCallback((bufferId: string) => {
    setBuffers((current) =>
      current.map((buffer) =>
        buffer.id === bufferId ? { ...buffer, pinned: !buffer.pinned } : buffer,
      ),
    );
  }, []);

  const openAutomationDraft = useCallback(() => {
    if (!automationDraft) return;
    const safeName = automationDraft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    createMarkdownBuffer(`${safeName || 'automation-draft'}.md`, automationDraft.content);
  }, [automationDraft, createMarkdownBuffer]);

  const insertAutomationDraft = useCallback(() => {
    if (!automationDraft) return;
    const editor = editorRef.current;
    const text = `\n\n${automationDraft.content}`;
    if (editor) {
      const selection = editor.getSelection() ?? editor.getModel()?.getFullModelRange();
      if (selection) {
        editor.executeEdits('insert-automation-draft', [{ range: selection, text, forceMoveMarkers: true }]);
        editor.focus();
      }
    } else {
      updateActiveBuffer({ content: `${activeBuffer.content}${text}`, dirty: true });
    }
    setStatusMessage(`Inserted ${automationDraft.title}.`);
  }, [activeBuffer.content, automationDraft, updateActiveBuffer]);

  const duplicateLine = useCallback(async () => {
    const action = editorRef.current?.getAction('editor.action.copyLinesDownAction');
    await action?.run();
    setStatusMessage('Duplicated the current line/selection.');
  }, []);

  const sortSelectedLines = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    const sorted = model
      .getValueInRange(range)
      .split(/\r\n|\r|\n/)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .join('\n');

    editor.executeEdits('sort-lines', [{ range, text: sorted, forceMoveMarkers: true }]);
    setStatusMessage('Sorted selected lines.');
  }, []);

  const trimTrailingWhitespace = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const text = (model?.getValue() ?? activeBuffer.content).replace(/[ \t]+$/gm, '');

    if (editor && model) {
      editor.executeEdits('trim-trailing-whitespace', [
        { range: model.getFullModelRange(), text, forceMoveMarkers: true },
      ]);
    } else {
      updateActiveBuffer({ content: text, dirty: text !== activeBuffer.savedContent });
    }
    setStatusMessage('Trimmed trailing whitespace.');
  }, [activeBuffer.content, activeBuffer.savedContent, updateActiveBuffer]);

  const insertTimestamp = useCallback(() => {
    const editor = editorRef.current;
    const text = new Date().toISOString();
    const selection = editor?.getSelection();
    if (editor && selection) {
      editor.executeEdits('insert-timestamp', [{ range: selection, text, forceMoveMarkers: true }]);
      editor.focus();
      setStatusMessage('Inserted timestamp.');
    }
  }, []);

  const goToLine = useCallback((lineNumber: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(lineNumber);
    editor.setPosition({ lineNumber, column: 1 });
    editor.focus();
  }, []);

  const openSearchResult = useCallback(async (result: SearchResult) => {
    await openPath(result.path);
    window.setTimeout(() => goToLine(result.lineNumber), 150);
  }, [goToLine, openPath]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    setupMonaco(monaco);
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    const updateCursor = () => {
      const position = editor.getPosition();
      if (position) setCursorPosition({ lineNumber: position.lineNumber, column: position.column });
    };
    updateCursor();
    editor.onDidChangeCursorPosition(updateCursor);
  };

  const commands = useMemo<CommandAction[]>(
    () => [
      { id: 'new', title: 'New buffer', shortcut: 'Cmd/Ctrl+N', run: createBuffer },
      { id: 'open-file', title: 'Open file', shortcut: 'Cmd/Ctrl+O', run: openFile },
      { id: 'open-folder', title: 'Open project folder', shortcut: 'Cmd/Ctrl+Shift+O', run: openProjectFolder },
      { id: 'save', title: 'Save file', shortcut: 'Cmd/Ctrl+S', run: saveFile },
      { id: 'save-all', title: 'Save all dirty buffers', shortcut: 'Cmd/Ctrl+Alt+S', run: saveAllFiles },
      { id: 'save-as', title: 'Save as', shortcut: 'Cmd/Ctrl+Shift+S', run: saveAsFile },
      { id: 'revert', title: 'Revert active file to saved copy', run: revertActiveBuffer },
      { id: 'pretty-indent', title: 'Pretty Indent document', shortcut: 'Cmd/Ctrl+Alt+Shift+F', run: prettyIndent },
      { id: 'find', title: 'Find', shortcut: 'Cmd/Ctrl+F', run: () => editorRef.current?.getAction('actions.find')?.run() },
      {
        id: 'replace',
        title: 'Find and replace',
        shortcut: 'Cmd/Ctrl+Alt+F',
        run: () => editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run(),
      },
      { id: 'duplicate', title: 'Duplicate line/selection', shortcut: 'Cmd/Ctrl+Shift+D', run: duplicateLine },
      { id: 'sort-lines', title: 'Sort selected lines', run: sortSelectedLines },
      { id: 'trim', title: 'Trim trailing whitespace', run: trimTrailingWhitespace },
      { id: 'timestamp', title: 'Insert ISO timestamp', run: insertTimestamp },
      { id: 'zoom-in', title: 'Zoom in editor', shortcut: 'Cmd/Ctrl+=', run: zoomIn },
      { id: 'zoom-out', title: 'Zoom out editor', shortcut: 'Cmd/Ctrl+-', run: zoomOut },
      { id: 'zoom-reset', title: 'Reset editor zoom', shortcut: 'Cmd/Ctrl+0', run: resetZoom },
      { id: 'find-project', title: 'Find in project', shortcut: 'Cmd/Ctrl+Shift+F', run: findInProject },
      { id: 'scan-problems', title: 'Scan active file for problems', run: scanActiveProblems },
      { id: 'auto-detect', title: 'Auto detect language/colors', run: autoDetectActiveLanguage },
      { id: 'theme-neutral', title: 'Editor theme: Neutral Dark', run: () => setVisualTheme('neutral') },
      { id: 'theme-google', title: 'Editor theme: Google Gray', run: () => setVisualTheme('google') },
      { id: 'theme-greencli', title: 'Editor theme: GreenCLI Slate', run: () => setVisualTheme('greencli') },
      { id: 'theme-soft', title: 'Editor theme: Soft Gray', run: () => setVisualTheme('soft') },
      { id: 'compare-mode', title: 'Compare active buffer with another open buffer', run: () => setViewMode('compare') },
      { id: 'eol-lf', title: 'Convert line endings to LF', run: () => convertEol('LF') },
      { id: 'eol-crlf', title: 'Convert line endings to CRLF', run: () => convertEol('CRLF') },
      { id: 'toggle-wrap', title: 'Toggle word wrap', run: () => setWordWrap((value) => !value) },
      { id: 'toggle-minimap', title: 'Toggle minimap', run: () => setShowMinimap((value) => !value) },
      { id: 'tabs-manual', title: 'Tabs: manual order with pinned first', run: () => setTabSortMode('manual') },
      { id: 'tabs-name', title: 'Tabs: sort by name', run: () => setTabSortMode('name') },
      { id: 'tabs-language', title: 'Tabs: group by language', run: () => setTabSortMode('language') },
      { id: 'files-path', title: 'Files: sort by path', run: () => setProjectSortMode('path') },
      { id: 'files-type', title: 'Files: group by extension/type', run: () => setProjectSortMode('type') },
      { id: 'toggle-sidebar', title: 'Toggle left sidebar', shortcut: 'Cmd/Ctrl+B', run: () => setSidebarOpen((value) => !value) },
      { id: 'toggle-inspector', title: 'Toggle automation inspector', run: () => setInspectorOpen((value) => !value) },
      { id: 'edit-mode', title: 'Editor mode: edit', run: () => setViewMode('edit') },
      { id: 'split-mode', title: 'Editor mode: split', shortcut: 'Cmd/Ctrl+\\', run: () => setViewMode('split') },
      { id: 'diff-mode', title: 'Editor mode: diff against saved', shortcut: 'Cmd/Ctrl+Shift+G', run: () => setViewMode('diff') },
      { id: 'explain', title: 'Automation: explain selection', run: () => runAutomation('explain') },
      { id: 'review', title: 'Automation: review config risks', run: () => runAutomation('review') },
      { id: 'variables', title: 'Automation: list template variables', run: () => runAutomation('variables') },
      { id: 'checklist', title: 'Automation: build change checklist', run: () => runAutomation('checklist') },
    ],
    [
      createBuffer,
      duplicateLine,
      insertTimestamp,
      findInProject,
      convertEol,
      autoDetectActiveLanguage,
      resetZoom,
      zoomIn,
      zoomOut,
      openFile,
      openProjectFolder,
      prettyIndent,
      revertActiveBuffer,
      runAutomation,
      scanActiveProblems,
      saveAllFiles,
      saveAsFile,
      saveFile,
      sortSelectedLines,
      trimTrailingWhitespace,
    ],
  );

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    selectedTemplateRef.current = selectedTemplate;
  }, [selectedTemplate]);

  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commands;
    return commands.filter((command) => command.title.toLowerCase().includes(query));
  }, [commandQuery, commands]);

  const runCommand = useCallback((command: CommandAction) => {
    setCommandPaletteOpen(false);
    setCommandQuery('');
    void command.run();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<string>('greentext-menu', (event) => {
      const id = event.payload;
      const command = commandsRef.current.find((item) => {
        const aliases: Record<string, string> = {
          'file-new': 'new',
          'file-open': 'open-file',
          'file-open-folder': 'open-folder',
          'file-save': 'save',
          'file-save-as': 'save-as',
          'file-save-all': 'save-all',
          'file-revert': 'revert',
          'edit-find': 'find',
          'edit-replace': 'replace',
          'edit-pretty-indent': 'pretty-indent',
          'view-toggle-sidebar': 'toggle-sidebar',
          'view-toggle-tools': 'toggle-inspector',
          'view-zoom-in': 'zoom-in',
          'view-zoom-out': 'zoom-out',
          'view-zoom-reset': 'zoom-reset',
          'view-edit': 'edit-mode',
          'view-split': 'split-mode',
          'view-diff': 'diff-mode',
          'tools-find-project': 'find-project',
          'tools-scan-problems': 'scan-problems',
          'tools-auto-detect': 'auto-detect',
          'tools-checklist': 'checklist',
          'theme-neutral': 'theme-neutral',
          'theme-google': 'theme-google',
          'theme-greencli': 'theme-greencli',
          'theme-soft': 'theme-soft',
        };
        return item.id === (aliases[id] ?? id);
      });
      if (id === 'tools-template') {
        newFromTemplateRef.current(selectedTemplateRef.current);
        return;
      }
      if (command) void command.run();
    }).then((dispose) => {
      if (disposed) {
        dispose();
      } else {
        unlisten = dispose;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const commandKey = event.metaKey || event.ctrlKey;
      if (!commandKey) return;

      if (event.key.toLowerCase() === 'p' || (event.shiftKey && event.key.toLowerCase() === 'p')) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomOut();
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        resetZoom();
        return;
      }
      if (event.key.toLowerCase() === 's' && event.shiftKey) {
        event.preventDefault();
        void saveAsFile();
        return;
      }
      if (event.key.toLowerCase() === 's' && event.altKey) {
        event.preventDefault();
        void saveAllFiles();
        return;
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveFile();
        return;
      }
      if (event.key.toLowerCase() === 'o' && event.shiftKey) {
        event.preventDefault();
        void openProjectFolder();
        return;
      }
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void openFile();
        return;
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createBuffer();
        return;
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarOpen((value) => !value);
        return;
      }
      if (event.key.toLowerCase() === 'f' && event.shiftKey && event.altKey) {
        event.preventDefault();
        void prettyIndent();
        return;
      }
      if (event.key.toLowerCase() === 'f' && event.altKey) {
        event.preventDefault();
        void editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
        return;
      }
      if (event.key.toLowerCase() === 'f' && event.shiftKey) {
        event.preventDefault();
        void findInProject();
        return;
      }
      if (event.key === '\\') {
        event.preventDefault();
        setViewMode((mode) => (mode === 'split' ? 'edit' : 'split'));
        return;
      }
      if (event.key.toLowerCase() === 'g' && event.shiftKey) {
        event.preventDefault();
        setViewMode((mode) => (mode === 'diff' ? 'edit' : 'diff'));
        return;
      }
      if (event.key.toLowerCase() === 'd' && event.shiftKey) {
        event.preventDefault();
        void duplicateLine();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createBuffer, duplicateLine, findInProject, openFile, openProjectFolder, prettyIndent, resetZoom, saveAllFiles, saveAsFile, saveFile, zoomIn, zoomOut]);

  const languageOptions = GREEN_TEXT_LANGUAGES.map((language) => (
    <option key={language.id} value={language.id}>
      {language.group === 'Network' ? 'Network - ' : 'General - '}
      {language.label}
    </option>
  ));

  const editorOptions: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    autoIndent: autoFormat ? 'full' : 'advanced',
    bracketPairColorization: { enabled: true },
    cursorBlinking: 'smooth',
    detectIndentation: true,
    fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Consolas, monospace',
    fontLigatures: true,
    fontSize,
    formatOnPaste: autoFormat,
    formatOnType: autoFormat,
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    lineNumbersMinChars: 4,
    minimap: { enabled: showMinimap },
    padding: { top: 14, bottom: 14 },
    renderWhitespace: 'selection',
    readOnly: activeBuffer.readOnly,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: indentSize,
    wordWrap: wordWrap ? 'on' : 'off',
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button" type="button" onClick={() => setSidebarOpen((value) => !value)}>
          <PanelLeft size={17} />
        </button>
        <div className="brand">
          <span className="brand-mark">GT</span>
          <div>
            <h1>GreenText</h1>
            <p>Editor</p>
          </div>
        </div>
        <div className="toolbar">
          <button type="button" onClick={createBuffer}>
            <FilePlus2 size={16} />
            <span className="sr-only">New</span>
          </button>
          <button type="button" onClick={openFile}>
            <FolderOpen size={16} />
            <span className="sr-only">Open</span>
          </button>
          <button type="button" onClick={openProjectFolder}>
            <FolderOpen size={16} />
            <span className="sr-only">Open folder</span>
          </button>
          <button type="button" onClick={saveFile}>
            <Save size={16} />
            <span className="sr-only">Save</span>
          </button>
          <button className="primary" type="button" onClick={prettyIndent}>
            <Wand2 size={16} />
            <span>Format</span>
          </button>
          <button type="button" onClick={() => setInspectorOpen((value) => !value)}>
            <Sparkles size={16} />
            <span className="sr-only">Tools</span>
          </button>
          <button type="button" onClick={() => setCommandPaletteOpen(true)}>
            <Sparkles size={16} />
            <span className="sr-only">Commands</span>
          </button>
        </div>
      </header>

      <section className="workspace">
        {sidebarOpen ? (
          <aside className="sidebar">
            <section className="panel">
              <div className="panel-heading">
                <FileCode2 size={16} />
                <span>Open buffers</span>
              </div>
              <div className="mini-controls">
                <select value={tabSortMode} onChange={(event) => setTabSortMode(event.target.value as TabSortMode)}>
                  <option value="manual">Pinned + manual</option>
                  <option value="name">Name</option>
                  <option value="language">Language</option>
                  <option value="dirty">Dirty first</option>
                  <option value="path">Path</option>
                </select>
              </div>
              <div className="buffer-list">
                {orderedBuffers.map((buffer) => (
                  <button
                    className={`buffer-item ${buffer.id === activeBuffer.id ? 'active' : ''}`}
                    key={buffer.id}
                    type="button"
                    onClick={() => setActiveBufferId(buffer.id)}
                  >
                    <span className="buffer-row">
                      <span className={buffer.pinned ? 'pin-chip pinned' : 'pin-chip'}>{buffer.pinned ? 'Pinned' : 'Tab'}</span>
                      <span className="vendor-chip">{languageLabel(buffer.language)}</span>
                      <span>{buffer.dirty ? '* ' : ''}{buffer.name}</span>
                    </span>
                    <small>{buffer.filePath ? dirname(buffer.filePath) : 'unsaved buffer'}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel project-panel">
              <div className="panel-heading">
                <FolderOpen size={16} />
                <span>Project files</span>
              </div>
              <button className="full-width" type="button" onClick={openProjectFolder}>Open folder</button>
              {projectRoot ? <small className="muted-text">{dirname(projectRoot)}/{basename(projectRoot)}</small> : null}
              <div className="mini-controls">
                <select value={projectSortMode} onChange={(event) => setProjectSortMode(event.target.value as ProjectSortMode)}>
                  <option value="path">Path</option>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="size">Size</option>
                </select>
                <label>
                  <input checked={groupProjectFiles} type="checkbox" onChange={(event) => setGroupProjectFiles(event.target.checked)} />
                  Group
                </label>
              </div>
              <input
                className="text-input"
                placeholder="Filter files..."
                type="search"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              />
              <div className="file-list">
                {groupProjectFiles ? projectFileGroups.slice(0, 80).map((group) => (
                  <div className="file-group" key={group.directory}>
                    <strong>{group.directory}</strong>
                    {group.files.slice(0, 80).map((file) => (
                      <button key={file.path} type="button" onClick={() => openPath(file.path)}>
                        <span>{basename(file.relativePath)}</span>
                        <small>{extensionOf(file.relativePath) || 'text'} - {Math.max(1, Math.round(file.size / 1024))} KB</small>
                      </button>
                    ))}
                  </div>
                )) : filteredProjectFiles.slice(0, 160).map((file) => (
                  <button key={file.path} type="button" onClick={() => openPath(file.path)}>
                    <span>{file.relativePath}</span>
                    <small>{extensionOf(file.relativePath) || 'text'} - {Math.max(1, Math.round(file.size / 1024))} KB</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <Search size={16} />
                <span>Recent files</span>
              </div>
              <div className="file-list compact">
                {recentFiles.length > 0 ? recentFiles.map((path) => (
                  <button key={path} type="button" onClick={() => openPath(path)}>
                    <span>{basename(path)}</span>
                    <small>{dirname(path)}</small>
                  </button>
                )) : <small className="muted-text">No recent files yet.</small>}
              </div>
            </section>
          </aside>
        ) : null}

        <section className="editor-area">
          <div className="tab-strip">
            {orderedBuffers.map((buffer) => (
              <button
                className={`tab ${buffer.id === activeBuffer.id ? 'active' : ''}`}
                key={buffer.id}
                type="button"
                onClick={() => setActiveBufferId(buffer.id)}
              >
                <span
                  className={buffer.pinned ? 'tab-pin pinned' : 'tab-pin'}
                  role="button"
                  tabIndex={0}
                  title={buffer.pinned ? 'Unpin tab' : 'Pin tab'}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePinBuffer(buffer.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') togglePinBuffer(buffer.id);
                  }}
                >
                  {buffer.pinned ? '★' : '☆'}
                </span>
                <span>{buffer.name}{buffer.dirty ? ' *' : ''}</span>
                {buffers.length > 1 ? (
                  <span
                    className="close"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      closeBuffer(buffer.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') closeBuffer(buffer.id);
                    }}
                  >
                    x
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="editor-controls">
            <label>
              <Code2 size={16} />
              <select
                value={activeBuffer.language}
                onChange={(event) =>
                  updateActiveBuffer({
                    language: event.target.value as GreenTextLanguageId,
                    dirty: true,
                  })
                }
              >
                {languageOptions}
              </select>
            </label>
            <button type="button" onClick={autoDetectActiveLanguage}>
              Detect
            </button>
            <select value={visualTheme} onChange={(event) => setVisualTheme(event.target.value as VisualTheme)}>
              <option value="neutral">Editor: Neutral</option>
              <option value="google">Editor: Google</option>
              <option value="greencli">Editor: GreenCLI</option>
              <option value="soft">Editor: Soft</option>
            </select>
            <label>
              <select value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <div className="zoom-controls">
              <button type="button" onClick={zoomOut}>-</button>
              <span>{Math.round((fontSize / 13) * 100)}%</span>
              <button type="button" onClick={zoomIn}>+</button>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoFormat}
                onChange={(event) => setAutoFormat(event.target.checked)}
              />
              Auto
            </label>
            <button type="button" onClick={() => editorRef.current?.getAction('actions.find')?.run()}>
              <Search size={16} />
              <span className="sr-only">Find</span>
            </button>
            <button type="button" onClick={() => editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run()}>
              <Braces size={16} />
              <span className="sr-only">Replace</span>
            </button>
            <button className={viewMode === 'edit' ? 'active-pill' : ''} type="button" onClick={() => setViewMode('edit')}>
              Edit
            </button>
            <button className={viewMode === 'split' ? 'active-pill' : ''} type="button" onClick={() => setViewMode('split')}>
              Split
            </button>
            <button className={viewMode === 'diff' ? 'active-pill' : ''} type="button" onClick={() => setViewMode('diff')}>
              Diff
            </button>
            <button className={viewMode === 'compare' ? 'active-pill' : ''} type="button" onClick={() => setViewMode('compare')}>
              Compare
            </button>
            {viewMode === 'compare' ? (
              <select value={compareBufferId ?? ''} onChange={(event) => setCompareBufferId(event.target.value)}>
                <option value="">Choose compare buffer...</option>
                {buffers.filter((buffer) => buffer.id !== activeBuffer.id).map((buffer) => (
                  <option key={buffer.id} value={buffer.id}>{buffer.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div className={`editor-frame mode-${viewMode}`}>
            {viewMode === 'diff' || viewMode === 'compare' ? (
              <DiffEditor
                beforeMount={handleBeforeMount}
                height="100%"
                language={activeBuffer.language}
                modified={activeBuffer.content}
                original={
                  viewMode === 'compare'
                    ? buffers.find((buffer) => buffer.id === compareBufferId)?.content ?? ''
                    : activeBuffer.savedContent
                }
                options={{
                  automaticLayout: true,
                  fontSize,
                  minimap: { enabled: false },
                  renderSideBySide: true,
                  readOnly: true,
                  wordWrap: wordWrap ? 'on' : 'off',
                }}
                theme={`greentext-${visualTheme}`}
              />
            ) : (
              <div className={viewMode === 'split' ? 'split-editors' : 'single-editor'}>
                <Editor
                  beforeMount={handleBeforeMount}
                  height="100%"
                  language={activeBuffer.language}
                  onMount={handleMount}
                  onChange={(value) =>
                    updateActiveBuffer({
                      content: value ?? '',
                      dirty: (value ?? '') !== activeBuffer.savedContent,
                    })
                  }
                  options={editorOptions}
                  path={activeBuffer.filePath ?? activeBuffer.name}
                  theme={`greentext-${visualTheme}`}
                  value={activeBuffer.content}
                />
                {viewMode === 'split' ? (
                  <Editor
                    beforeMount={handleBeforeMount}
                    height="100%"
                    language={activeBuffer.language}
                    options={{ ...editorOptions, readOnly: true, minimap: { enabled: false } }}
                    path={`${activeBuffer.filePath ?? activeBuffer.name}.preview`}
                    theme={`greentext-${visualTheme}`}
                    value={activeBuffer.content}
                  />
                ) : null}
              </div>
            )}
          </div>

          <footer className="statusbar">
            <span>{statusMessage}</span>
            <span className="vendor-chip">{languageLabel(activeBuffer.language)}</span>
            <span>{viewMode}</span>
            <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
            <span>{activeBuffer.encoding}</span>
            <span>{activeBuffer.eol}</span>
            <span>{Math.round((fontSize / 13) * 100)}%</span>
            <span>{countLines(activeBuffer.content)} lines</span>
            <span>{activeBuffer.content.length.toLocaleString()} chars</span>
            <span>{autoFormat ? 'auto-indent on' : 'auto-indent off'}</span>
          </footer>
        </section>

        {inspectorOpen ? (
          <aside className="inspector">
            <section className="panel template-panel">
              <div className="panel-heading">
                <Sparkles size={16} />
                <span>Network templates</span>
              </div>
              <select
                value={selectedTemplate.id}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.vendor} {template.platform} - {template.name}
                  </option>
                ))}
              </select>
              <div className="template-card">
                <strong>{selectedTemplate.name}</strong>
                <p>{selectedTemplate.description}</p>
                <div className="tag-row">
                  {selectedTemplate.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="variables">
                  <small>Variables</small>
                  <code>{selectedTemplate.variables.join(', ')}</code>
                </div>
                <button className="primary full-width" type="button" onClick={() => insertTemplate(selectedTemplate)}>
                  Insert raw template
                </button>
                <button className="full-width" type="button" onClick={() => insertFilledTemplate(selectedTemplate)}>
                  Fill variables + insert
                </button>
                <button className="full-width" type="button" onClick={() => newFromTemplate(selectedTemplate)}>
                  New file from template
                </button>
              </div>
            </section>

            <section className="panel outline-panel">
              <div className="panel-heading">
                <FileCode2 size={16} />
                <span>Outline</span>
              </div>
              <div className="outline-list">
                {outline.length > 0 ? outline.map((entry) => (
                  <button key={`${entry.lineNumber}-${entry.label}`} type="button" onClick={() => goToLine(entry.lineNumber)}>
                    <span>{entry.label}</span>
                    <small>{entry.detail} - line {entry.lineNumber}</small>
                  </button>
                )) : <small className="muted-text">No interfaces, VLANs, WLANs, or Junos set blocks found.</small>}
              </div>
            </section>

            <section className="panel search-results-panel">
              <div className="panel-heading">
                <Search size={16} />
                <span>{projectSearchTitle}</span>
              </div>
              <div className="outline-list">
                {projectSearchResults.length > 0 ? projectSearchResults.slice(0, 80).map((result) => (
                  <button key={`${result.path}-${result.lineNumber}-${result.line}`} type="button" onClick={() => openSearchResult(result)}>
                    <span>{result.relativePath}:{result.lineNumber}</span>
                    <small>{result.line}</small>
                  </button>
                )) : <small className="muted-text">Run Find project to populate clickable matches.</small>}
              </div>
            </section>

            <section className="panel automation-panel">
              <div className="panel-heading">
                <Wand2 size={16} />
                <span>Automation</span>
              </div>
              <div className="automation-grid">
                <button type="button" onClick={() => runAutomation('explain')}>Explain</button>
                <button type="button" onClick={() => runAutomation('review')}>Review risks</button>
                <button type="button" onClick={() => runAutomation('variables')}>Variables</button>
                <button type="button" onClick={() => runAutomation('checklist')}>Checklist</button>
                <button type="button" onClick={sortSelectedLines}>Sort lines</button>
                <button type="button" onClick={trimTrailingWhitespace}>Trim spaces</button>
                <button type="button" onClick={duplicateLine}>Duplicate</button>
                <button type="button" onClick={insertTimestamp}>Timestamp</button>
                <button type="button" onClick={revertActiveBuffer}>Revert</button>
                <button type="button" onClick={saveAllFiles}>Save all</button>
                <button type="button" onClick={scanActiveProblems}>Problems</button>
                <button type="button" onClick={findInProject}>Find project</button>
                <button type="button" onClick={() => convertEol('LF')}>LF</button>
                <button type="button" onClick={() => convertEol('CRLF')}>CRLF</button>
              </div>
              <div className="setting-row">
                <label>
                  <input checked={wordWrap} type="checkbox" onChange={(event) => setWordWrap(event.target.checked)} />
                  Word wrap
                </label>
                <label>
                  <input checked={showMinimap} type="checkbox" onChange={(event) => setShowMinimap(event.target.checked)} />
                  Minimap
                </label>
              </div>
              {automationDraft ? (
                <div className="draft-card">
                  <strong>{automationDraft.title}</strong>
                  <pre>{automationDraft.content}</pre>
                  <div className="button-row">
                    <button type="button" onClick={openAutomationDraft}>Open as note</button>
                    <button type="button" onClick={insertAutomationDraft}>Insert</button>
                  </div>
                </div>
              ) : (
                <p className="muted-text">Select text, then run an automation. Drafts preview here before you insert or open them.</p>
              )}
            </section>
          </aside>
        ) : null}
      </section>

      {commandPaletteOpen ? (
        <div className="command-overlay" role="dialog" aria-modal="true">
          <div className="command-palette">
            <input
              autoFocus
              placeholder="Run command..."
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setCommandPaletteOpen(false);
                if (event.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0]);
              }}
            />
            <div className="command-list">
              {filteredCommands.map((command) => (
                <button key={command.id} type="button" onClick={() => runCommand(command)}>
                  <span>{command.title}</span>
                  {command.shortcut ? <small>{command.shortcut}</small> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
