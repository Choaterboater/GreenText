import { useCallback, useRef, type MutableRefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type * as monacoEditor from 'monaco-editor';
import { useEditorStore } from '../store/useEditorStore';
import { newBuffer, errorMessage, conformToEol } from '../utils/helpers';
import type { EditorBuffer, OpenedFile, ProjectFolder, SavedFile } from '../types';

export function useFiles(
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
) {
  const buffers = useEditorStore(s => s.buffers);
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const setBuffers = useEditorStore(s => s.setBuffers);
  const setActiveBufferId = useEditorStore(s => s.setActiveBufferId);
  const updateBuffer = useEditorStore(s => s.updateBuffer);
  const setStatusMessage = useEditorStore(s => s.setStatusMessage);
  const setProjectRoot = useEditorStore(s => s.setProjectRoot);
  const setProjectFiles = useEditorStore(s => s.setProjectFiles);
  const setRecentFiles = useEditorStore(s => s.setRecentFiles);

  const pendingWrites = useRef(new Set<string>());

  const createBuffer = useCallback(() => {
    const buffer = newBuffer();
    setBuffers((prev) => [...prev, buffer]);
    setActiveBufferId(buffer.id);
    setStatusMessage('Created new buffer.');
  }, [setBuffers, setActiveBufferId, setStatusMessage]);

  const loadFileIntoBuffer = useCallback((file: OpenedFile) => {
    const existing = buffers.find((b) => b.filePath === file.path);
    if (existing) {
      setActiveBufferId(existing.id);
      setStatusMessage(`Switched to ${file.name}`);
      return;
    }

    const buffer: EditorBuffer = {
      ...newBuffer(file.name, file.content),
      savedContent: file.content,
      filePath: file.path,
      encoding: file.encoding,
      eol: file.eol,
      readOnly: file.readOnly,
    };
    setBuffers((prev) => [...prev, buffer]);
    setActiveBufferId(buffer.id);
    setStatusMessage(`Opened ${file.name} (${file.encoding}, ${file.eol})`);
    
    setRecentFiles((prev) => {
      const paths = [file.path, ...prev.filter((p) => p !== file.path)].slice(0, 20);
      try { localStorage.setItem('greentext_recent_files_v1', JSON.stringify(paths)); } catch { /* ignore */ }
      return paths;
    });
  }, [buffers, setActiveBufferId, setBuffers, setStatusMessage, setRecentFiles]);

  const openFile = useCallback(async () => {
    try {
      setStatusMessage('Waiting for file selection...');
      const file = await invoke<OpenedFile | null>('pick_text_file');
      if (file) loadFileIntoBuffer(file);
      else setStatusMessage('Ready.');
    } catch (error) {
      setStatusMessage(`Error: ${errorMessage(error)}`);
    }
  }, [loadFileIntoBuffer, setStatusMessage]);

  const openProjectFolder = useCallback(async () => {
    try {
      setStatusMessage('Waiting for folder selection...');
      const folder = await invoke<ProjectFolder | null>('pick_project_folder');
      if (folder) {
        setProjectRoot(folder.root);
        setProjectFiles(folder.files);
        setStatusMessage(`Opened project: ${folder.root} (${folder.files.length} files)`);
      } else {
        setStatusMessage('Ready.');
      }
    } catch (error) {
      setStatusMessage(`Error: ${errorMessage(error)}`);
    }
  }, [setProjectRoot, setProjectFiles, setStatusMessage]);

  const saveBuffer = useCallback(async (bufferId: string, asNew = false) => {
    const buffer = buffers.find((b) => b.id === bufferId);
    if (!buffer) return;

    if (buffer.readOnly) {
      setStatusMessage(`Cannot save ${buffer.name} (read-only).`);
      return;
    }

    if (pendingWrites.current.has(buffer.id)) {
      setStatusMessage(`Already saving ${buffer.name}...`);
      return;
    }

    try {
      pendingWrites.current.add(buffer.id);
      setStatusMessage(`Saving ${buffer.name}...`);

      const contentToSave = conformToEol(buffer.content, buffer);
      
      let saved: SavedFile;
      if (asNew || !buffer.filePath) {
        const result = await invoke<SavedFile | null>('save_text_file_as', {
          defaultName: buffer.name,
          contents: contentToSave,
          encoding: buffer.encoding,
        });
        if (!result) {
          setStatusMessage('Save cancelled.');
          return;
        }
        saved = result;
      } else {
        saved = await invoke<SavedFile>('write_text_file', {
          path: buffer.filePath,
          contents: contentToSave,
          encoding: buffer.encoding,
        });
      }

      updateBuffer(buffer.id, {
        name: saved.name,
        filePath: saved.path,
        savedContent: buffer.content,
        dirty: false,
      });
      setStatusMessage(`Saved ${saved.name}`);
    } catch (error) {
      setStatusMessage(`Failed to save ${buffer.name}: ${errorMessage(error)}`);
    } finally {
      pendingWrites.current.delete(buffer.id);
    }
  }, [buffers, updateBuffer, setStatusMessage]);

  const saveFile = useCallback(() => saveBuffer(activeBufferId, false), [activeBufferId, saveBuffer]);
  const saveAsFile = useCallback(() => saveBuffer(activeBufferId, true), [activeBufferId, saveBuffer]);

  const saveAllFiles = useCallback(async () => {
    const dirtyBuffers = buffers.filter((b) => b.dirty && !b.readOnly && b.filePath);
    if (dirtyBuffers.length === 0) {
      setStatusMessage('No dirty files to save.');
      return;
    }

    setStatusMessage(`Saving ${dirtyBuffers.length} files...`);
    let success = 0;
    
    for (const buffer of dirtyBuffers) {
      try {
        const contentToSave = conformToEol(buffer.content, buffer);
        await invoke('write_text_file', {
          path: buffer.filePath,
          contents: contentToSave,
          encoding: buffer.encoding,
        });
        updateBuffer(buffer.id, { savedContent: buffer.content, dirty: false });
        success++;
      } catch (e) {
        console.error(`Failed to save ${buffer.name}:`, e);
      }
    }
    setStatusMessage(`Saved ${success} of ${dirtyBuffers.length} files.`);
  }, [buffers, updateBuffer, setStatusMessage]);

  const revertActiveBuffer = useCallback(() => {
    const buffer = buffers.find((b) => b.id === activeBufferId);
    if (!buffer || !buffer.dirty) return;
    
    const original = buffer.savedContent;
    updateBuffer(buffer.id, { content: original, dirty: false });
    
    if (editorRef.current && editorRef.current.getModel()) {
      editorRef.current.setValue(original);
    }
    setStatusMessage(`Reverted ${buffer.name} to saved state.`);
  }, [activeBufferId, buffers, updateBuffer, setStatusMessage, editorRef]);

  const closeBuffer = useCallback((idToClose: string) => {
    const buffer = buffers.find((b) => b.id === idToClose);
    if (!buffer) return;
    
    if (buffer.dirty && buffer.content.trim().length > 0) {
      const confirm = window.confirm(`Save changes to ${buffer.name} before closing?`);
      if (confirm) {
        saveBuffer(idToClose, !buffer.filePath).then(() => {
          setBuffers((prev) => {
            const next = prev.filter((b) => b.id !== idToClose);
            if (next.length === 0) return [newBuffer()];
            return next;
          });
        });
        return;
      }
    }
    
    setBuffers((prev) => {
      const next = prev.filter((b) => b.id !== idToClose);
      if (next.length === 0) return [newBuffer()];
      return next;
    });
    
    if (activeBufferId === idToClose) {
      const currentIndex = buffers.findIndex((b) => b.id === idToClose);
      const nextIndex = Math.min(currentIndex, buffers.length - 2);
      setActiveBufferId(buffers[buffers.length > 1 ? nextIndex : 0].id);
    }
  }, [activeBufferId, buffers, saveBuffer, setBuffers, setActiveBufferId]);

  return {
    createBuffer,
    loadFileIntoBuffer,
    openFile,
    openProjectFolder,
    saveBuffer,
    saveFile,
    saveAsFile,
    saveAllFiles,
    revertActiveBuffer,
    closeBuffer
  };
}
