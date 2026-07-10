import { FileCode2, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import type { EditorBuffer, ProjectFile, TabSortMode, ProjectSortMode } from '../../types';

interface SidebarProps {
  orderedBuffers: EditorBuffer[];
  openSearchResult: (result: any) => void;
  openProjectFile: (file: ProjectFile) => void;
  projectFileGroups: { directory: string; files: ProjectFile[] }[];
}

export function Sidebar({ orderedBuffers, openProjectFile, projectFileGroups }: SidebarProps) {
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const tabSortMode = useEditorStore((s) => s.tabSortMode);
  const setTabSortMode = useEditorStore((s) => s.setTabSortMode);
  const projectSortMode = useEditorStore((s) => s.projectSortMode);
  const setProjectSortMode = useEditorStore((s) => s.setProjectSortMode);
  const activeBufferId = useEditorStore((s) => s.activeBufferId);
  const setActiveBufferId = useEditorStore((s) => s.setActiveBufferId);
  const projectFiles = useEditorStore((s) => s.projectFiles);
  const projectFilter = useEditorStore((s) => s.projectFilter);
  const setProjectFilter = useEditorStore((s) => s.setProjectFilter);
  const projectRoot = useEditorStore((s) => s.projectRoot);
  const groupProjectFiles = useEditorStore((s) => s.groupProjectFiles);
  const setGroupProjectFiles = useEditorStore((s) => s.setGroupProjectFiles);

  const activeBuffer = useMemo(
    () => orderedBuffers.find((b) => b.id === activeBufferId) ?? orderedBuffers[0],
    [activeBufferId, orderedBuffers]
  );

  if (!sidebarOpen) return null;

  return (
    <aside className="flex flex-col gap-1.5 p-1.5 w-[220px] bg-[#0a0e14] border-r border-[#212b37] overflow-y-auto">
      <section className="flex flex-col min-h-0 p-1.5 border border-[#212b37] rounded-md bg-[#0f141c]">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#e6edf3] text-[11px] font-bold tracking-wider uppercase">
          <FileCode2 size={16} />
          <span>Open buffers</span>
        </div>
        <div className="flex items-center gap-1.5 my-1.5 text-[#9aa7b4] text-[11px]">
          <select className="flex-1 min-w-0 min-h-[24px] px-1.5 text-[11px] border border-[#212b37] rounded-md bg-[#141a23]/90 text-[#e6edf3] hover:bg-[#1a222c] hover:border-[#30404f]" value={tabSortMode} onChange={(event) => setTabSortMode(event.target.value as TabSortMode)}>
            <option value="manual">Pinned + manual</option>
            <option value="name">Name</option>
            <option value="language">Language</option>
            <option value="dirty">Dirty first</option>
            <option value="path">Path</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1.5 max-h-[128px] overflow-y-auto">
          {orderedBuffers.map((buffer) => (
            <button
              className={`flex flex-col items-start w-full min-h-[26px] px-1.5 py-1 text-left rounded-md border border-transparent hover:bg-[#1a222c] hover:border-[#30404f] ${buffer.id === activeBuffer?.id ? 'bg-[#01a982]/10 border-[#01a982]/45 shadow-[inset_2px_0_0_#01a982] text-[#e6edf3]' : 'text-[#9aa7b4]'}`}
              key={buffer.id}
              type="button"
              onClick={() => setActiveBufferId(buffer.id)}
            >
              <span className="flex items-center gap-1.5 max-w-[100%]">
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-[9px] font-black ${buffer.pinned ? 'text-[#ff8300]' : 'text-[#5d6b7a]'}`} title={buffer.pinned ? 'Pinned' : 'Open buffer'}>{buffer.pinned ? '★' : '·'}</span>
                <span className="max-w-[100%] overflow-hidden text-ellipsis whitespace-nowrap">{buffer.name}{buffer.dirty ? ' *' : ''}</span>
              </span>
              <small className="text-[#9aa7b4] text-[11px] leading-snug">{buffer.filePath ?? 'unsaved'}</small>
            </button>
          ))}
        </div>
      </section>

      {projectFiles.length > 0 ? (
        <section className="flex flex-col min-h-0 p-1.5 border border-[#212b37] rounded-md bg-[#0f141c] max-h-[34vh] overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#e6edf3] text-[11px] font-bold tracking-wider uppercase">
            <Search size={16} />
            <span>Project Explorer</span>
          </div>
          <small className="text-[#9aa7b4] text-[11px] leading-snug break-all">{projectRoot}</small>
          <input
            className="w-full mt-1.5 min-h-[28px] px-2 text-[12px] border border-[#212b37] rounded-md bg-[#141a23]/90 text-[#e6edf3] hover:border-[#30404f] hover:bg-[#1a222c] transition-colors"
            placeholder="Filter files..."
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          />
          <div className="flex items-center gap-1.5 my-1.5 text-[#9aa7b4] text-[11px]">
            <select className="flex-1 min-w-0 min-h-[24px] px-1.5 text-[11px] border border-[#212b37] rounded-md bg-[#141a23]/90 text-[#e6edf3] hover:bg-[#1a222c] hover:border-[#30404f]" value={projectSortMode} onChange={(event) => setProjectSortMode(event.target.value as ProjectSortMode)}>
              <option value="path">Path</option>
              <option value="name">Name</option>
              <option value="type">Type/Extension</option>
              <option value="size">Size</option>
            </select>
            <label className="inline-flex items-center gap-1.5">
              <input checked={groupProjectFiles} type="checkbox" onChange={(event) => setGroupProjectFiles(event.target.checked)} className="bg-[#141a23]/90 border border-[#212b37] rounded" />
              Group
            </label>
          </div>
          <div className={`flex flex-col gap-1.5 mt-1.5 overflow-y-auto ${groupProjectFiles ? 'max-h-[135px]' : 'max-h-[175px]'}`}>
            {projectFileGroups.map((group) => (
              <div className="flex flex-col gap-1.5 pb-1.5" key={group.directory}>
                {groupProjectFiles ? <strong className="sticky top-0 z-[1] px-1.5 py-1 rounded-lg text-[#2ece8a] bg-[#0f141c]/96 text-[10px] tracking-wider uppercase">{group.directory}</strong> : null}
                {group.files.map((file) => {
                  const fileName = file.relativePath.split('/').pop() ?? file.relativePath;
                  const ext = fileName.includes('.') ? fileName.split('.').pop()!.slice(0, 4) : '·';
                  return (
                  <button className="flex items-center gap-2 w-full min-h-[26px] px-1.5 py-1 text-left rounded-md border border-transparent hover:bg-[#1a222c] hover:border-[#30404f] text-[#9aa7b4]" key={file.path} type="button" onClick={() => openProjectFile(file)}>
                    <span className="inline-flex items-center justify-center min-w-[26px] h-[16px] px-1 rounded bg-[#141a23] text-[#6b7785] text-[9px] font-mono font-bold uppercase shrink-0">{ext}</span>
                    <span className="flex flex-col min-w-0">
                      <span className="max-w-[100%] overflow-hidden text-ellipsis whitespace-nowrap text-[#e6edf3] text-[12px]">{fileName}</span>
                      <small className="text-[#9aa7b4] text-[11px] leading-snug overflow-hidden text-ellipsis whitespace-nowrap">{groupProjectFiles ? `${(file.size / 1024).toFixed(1)} KB` : file.relativePath}</small>
                    </span>
                  </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
