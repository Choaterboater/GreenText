import { useRef, useMemo, useCallback } from 'react';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore } from './store/useEditorStore';
import { useCommands, useTauriMenu, useFiles, useCommandRunner } from './hooks';
import { Topbar, StatusBar, TabStrip, Sidebar, Inspector } from './components/layout';
import { EditorArea } from './components/editor';
import { CommandPalette } from './components/panels';
import { prettyIndentText } from './utils/format';
import { detectLanguage } from './data/languages';
import { TEMPLATE_PACKS, templatesForLanguage, type TemplateDefinition } from './data/templates';
import type { ProjectFileGroup, SearchResult, ProjectFile } from './types';
import { directoryOf } from './utils/helpers';
import { invoke } from '@tauri-apps/api/core';

export default function App() {
  const buffers = useEditorStore(s => s.buffers);
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const updateBuffer = useEditorStore(s => s.updateBuffer);
  const tabSortMode = useEditorStore(s => s.tabSortMode);
  const setStatusMessage = useEditorStore(s => s.setStatusMessage);
  const projectSortMode = useEditorStore(s => s.projectSortMode);
  const projectFiles = useEditorStore(s => s.projectFiles);
  const projectFilter = useEditorStore(s => s.projectFilter);
  const setAutomationDraft = useEditorStore(s => s.setAutomationDraft);
  const setProjectSearchResults = useEditorStore(s => s.setProjectSearchResults);
  const setProjectSearchTitle = useEditorStore(s => s.setProjectSearchTitle);
  const projectRoot = useEditorStore(s => s.projectRoot);
  const selectedTemplateId = useEditorStore(s => s.selectedTemplateId);

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const commandsRef = useRef<any[]>([]);

  const activeBuffer = useMemo(
    () => buffers.find((b) => b.id === activeBufferId) ?? buffers[0],
    [activeBufferId, buffers]
  );

  const {
    createBuffer,
    loadFileIntoBuffer,
    openFile,
    openProjectFolder,
    saveFile,
    saveAllFiles,
    saveAsFile,
    revertActiveBuffer,
    closeBuffer
  } = useFiles(editorRef);

  const togglePinBuffer = useCallback((id: string) => {
    const buffer = buffers.find((b) => b.id === id);
    if (buffer) updateBuffer(id, { pinned: !buffer.pinned });
  }, [buffers, updateBuffer]);

  const prettyIndent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const formatted = prettyIndentText(
      model.getValue(),
      activeBuffer.language,
      useEditorStore.getState().indentSize
    );
    
    editor.executeEdits('pretty-indent', [
      {
        range: model.getFullModelRange(),
        text: formatted,
        forceMoveMarkers: true,
      },
    ]);
    setStatusMessage('Formatted document.');
  }, [activeBuffer.language, setStatusMessage]);

  const findInProject = useCallback(async (
    rawQuery?: string,
    opts?: { regex?: boolean; caseSensitive?: boolean }
  ) => {
    if (projectFiles.length === 0) {
      setStatusMessage('Open a project folder before searching across files.');
      return;
    }

    const query = (rawQuery ?? '').trim();
    if (!query) return;
    const useRegex = opts?.regex ?? false;
    const caseSensitive = opts?.caseSensitive ?? false;

    setProjectSearchTitle(`Searching for "${query}"...`);
    try {
      const results = await invoke<SearchResult[]>('search_project_files', {
        root: projectRoot,
        query,
        regex: useRegex,
        caseSensitive,
      });

      setProjectSearchResults(results);
      setProjectSearchTitle(
        results.length
          ? `${results.length} match${results.length === 1 ? '' : 'es'} for "${query}"`
          : `No matches for "${query}"`
      );
      setStatusMessage(
        results.length
          ? `Found ${results.length} match${results.length === 1 ? '' : 'es'} across ${projectFiles.length} files.`
          : `No matches for "${query}".`
      );
    } catch (e: any) {
      setProjectSearchTitle(`Search failed`);
      setStatusMessage(`Search failed: ${e.message || String(e)}`);
    }
  }, [projectFiles.length, projectRoot, setProjectSearchResults, setProjectSearchTitle, setStatusMessage]);

  const scanActiveProblems = useCallback(async () => {
    setStatusMessage('Scanning for problems is not implemented in this generic version yet.');
  }, [setStatusMessage]);

  const autoDetectActiveLanguage = useCallback(() => {
    const detected = detectLanguage(activeBuffer.name, activeBuffer.content);
    updateBuffer(activeBufferId, { language: detected });
    setStatusMessage(`Language auto-detected as ${detected}`);
  }, [activeBuffer.name, activeBuffer.content, activeBufferId, updateBuffer, setStatusMessage]);

  const runAutomation = useCallback(async (scriptId: string) => {
    setAutomationDraft({
      title: `Automation: ${scriptId}`,
      content: `The ${scriptId} automation is disabled in this generic environment. Integrate with the true MCP host for full access.`,
    });
  }, [setAutomationDraft]);

  const runCommand = useCommandRunner();

  const { commands, filteredCommands } = useCommands(
    editorRef,
    commandsRef,
    createBuffer,
    openFile,
    openProjectFolder,
    saveFile,
    saveAllFiles,
    saveAsFile,
    revertActiveBuffer,
    prettyIndent,
    findInProject,
    scanActiveProblems,
    autoDetectActiveLanguage,
    runAutomation
  );

  const availableTemplates = useMemo(
    () => templatesForLanguage(activeBuffer.language),
    [activeBuffer.language]
  );
  
  const selectedTemplate = useMemo(
    () => availableTemplates.find((t) => t.id === selectedTemplateId) ?? availableTemplates[0] ?? TEMPLATE_PACKS[0],
    [availableTemplates, selectedTemplateId]
  );

  const selectedTemplateRef = useRef<TemplateDefinition>(selectedTemplate);
  selectedTemplateRef.current = selectedTemplate;

  const applyTemplate = useCallback((body: string, template: TemplateDefinition) => {
    const id = createBuffer();
    updateBuffer(id, {
      name: `new-${template.vendor.toLowerCase()}-config.txt`,
      content: body,
      language: template.language,
      dirty: true,
    });
    setStatusMessage(`Started a new file from ${template.name}.`);
  }, [createBuffer, updateBuffer, setStatusMessage]);

  const insertTemplate = useCallback((body: string) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (editor && model) {
      const selection = editor.getSelection() ?? model.getFullModelRange();
      editor.executeEdits('insert-template', [{ range: selection, text: body, forceMoveMarkers: true }]);
      editor.focus();
    } else {
      const state = useEditorStore.getState();
      const current = state.buffers.find((b) => b.id === state.activeBufferId);
      updateBuffer(state.activeBufferId, {
        content: current?.content ? `${current.content}\n${body}` : body,
        dirty: true,
      });
    }
    setStatusMessage('Inserted template into the active document.');
  }, [updateBuffer, setStatusMessage]);

  const newFromTemplate = useCallback((template: TemplateDefinition) => {
    applyTemplate(template.body, template);
  }, [applyTemplate]);

  const newFromTemplateRef = useRef(newFromTemplate);
  newFromTemplateRef.current = newFromTemplate;

  useTauriMenu(commandsRef, newFromTemplateRef, selectedTemplateRef);

  const orderedBuffers = useMemo(() => {
    const sorted = [...buffers];
    if (tabSortMode === 'manual') {
      sorted.sort((left, right) => {
        if (left.pinned && !right.pinned) return -1;
        if (!left.pinned && right.pinned) return 1;
        return 0;
      });
    } else if (tabSortMode === 'name') {
      sorted.sort((left, right) => left.name.localeCompare(right.name));
    } else if (tabSortMode === 'language') {
      sorted.sort((left, right) => left.language.localeCompare(right.language));
    } else if (tabSortMode === 'dirty') {
      sorted.sort((left, right) => {
        if (left.dirty && !right.dirty) return -1;
        if (!left.dirty && right.dirty) return 1;
        return 0;
      });
    } else if (tabSortMode === 'path') {
      sorted.sort((left, right) => (left.filePath ?? left.name).localeCompare(right.filePath ?? right.name));
    }
    return sorted;
  }, [buffers, tabSortMode]);

  const projectFileGroups = useMemo(() => {
    const filter = projectFilter.toLowerCase();
    const filtered = projectFiles.filter((file) => {
      if (!filter) return true;
      return file.relativePath.toLowerCase().includes(filter);
    });

    const sorted = [...filtered].sort((left, right) => {
      if (projectSortMode === 'name') return left.relativePath.split('/').pop()!.localeCompare(right.relativePath.split('/').pop()!);
      if (projectSortMode === 'type') {
        const leftExt = left.relativePath.split('.').pop() ?? '';
        const rightExt = right.relativePath.split('.').pop() ?? '';
        return leftExt.localeCompare(rightExt);
      }
      if (projectSortMode === 'size') return right.size - left.size;
      return left.relativePath.localeCompare(right.relativePath);
    });

    const groups = new Map<string, ProjectFileGroup>();
    for (const file of sorted) {
      const dir = directoryOf(file.relativePath);
      if (!groups.has(dir)) groups.set(dir, { directory: dir, files: [] });
      groups.get(dir)!.files.push(file);
    }
    return Array.from(groups.values()).sort((left, right) => left.directory.localeCompare(right.directory));
  }, [projectFiles, projectFilter, projectSortMode]);

  const openProjectFile = useCallback(async (file: ProjectFile) => {
    try {
      setStatusMessage(`Loading ${file.relativePath}...`);
      const result = await invoke<any>('read_text_file', { path: file.path });
      if (result) loadFileIntoBuffer(result);
      else setStatusMessage(`Failed to read ${file.relativePath}`);
    } catch (e: any) {
      setStatusMessage(`Error loading file: ${e.message || String(e)}`);
    }
  }, [loadFileIntoBuffer, setStatusMessage]);

  const openSearchResult = useCallback(async (result: SearchResult) => {
    await openProjectFile(result as any);
    setTimeout(() => {
      const editor = editorRef.current;
      if (editor) {
        editor.revealLineInCenter(result.lineNumber);
        editor.setPosition({ lineNumber: result.lineNumber, column: 1 });
        editor.focus();
      }
    }, 150);
  }, [openProjectFile]);

  const openAutomationDraft = useCallback(() => {
    const draft = useEditorStore.getState().automationDraft;
    if (!draft) return;
    createBuffer();
    setTimeout(() => {
      const id = useEditorStore.getState().activeBufferId;
      updateBuffer(id, {
        name: `${draft.title}.md`.replace(/[^a-z0-9.-]/gi, '_'),
        content: draft.content,
        language: 'markdown',
        dirty: true,
      });
      setStatusMessage(`Opened draft: ${draft.title}`);
    }, 50);
  }, [createBuffer, updateBuffer, setStatusMessage]);

  const insertAutomationDraft = useCallback(() => {
    const draft = useEditorStore.getState().automationDraft;
    const editor = editorRef.current;
    if (!draft || !editor) return;

    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('insert-draft', [
        { range: selection, text: draft.content, forceMoveMarkers: true },
      ]);
      setStatusMessage(`Inserted draft: ${draft.title}`);
    }
  }, [setStatusMessage]);

  return (
    <main className="flex flex-col w-screen h-screen bg-[#0a0e14] text-[#e6edf3] font-sans">
      <Topbar 
        createBuffer={createBuffer}
        openFile={openFile}
        openProjectFolder={openProjectFolder}
        saveFile={saveFile}
        prettyIndent={prettyIndent}
      />

      <section className="flex flex-1 min-h-0">
        <Sidebar 
          orderedBuffers={orderedBuffers}
          openSearchResult={openSearchResult}
          openProjectFile={openProjectFile}
          projectFileGroups={projectFileGroups}
        />

        <section className="flex flex-col flex-1 min-w-0">
          <TabStrip 
            orderedBuffers={orderedBuffers}
            togglePinBuffer={togglePinBuffer}
            closeBuffer={closeBuffer}
            createBuffer={createBuffer}
          />
          <EditorArea 
            editorRef={editorRef}
            orderedBuffers={orderedBuffers}
          />
          <StatusBar />
        </section>

        <Inspector 
          selectedTemplate={selectedTemplate}
          availableTemplates={availableTemplates}
          applyTemplate={applyTemplate}
          insertTemplate={insertTemplate}
          openSearchResult={openSearchResult}
          runProjectSearch={findInProject}
          runAutomation={runAutomation}
          openAutomationDraft={openAutomationDraft}
          insertAutomationDraft={insertAutomationDraft}
          sortSelectedLines={() => commands.find(c => c.id === 'sort-lines')?.run()}
          removeDuplicateLines={() => commands.find(c => c.id === 'remove-duplicates')?.run()}
          toUpperCase={() => commands.find(c => c.id === 'to-upper')?.run()}
          toLowerCase={() => commands.find(c => c.id === 'to-lower')?.run()}
          zapGremlins={() => commands.find(c => c.id === 'zap-gremlins')?.run()}
          trimTrailingWhitespace={() => commands.find(c => c.id === 'trim')?.run()}
          duplicateLine={() => commands.find(c => c.id === 'duplicate')?.run()}
        />
      </section>

      <CommandPalette 
        filteredCommands={filteredCommands}
        runCommand={runCommand}
      />
    </main>
  );
}
