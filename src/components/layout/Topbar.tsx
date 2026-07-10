import { PanelLeft, FilePlus2, FolderOpen, FileText, Save, Wand2, Sparkles, Command } from 'lucide-react';
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
        <span className="grid w-7 h-7 place-items-center rounded-md bg-[#1c1b18] shrink-0">
          <svg viewBox="0 0 100 100" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M28 30h44M28 46h30M28 62h38" stroke="#01a982" strokeWidth="9" strokeLinecap="round" />
            <path d="M60 68l7 7 13-15" stroke="#01a982" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
          </svg>
        </span>
        <div>
          <h1 className="m-0 text-[#e6edf3] text-[13px] leading-tight font-semibold">GreenText</h1>
          <p className="max-w-[88px] m-0 text-[#9aa7b4] text-[11px] leading-tight truncate">Editor</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1 overflow-x-auto text-[12px]">
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={createBuffer} title="New file (Cmd/Ctrl+N)">
          <FilePlus2 size={15} />
          <span>New</span>
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={openFile} title="Open a single file">
          <FileText size={15} />
          <span>Open File</span>
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={openProjectFolder} title="Open a project folder">
          <FolderOpen size={15} />
          <span>Open Folder</span>
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={saveFile} title="Save (Cmd/Ctrl+S)">
          <Save size={15} />
          <span>Save</span>
        </button>
        <span className="w-px h-5 bg-[#212b37] mx-1 shrink-0" aria-hidden="true"></span>
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#01a982]/45 text-[#04130e] bg-gradient-to-br from-[#01a982] to-[#018f6e] font-bold transition-colors shrink-0" type="button" onClick={prettyIndent} title="Auto-format / Pretty Indent">
          <Wand2 size={15} />
          <span>Format</span>
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={() => setInspectorOpen((value) => !value)} title="Toggle Tools panel">
          <Sparkles size={15} />
          <span>Tools</span>
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3] transition-colors shrink-0" type="button" onClick={() => setCommandPaletteOpen(true)} title="Command palette (Cmd/Ctrl+P)">
          <Command size={15} />
          <span>Commands</span>
        </button>
      </div>
    </header>
  );
}
