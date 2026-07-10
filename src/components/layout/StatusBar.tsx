import { useMemo } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { languageLabel } from '../../data/languages';
import { countLines } from '../../utils/helpers';

export function StatusBar() {
  const statusMessage = useEditorStore((s) => s.statusMessage);
  const viewMode = useEditorStore((s) => s.viewMode);
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const fontSize = useEditorStore((s) => s.fontSize);
  const autoFormat = useEditorStore((s) => s.autoFormat);
  const buffers = useEditorStore((s) => s.buffers);
  const activeBufferId = useEditorStore((s) => s.activeBufferId);
  
  const activeBuffer = useMemo(
    () => buffers.find((b) => b.id === activeBufferId) ?? buffers[0],
    [activeBufferId, buffers]
  );

  return (
    <footer className="flex items-center gap-2.5 min-h-[24px] px-2 border-t border-[#212b37] bg-[#070a0f] text-[#9aa7b4] text-[11px]">
      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[#e6edf3]">
        {statusMessage}
      </span>
      <span className="inline-flex items-center min-h-[16px] px-1.5 py-[1px] border border-[#01a982]/24 rounded-full text-[#9aa7b4] bg-[#01a982]/5 text-[10px] font-extrabold whitespace-nowrap">
        {viewMode === 'terminal' || viewMode === 'vault' || viewMode === 'mcp' || viewMode === 'help' ? 'System' : languageLabel(activeBuffer.language)}
      </span>
      <span>{viewMode}</span>
      {viewMode !== 'terminal' && viewMode !== 'vault' && viewMode !== 'mcp' && viewMode !== 'help' && (
        <>
          <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
          <span>{activeBuffer.encoding}</span>
          <span>{activeBuffer.eol}</span>
          <span>{Math.round((fontSize / 13) * 100)}%</span>
          <span>{countLines(activeBuffer.content)} lines</span>
          <span>{activeBuffer.content.length.toLocaleString()} chars</span>
          <span>{autoFormat ? 'auto-indent on' : 'auto-indent off'}</span>
        </>
      )}
    </footer>
  );
}
