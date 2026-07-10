import { useCallback, useMemo, useEffect, type MutableRefObject } from 'react';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore } from '../store/useEditorStore';
import type { CommandAction } from '../types';

export function useCommands(
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>,
  commandsRef: MutableRefObject<CommandAction[]>,
  createBuffer: () => void,
  openFile: () => Promise<void>,
  openProjectFolder: () => Promise<void>,
  saveFile: () => Promise<void>,
  saveAllFiles: () => Promise<void>,
  saveAsFile: () => Promise<void>,
  revertActiveBuffer: () => void,
  prettyIndent: () => void,
  findInProject: () => Promise<void>,
  scanActiveProblems: () => Promise<void>,
  autoDetectActiveLanguage: () => void,
  runAutomation: (scriptId: string) => Promise<void>
) {
  const setVisualTheme = useEditorStore(s => s.setVisualTheme);
  const setViewMode = useEditorStore(s => s.setViewMode);
  const setWordWrap = useEditorStore(s => s.setWordWrap);
  const setShowMinimap = useEditorStore(s => s.setShowMinimap);
  const setShowInvisibles = useEditorStore(s => s.setShowInvisibles);
  const setTabSortMode = useEditorStore(s => s.setTabSortMode);
  const setProjectSortMode = useEditorStore(s => s.setProjectSortMode);
  const setSidebarOpen = useEditorStore(s => s.setSidebarOpen);
  const setInspectorOpen = useEditorStore(s => s.setInspectorOpen);
  const setFontSize = useEditorStore(s => s.setFontSize);
  const setStatusMessage = useEditorStore(s => s.setStatusMessage);
  const buffers = useEditorStore(s => s.buffers);
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const updateBuffer = useEditorStore(s => s.updateBuffer);
  const commandQuery = useEditorStore(s => s.commandQuery);

  const activeBuffer = useMemo(
    () => buffers.find((b) => b.id === activeBufferId) ?? buffers[0],
    [activeBufferId, buffers]
  );

  const convertEol = useCallback((newEol: 'LF' | 'CRLF') => {
    updateBuffer(activeBufferId, { eol: newEol });
    setStatusMessage(`Line endings converted to ${newEol}`);
  }, [activeBufferId, updateBuffer, setStatusMessage]);

  const zoomIn = useCallback(() => setFontSize((value) => Math.min(value + 1, 30)), [setFontSize]);
  const zoomOut = useCallback(() => setFontSize((value) => Math.max(value - 1, 8)), [setFontSize]);
  const resetZoom = useCallback(() => setFontSize(13), [setFontSize]);

  const duplicateLine = useCallback(async () => {
    const action = editorRef.current?.getAction('editor.action.copyLinesDownAction');
    await action?.run();
    setStatusMessage('Duplicated the current line/selection.');
  }, [editorRef, setStatusMessage]);

  const removeDuplicateLines = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    const lines = model.getValueInRange(range).split(/\r\n|\r|\n/);
    const unique = [...new Set(lines)].join('\n');

    editor.executeEdits('remove-duplicates', [{ range, text: unique, forceMoveMarkers: true }]);
    setStatusMessage('Removed duplicate lines.');
  }, [editorRef, setStatusMessage]);

  const reverseLines = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    const reversed = model.getValueInRange(range).split(/\r\n|\r|\n/).reverse().join('\n');

    editor.executeEdits('reverse-lines', [{ range, text: reversed, forceMoveMarkers: true }]);
    setStatusMessage('Reversed lines.');
  }, [editorRef, setStatusMessage]);

  const toUpperCase = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    const upper = model.getValueInRange(range).toUpperCase();

    editor.executeEdits('to-upper', [{ range, text: upper, forceMoveMarkers: true }]);
    setStatusMessage('Converted to uppercase.');
  }, [editorRef, setStatusMessage]);

  const toLowerCase = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    const lower = model.getValueInRange(range).toLowerCase();

    editor.executeEdits('to-lower', [{ range, text: lower, forceMoveMarkers: true }]);
    setStatusMessage('Converted to lowercase.');
  }, [editorRef, setStatusMessage]);

  const zapGremlins = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const selection = editor.getSelection();
    const range = selection && !selection.isEmpty() ? selection : model.getFullModelRange();
    // eslint-disable-next-line no-control-regex
    const zapped = model.getValueInRange(range).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

    editor.executeEdits('zap-gremlins', [{ range, text: zapped, forceMoveMarkers: true }]);
    setStatusMessage('Zapped gremlins (removed non-ASCII characters).');
  }, [editorRef, setStatusMessage]);

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
  }, [editorRef, setStatusMessage]);

  const trimTrailingWhitespace = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const text = (model?.getValue() ?? activeBuffer.content).replace(/[ \t]+$/gm, '');

    if (editor && model) {
      editor.executeEdits('trim-trailing-whitespace', [
        { range: model.getFullModelRange(), text, forceMoveMarkers: true },
      ]);
    } else {
      updateBuffer(activeBufferId, { content: text });
    }
    setStatusMessage('Trimmed trailing whitespace.');
  }, [activeBuffer, activeBufferId, editorRef, setStatusMessage, updateBuffer]);

  const insertTimestamp = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const position = editor.getPosition();
    if (!position) return;

    const text = new Date().toISOString();
    editor.executeEdits('insert-timestamp', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text,
        forceMoveMarkers: true,
      },
    ]);
    setStatusMessage('Inserted ISO timestamp.');
  }, [editorRef, setStatusMessage]);

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
      { id: 'remove-duplicates', title: 'Process Duplicate Lines', run: removeDuplicateLines },
      { id: 'reverse-lines', title: 'Reverse lines', run: reverseLines },
      { id: 'to-upper', title: 'Change Case: UPPERCASE', run: toUpperCase },
      { id: 'to-lower', title: 'Change Case: lowercase', run: toLowerCase },
      { id: 'zap-gremlins', title: 'Zap Gremlins (Remove non-ASCII)', run: zapGremlins },
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
      { id: 'toggle-invisibles', title: 'Show Invisibles', run: () => setShowInvisibles((value) => !value) },
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
      { id: 'terminal-mode', title: 'Open SSH Terminal', shortcut: 'Cmd/Ctrl+T', run: () => setViewMode('terminal') },
      { id: 'vault-mode', title: 'Open Credential Vault', run: () => setViewMode('vault') },
      { id: 'mcp-mode', title: 'Open MCP Servers', run: () => setViewMode('mcp') },
      { id: 'regex-mode', title: 'Open Pattern Playground (Regex)', run: () => setViewMode('regex') },
      { id: 'sftp-mode', title: 'Open SFTP Browser', run: () => setViewMode('sftp') },
      { id: 'help-mode', title: 'Open Help & Documentation', run: () => setViewMode('help') },
      { id: 'explain', title: 'Automation: explain selection', run: () => runAutomation('explain') },
      { id: 'review', title: 'Automation: review config risks', run: () => runAutomation('review') },
      { id: 'variables', title: 'Automation: list template variables', run: () => runAutomation('variables') },
      { id: 'checklist', title: 'Automation: build change checklist', run: () => runAutomation('checklist') },
    ],
    [
      autoDetectActiveLanguage,
      convertEol,
      createBuffer,
      duplicateLine,
      findInProject,
      insertTimestamp,
      openFile,
      openProjectFolder,
      prettyIndent,
      removeDuplicateLines,
      resetZoom,
      revertActiveBuffer,
      reverseLines,
      runAutomation,
      saveAllFiles,
      saveAsFile,
      saveFile,
      scanActiveProblems,
      setInspectorOpen,
      setProjectSortMode,
      setSidebarOpen,
      setTabSortMode,
      setViewMode,
      setVisualTheme,
      setWordWrap,
      setShowMinimap,
      setShowInvisibles,
      sortSelectedLines,
      toLowerCase,
      toUpperCase,
      trimTrailingWhitespace,
      zapGremlins,
      zoomIn,
      zoomOut,
      editorRef,
    ],
  );

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands, commandsRef]);

  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commands;
    return commands.filter((c) => c.title.toLowerCase().includes(query));
  }, [commands, commandQuery]);

  return { commands, filteredCommands };
}
