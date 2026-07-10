import { PanelLeft, FilePlus2, FolderOpen, Save, Wand2, Sparkles } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

// We'll pass the functions from App.tsx via props or store for now
interface TopbarProps {
  createBuffer: () => void;
  openFile: () => void;
  openProjectFolder: () => void;
  saveFile: () => void;
  prettyIndent: () => void;
}

export function Topbar({ createBuffer, openFile, openProjectFolder, saveFile, prettyIndent }: TopbarProps) {
  const setSidebarOpen = useEditorStore((s) => s.setSidebarOpen);
  const setInspectorOpen = useEditorStore((s) => s.setInspectorOpen);
  const setCommandPaletteOpen = useEditorStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="flex items-center h-11 px-3 border-b border-[#212b37] bg-[#0f141c]/80 backdrop-blur-md sticky top-0 z-50">
      <button className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={() => setSidebarOpen((value) => !value)}>
        <PanelLeft size={17} />
      </button>
      <div className="flex items-center gap-2 min-w-[170px] ml-2">
        <span className="grid w-6 h-6 place-items-center border border-[#01a982]/45 rounded-md text-[#01a982] bg-[#01a982]/10 font-black tracking-tighter">GT</span>
        <div>
          <h1 className="m-0 text-[#e6edf3] text-[13px] leading-tight font-semibold">GreenText</h1>
          <p className="max-w-[88px] m-0 text-[#9aa7b4] text-[11px] leading-tight truncate">Editor</p>
        </div>
      </div>
      <div className="flex flex-1 justify-end gap-1 overflow-x-auto">
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={createBuffer} title="New File">
          <FilePlus2 size={16} />
          <span className="sr-only">New</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={openFile} title="Open File">
          <FolderOpen size={16} />
          <span className="sr-only">Open</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={openProjectFolder} title="Open Project">
          <FolderOpen size={16} />
          <span className="sr-only">Open folder</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={saveFile} title="Save (Cmd+S)">
          <Save size={16} />
          <span className="sr-only">Save</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-[#01a982]/45 text-[#04130e] bg-gradient-to-br from-[#01a982] to-[#018f6e] font-bold transition-colors ml-1" type="button" onClick={prettyIndent} title="Format Code">
          <Wand2 size={16} />
          <span>Format</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors ml-1" type="button" onClick={() => setInspectorOpen((value) => !value)} title="Tools Panel">
          <Sparkles size={16} />
          <span className="sr-only">Tools</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors" type="button" onClick={() => setCommandPaletteOpen(true)} title="Command Palette">
          <Sparkles size={16} />
          <span className="sr-only">Commands</span>
        </button>
      </div>
    </header>
  );
}
