import { useState, useMemo } from 'react';
import { HelpCircle, Search, Keyboard, BookOpen, Settings } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

interface ShortcutDef {
  key: string;
  desc: string;
  category: string;
}

const shortcuts: ShortcutDef[] = [
  // General
  { key: 'Cmd/Ctrl + P', desc: 'Open Command Palette (Run any command)', category: 'General' },
  { key: 'Cmd/Ctrl + B', desc: 'Toggle Sidebar (Files & Buffers)', category: 'General' },
  { key: 'Cmd/Ctrl + ,', desc: 'Open Settings (If available)', category: 'General' },
  
  // File Management
  { key: 'Cmd/Ctrl + N', desc: 'New File', category: 'Files' },
  { key: 'Cmd/Ctrl + O', desc: 'Open File', category: 'Files' },
  { key: 'Cmd/Ctrl + Shift + O', desc: 'Open Project Folder', category: 'Files' },
  { key: 'Cmd/Ctrl + S', desc: 'Save Active File', category: 'Files' },
  { key: 'Cmd/Ctrl + Shift + S', desc: 'Save As...', category: 'Files' },
  { key: 'Cmd/Ctrl + Alt + S', desc: 'Save All Modified Files', category: 'Files' },
  
  // Searching
  { key: 'Cmd/Ctrl + F', desc: 'Find in Current File', category: 'Search' },
  { key: 'Cmd/Ctrl + Alt + F', desc: 'Find & Replace in Current File', category: 'Search' },
  { key: 'Cmd/Ctrl + Shift + F', desc: 'Find in Project (Multi-file search)', category: 'Search' },
  
  // View Modes
  { key: 'Cmd/Ctrl + \\', desc: 'Toggle Split View (Side-by-side edit)', category: 'View' },
  { key: 'Cmd/Ctrl + Shift + G', desc: 'Toggle Diff Mode (Compare to saved)', category: 'View' },
  { key: 'Cmd/Ctrl + T', desc: 'Open SSH Terminal', category: 'View' },
  { key: 'Cmd/Ctrl + =', desc: 'Zoom In', category: 'View' },
  { key: 'Cmd/Ctrl + -', desc: 'Zoom Out', category: 'View' },
  { key: 'Cmd/Ctrl + 0', desc: 'Reset Zoom', category: 'View' },
  
  // Text Manipulation
  { key: 'Cmd/Ctrl + Alt + Shift + F', desc: 'Auto-Format / Pretty Indent Code', category: 'Editing' },
  { key: 'Cmd/Ctrl + Shift + D', desc: 'Duplicate Selection / Line', category: 'Editing' },
  { key: 'Option/Alt + Up/Down', desc: 'Move Line Up/Down', category: 'Editing' },
  { key: 'Cmd/Ctrl + /', desc: 'Toggle Comment', category: 'Editing' },
  { key: 'Cmd/Ctrl + D', desc: 'Select Next Occurrence', category: 'Editing' },
  { key: 'Option/Alt + Click', desc: 'Multiple Cursors', category: 'Editing' }
];

const guides = [
  {
    title: 'Connecting to Devices (Terminal)',
    content: 'Open the SSH Terminal (Cmd+T). By default, it connects through the underlying OS SSH client. In a full deployment, you can select credentials from the Vault to auto-login to Aruba/Juniper switches.',
    icon: <Settings size={18} className="text-[#01a982]" />
  },
  {
    title: 'Using the Credential Vault',
    content: 'The Vault securely stores passwords and API keys using AES-256-GCM. When launching an SFTP browser session or Terminal, the app can securely inject these credentials without exposing them in plaintext.',
    icon: <BookOpen size={18} className="text-[#ff8300]" />
  },
  {
    title: 'Text Processing Tools',
    content: 'The Inspector panel (right sidebar) contains powerful text manipulation tools. Select lines of config, then click "Process Duplicate Lines" to dedupe, or "Zap Gremlins" to remove hidden non-ASCII characters that break switches.',
    icon: <Keyboard size={18} className="text-[#2ece8a]" />
  },
  {
    title: 'Regex Pattern Playground',
    content: 'Need to write an automation script or parse a config? Open the Pattern Playground. It loads your current file and lets you write Regex in real-time, showing exactly what capture groups match.',
    icon: <Search size={18} className="text-[#7b61ff]" />
  }
];

export function HelpPanel() {
  const [search, setSearch] = useState('');
  const setViewMode = useEditorStore(s => s.setViewMode);

  const filteredShortcuts = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return shortcuts;
    return shortcuts.filter(s => 
      s.key.toLowerCase().includes(query) || 
      s.desc.toLowerCase().includes(query) || 
      s.category.toLowerCase().includes(query)
    );
  }, [search]);

  const filteredGuides = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return guides;
    return guides.filter(g => 
      g.title.toLowerCase().includes(query) || 
      g.content.toLowerCase().includes(query)
    );
  }, [search]);

  // Group shortcuts by category
  const categories = useMemo(() => {
    const groups: Record<string, typeof filteredShortcuts> = {};
    for (const s of filteredShortcuts) {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    }
    return groups;
  }, [filteredShortcuts]);

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-[#e6edf3] overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#212b37] bg-[#0f141c]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-[#2ece8a]/10 text-[#2ece8a]">
            <HelpCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Help & Documentation</h2>
            <p className="text-xs text-[#9aa7b4]">Keyboard shortcuts and feature guides</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5d6b7a]" />
            <input 
              autoFocus
              type="text"
              placeholder="Search help..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-64 pl-9 pr-3 rounded-md border border-[#212b37] bg-[#141a23] text-sm focus:border-[#2ece8a] outline-none transition-colors"
            />
          </div>
          <button 
            onClick={() => setViewMode('edit')}
            className="flex items-center px-3 py-1.5 rounded-md border border-[#212b37] text-[#9aa7b4] hover:bg-[#1a222c] hover:text-[#e6edf3] transition-colors text-sm font-semibold"
          >
            Close Help
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
        {/* Left Column: Shortcuts */}
        <div className="flex-1 flex flex-col gap-6 min-w-[300px]">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#e6edf3] uppercase mb-4 flex items-center gap-2 border-b border-[#212b37] pb-2">
              <Keyboard size={16} className="text-[#9aa7b4]" />
              Keyboard Shortcuts
            </h3>
            
            {Object.keys(categories).length === 0 ? (
              <p className="text-[#5d6b7a] italic text-sm">No shortcuts matched "{search}"</p>
            ) : (
              <div className="flex flex-col gap-6">
                {Object.entries(categories).map(([category, items]) => (
                  <div key={category} className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-[#01a982] uppercase">{category}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {items.map(s => (
                        <div key={s.key} className="flex items-start justify-between gap-4 p-2 rounded hover:bg-[#1a222c] transition-colors border border-transparent hover:border-[#212b37]">
                          <span className="text-sm text-[#9aa7b4]">{s.desc}</span>
                          <span className="px-2 py-0.5 rounded bg-[#141a23] border border-[#30404f] font-mono text-[11px] text-[#e6edf3] whitespace-nowrap shadow-[0_1px_0_#30404f]">
                            {s.key}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Guides */}
        <div className="flex-1 flex flex-col gap-6 min-w-[300px]">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#e6edf3] uppercase mb-4 flex items-center gap-2 border-b border-[#212b37] pb-2">
              <BookOpen size={16} className="text-[#9aa7b4]" />
              Feature Guides
            </h3>
            
            {filteredGuides.length === 0 ? (
              <p className="text-[#5d6b7a] italic text-sm">No guides matched "{search}"</p>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredGuides.map(g => (
                  <div key={g.title} className="flex flex-col gap-2 p-4 rounded-lg border border-[#212b37] bg-[#0f141c]">
                    <div className="flex items-center gap-2">
                      {g.icon}
                      <h4 className="text-sm font-bold text-[#e6edf3]">{g.title}</h4>
                    </div>
                    <p className="text-sm text-[#9aa7b4] leading-relaxed">
                      {g.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
