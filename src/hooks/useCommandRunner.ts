import { useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { CommandAction } from '../types';

export function useCommandRunner() {
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen);
  const setCommandQuery = useEditorStore(s => s.setCommandQuery);

  const runCommand = useCallback((command: CommandAction) => {
    setCommandPaletteOpen(false);
    setCommandQuery('');
    void command.run();
  }, [setCommandPaletteOpen, setCommandQuery]);

  return runCommand;
}
