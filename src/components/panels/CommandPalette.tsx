import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import type { CommandAction } from '../../types';

interface CommandPaletteProps {
  filteredCommands: CommandAction[];
  runCommand: (command: CommandAction) => void;
}

export function CommandPalette({ filteredCommands, runCommand }: CommandPaletteProps) {
  const commandPaletteOpen = useEditorStore(s => s.commandPaletteOpen);
  const setCommandPaletteOpen = useEditorStore(s => s.setCommandPaletteOpen);
  const commandQuery = useEditorStore(s => s.commandQuery);
  const setCommandQuery = useEditorStore(s => s.setCommandQuery);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setCommandPaletteOpen(false);
      }}
    >
      <div className="w-[min(660px,calc(100vw-48px))] mx-auto overflow-hidden border border-[#01a982]/45 rounded-[14px] bg-[#0f141c]/98 shadow-[0_22px_50px_-12px_rgba(0,0,0,0.7)]">
        <div className="relative">
          <input
            autoFocus
            className="w-full h-[46px] pl-4 pr-11 border-0 border-b border-[#212b37] rounded-none text-[#e6edf3] bg-[#141a23] text-base outline-none"
            placeholder="Run command..."
            value={commandQuery}
            onChange={(event) => setCommandQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setCommandPaletteOpen(false);
              if (event.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0]);
            }}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-md text-[#9aa7b4] hover:text-[#e6edf3] hover:bg-[#1a222c]"
            title="Close (Esc)"
            aria-label="Close command palette"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col max-h-[390px] overflow-auto p-1.5">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-4 text-center text-[#6b7785] text-[13px]">No matching commands</div>
          ) : filteredCommands.map((command) => (
            <button 
              key={command.id} 
              type="button" 
              className="flex justify-between items-center min-h-[36px] px-3 py-1.5 border border-transparent rounded-md text-left text-[#e6edf3] bg-transparent hover:border-[#01a982]/45 hover:bg-[#01a982]/10 transition-colors"
              onClick={() => runCommand(command)}
            >
              <span>{command.title}</span>
              {command.shortcut ? <small className="text-[#9aa7b4] text-[11px]">{command.shortcut}</small> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#212b37] bg-[#0b0f16] text-[10px] text-[#6b7785]">
          <span>Enter to run - Esc or click outside to close</span>
          <span>{filteredCommands.length} command{filteredCommands.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
