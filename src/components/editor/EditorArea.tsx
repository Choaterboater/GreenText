import { useMemo, useCallback } from 'react';
import Editor, { DiffEditor, type BeforeMount, type OnMount } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore } from '../../store/useEditorStore';
import { TerminalTab } from '../TerminalTab';
import { VaultPanel } from '../VaultPanel';
import { McpPanel } from '../McpPanel';
import { RegexTester } from '../panels/RegexTester';
import { SftpBrowser } from '../panels/SftpBrowser';
import { HelpPanel } from '../panels/HelpPanel';
import { setupMonaco } from '../../editor/monacoSetup';
import type { EditorBuffer } from '../../types';

interface EditorAreaProps {
  editorRef: React.MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  orderedBuffers: EditorBuffer[];
}

export function EditorArea({ editorRef, orderedBuffers }: EditorAreaProps) {
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const buffers = useEditorStore(s => s.buffers);
  const updateBuffer = useEditorStore(s => s.updateBuffer);
  const setCursorPosition = useEditorStore(s => s.setCursorPosition);
  
  const viewMode = useEditorStore(s => s.viewMode);
  const compareBufferId = useEditorStore(s => s.compareBufferId);
  const visualTheme = useEditorStore(s => s.visualTheme);
  const wordWrap = useEditorStore(s => s.wordWrap);
  const showMinimap = useEditorStore(s => s.showMinimap);
  const showInvisibles = useEditorStore(s => s.showInvisibles);
  const indentSize = useEditorStore(s => s.indentSize);
  const fontSize = useEditorStore(s => s.fontSize);
  const autoFormat = useEditorStore(s => s.autoFormat);

  const activeBuffer = useMemo(
    () => orderedBuffers.find((b) => b.id === activeBufferId) ?? orderedBuffers[0],
    [activeBufferId, orderedBuffers]
  );

  const editorOptions: monacoEditor.editor.IStandaloneEditorConstructionOptions = useMemo(() => ({
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
    guides: { bracketPairs: true, indentation: true },
    lineNumbersMinChars: 4,
    minimap: { enabled: showMinimap },
    padding: { top: 14, bottom: 14 },
    renderWhitespace: showInvisibles ? 'all' : 'selection',
    renderControlCharacters: showInvisibles,
    readOnly: activeBuffer.readOnly,
    scrollBeyondLastLine: false,
    tabSize: indentSize,
    wordWrap: wordWrap ? 'on' : 'off',
  }), [autoFormat, fontSize, showMinimap, showInvisibles, activeBuffer.readOnly, indentSize, wordWrap]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    setupMonaco(monaco);
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();

    editor.onDidChangeCursorPosition((event) => {
      setCursorPosition({
        lineNumber: event.position.lineNumber,
        column: event.position.column,
      });
    });
  };

  const handleDiffMount = useCallback((editor: monacoEditor.editor.IStandaloneDiffEditor) => {
    const modifiedEditor = editor.getModifiedEditor();
    editorRef.current = modifiedEditor;
    
    modifiedEditor.onDidChangeModelContent(() => {
      const value = modifiedEditor.getValue();
      updateBuffer(activeBuffer.id, {
        content: value,
        dirty: value !== activeBuffer.savedContent,
      });
    });

    modifiedEditor.onDidChangeCursorPosition((event) => {
      setCursorPosition({
        lineNumber: event.position.lineNumber,
        column: event.position.column,
      });
    });
  }, [activeBuffer.id, activeBuffer.savedContent, updateBuffer, setCursorPosition, editorRef]);

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
      {viewMode === 'terminal' ? (
        <TerminalTab isActive={true} />
      ) : viewMode === 'vault' ? (
        <VaultPanel />
      ) : viewMode === 'mcp' ? (
        <McpPanel />
      ) : viewMode === 'regex' ? (
        <RegexTester />
      ) : viewMode === 'sftp' ? (
        <SftpBrowser />
      ) : viewMode === 'help' ? (
        <HelpPanel />
      ) : viewMode === 'diff' || viewMode === 'compare' ? (
        <DiffEditor
          beforeMount={handleBeforeMount}
          onMount={handleDiffMount}
          height="100%"
          language={activeBuffer.language}
          modified={activeBuffer.content}
          original={
            viewMode === 'compare'
              ? buffers.find((b) => b.id === compareBufferId)?.content ?? ''
              : activeBuffer.savedContent
          }
          options={{
            ...editorOptions,
            minimap: { enabled: false },
            renderSideBySide: true,
            readOnly: activeBuffer.readOnly, // Allow editing the modified side!
            enableSplitViewResizing: true,
            renderIndicators: true, // Shows + and - indicators
          }}
          theme={`greentext-${visualTheme}`}
          originalModelPath={`original-${activeBuffer.filePath ?? activeBuffer.name}`}
          modifiedModelPath={`modified-${activeBuffer.filePath ?? activeBuffer.name}`}
        />
      ) : (
        <div className={viewMode === 'split' ? "grid grid-cols-2 h-full divide-x divide-[#212b37]" : "w-full h-full"}>
          <Editor
            beforeMount={handleBeforeMount}
            height="100%"
            language={activeBuffer.language}
            onMount={handleMount}
            onChange={(value) =>
              updateBuffer(activeBuffer.id, {
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
  );
}
