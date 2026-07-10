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

  const isSystemView = viewMode === 'terminal' || viewMode === 'vault' || viewMode === 'mcp' || viewMode === 'help';
  const viewLabel = viewMode.charAt(0).toUpperCase() + viewMode.slice(1);
  const divider = <span className="w-px h-3 bg-[#212b37]" aria-hidden="true" />;

  return (
    <footer className="flex items-center gap-2.5 min-h-[24px] px-2.5 border-t border-[#212b37] bg-[#070a0f] text-[#9aa7b4] text-[11px]">
      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[#c3ccd6]">
        {statusMessage}
      </span>
      <span className="inline-flex items-center min-h-[16px] px-1.5 py-[1px] border border-[#01a982]/24 rounded-full text-[#2ece8a] bg-[#01a982]/[0.07] text-[10px] font-extrabold whitespace-nowrap uppercase tracking-wide">
        {isSystemView ? 'System' : languageLabel(activeBuffer.language)}
      </span>
      {divider}
      <span className="text-[#c3ccd6]">{viewLabel}</span>
      {!isSystemView && (
        <>
          {divider}
          <span title="Cursor position">Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
          {divider}
          <span title="Encoding">{activeBuffer.encoding}</span>
          <span title="Line endings">{activeBuffer.eol}</span>
          {divider}
          <span title="Zoom">{Math.round((fontSize / 13) * 100)}%</span>
          {divider}
          <span title="Line count">{countLines(activeBuffer.content)} lines</span>
          <span title="Character count">{activeBuffer.content.length.toLocaleString()} chars</span>
          {divider}
          <span className={autoFormat ? 'text-[#2ece8a]' : 'text-[#6b7785]'} title="Auto-indent on save">
            {autoFormat ? 'auto-indent on' : 'auto-indent off'}
          </span>
        </>
      )}
    </footer>
  );
}
