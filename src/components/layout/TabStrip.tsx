import { useEditorStore } from '../../store/useEditorStore';

interface TabStripProps {
  orderedBuffers: any[];
  togglePinBuffer: (id: string) => void;
  closeBuffer: (id: string) => void;
}

export function TabStrip({ orderedBuffers, togglePinBuffer, closeBuffer }: TabStripProps) {
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const setActiveBufferId = useEditorStore(s => s.setActiveBufferId);
  const buffers = useEditorStore(s => s.buffers);

  return (
    <div className="flex gap-1 h-8 pt-[3px] px-1 border-b border-[#212b37] bg-[#0a0e14]/80 overflow-x-auto">
      {orderedBuffers.map((buffer) => (
        <button
          className={`flex items-center justify-between min-w-[118px] max-w-[190px] h-[28px] px-2 border border-transparent rounded-t-md text-[11px] ${buffer.id === activeBufferId ? 'bg-[#0b0f16] border-[#01a982]/45 border-b-[#0b0f16] text-[#e6edf3] z-10' : 'bg-[#141a23]/60 text-[#9aa7b4] hover:bg-[#1a222c]'} -mb-[1px]`}
          key={buffer.id}
          type="button"
          onClick={() => setActiveBufferId(buffer.id)}
        >
          <span
            className={`grid w-4 h-4 place-items-center rounded-full text-[10px] ${buffer.pinned ? 'text-[#ff8300] bg-[#ff8300]/10' : 'text-[#5d6b7a] hover:bg-[#212b37]'}`}
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
          <span className="max-w-[100%] overflow-hidden text-ellipsis whitespace-nowrap px-1">
            {buffer.name}{buffer.dirty ? ' *' : ''}
          </span>
          {buffers.length > 1 ? (
            <span
              className="grid w-4 h-4 place-items-center rounded-full text-[10px] text-[#5d6b7a] hover:bg-[#f0533f]/10 hover:text-[#ffc6bd]"
              role="button"
              tabIndex={0}
              title="Close tab"
              onClick={(event) => {
                event.stopPropagation();
                closeBuffer(buffer.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') closeBuffer(buffer.id);
              }}
            >
              ×
            </span>
          ) : (
            <span className="w-4"></span>
          )}
        </button>
      ))}
    </div>
  );
}
