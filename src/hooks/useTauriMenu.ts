import { useEffect, type MutableRefObject } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauriRuntime } from '../utils/helpers';
import type { CommandAction, TemplateDefinition } from '../types';

export function useTauriMenu(
  commandsRef: MutableRefObject<CommandAction[]>,
  newFromTemplateRef: MutableRefObject<(template: TemplateDefinition) => void>,
  selectedTemplateRef: MutableRefObject<TemplateDefinition>
) {
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
          'text-upper': 'to-upper',
          'text-lower': 'to-lower',
          'text-sort': 'sort-lines',
          'text-reverse': 'reverse-lines',
          'text-dedupe': 'remove-duplicates',
          'text-zap': 'zap-gremlins',
          'text-trim': 'trim',
          'view-toggle-sidebar': 'toggle-sidebar',
          'view-toggle-tools': 'toggle-inspector',
          'view-toggle-wrap': 'toggle-wrap',
          'view-toggle-invisibles': 'toggle-invisibles',
          'view-zoom-in': 'zoom-in',
          'view-zoom-out': 'zoom-out',
          'view-zoom-reset': 'zoom-reset',
          'view-edit': 'edit-mode',
          'view-split': 'split-mode',
          'view-diff': 'diff-mode',
          'view-terminal': 'terminal-mode',
          'view-vault': 'vault-mode',
          'view-mcp': 'mcp-mode',
          'view-regex': 'regex-mode',
          'view-sftp': 'sftp-mode',
          'view-help': 'help-mode',
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
      if (unlisten) unlisten();
    };
  }, [commandsRef, newFromTemplateRef, selectedTemplateRef]);
}
