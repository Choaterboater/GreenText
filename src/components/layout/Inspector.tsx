import { Sparkles, Search, Wand2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import type { TemplateDefinition, SearchResult } from '../../types';

interface InspectorProps {
  selectedTemplate: TemplateDefinition;
  availableTemplates: TemplateDefinition[];
  projectSearchTitle: string;
  projectSearchResults: SearchResult[];
  openSearchResult: (result: SearchResult) => void;
  runAutomation: (id: string) => void;
  openAutomationDraft: () => void;
  insertAutomationDraft: () => void;
  sortSelectedLines: () => void;
  removeDuplicateLines: () => void;
  toUpperCase: () => void;
  toLowerCase: () => void;
  zapGremlins: () => void;
  trimTrailingWhitespace: () => void;
  duplicateLine: () => void;
}

export function Inspector({
  selectedTemplate,
  availableTemplates,
  projectSearchTitle,
  projectSearchResults,
  openSearchResult,
  openAutomationDraft,
  insertAutomationDraft,
  sortSelectedLines,
  removeDuplicateLines,
  toUpperCase,
  toLowerCase,
  zapGremlins,
  trimTrailingWhitespace,
  duplicateLine
}: InspectorProps) {
  const inspectorOpen = useEditorStore(s => s.inspectorOpen);
  const setSelectedTemplateId = useEditorStore(s => s.setSelectedTemplateId);
  const automationDraft = useEditorStore(s => s.automationDraft);
  const wordWrap = useEditorStore(s => s.wordWrap);
  const setWordWrap = useEditorStore(s => s.setWordWrap);
  const showMinimap = useEditorStore(s => s.showMinimap);
  const setShowMinimap = useEditorStore(s => s.setShowMinimap);
  const showInvisibles = useEditorStore(s => s.showInvisibles);
  const setShowInvisibles = useEditorStore(s => s.setShowInvisibles);
  const autoFormat = useEditorStore(s => s.autoFormat);
  const setAutoFormat = useEditorStore(s => s.setAutoFormat);

  if (!inspectorOpen) return null;

  return (
    <aside className="flex flex-col gap-1.5 p-1.5 w-[250px] bg-[#0a0e14] border-l border-[#212b37] overflow-y-auto">
      <section className="flex flex-col min-h-0 p-1.5 border border-[#212b37] rounded-md bg-[#0f141c] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#e6edf3] text-[11px] font-bold tracking-wider uppercase">
          <Sparkles size={16} />
          <span>Network templates</span>
        </div>
        <select
          className="w-full min-h-[28px] px-2 text-[12px] border border-[#212b37] rounded-md bg-[#141a23]/90 text-[#e6edf3] hover:bg-[#1a222c] hover:border-[#30404f]"
          value={selectedTemplate.id}
          onChange={(event) => setSelectedTemplateId(event.target.value)}
        >
          {availableTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.vendor} {template.platform} - {template.name}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1.5 mt-1.5 p-1.5 border border-[#212b37] rounded-md bg-[#0a0e14]">
          <strong className="text-[#e6edf3]">{selectedTemplate.name}</strong>
          <p className="m-0 text-[#9aa7b4] text-[12px] leading-snug">{selectedTemplate.description}</p>
          <div className="flex flex-wrap gap-1">
            {selectedTemplate.tags.map((tag: string) => (
              <span key={tag} className="px-1.5 py-[1px] border border-[#01a982]/20 rounded-full text-[#9aa7b4] bg-[#01a982]/5 text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col min-h-0 p-1.5 border border-[#212b37] rounded-md bg-[#0f141c] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#e6edf3] text-[11px] font-bold tracking-wider uppercase">
          <Search size={16} />
          <span>{projectSearchTitle}</span>
        </div>
        <div className="flex flex-col gap-1 max-h-[155px] overflow-y-auto">
          {projectSearchResults.length > 0 ? projectSearchResults.slice(0, 80).map((result) => (
            <button className="flex flex-col items-start w-full min-h-[26px] px-1.5 py-1 text-left rounded-md border border-transparent hover:bg-[#1a222c] hover:border-[#30404f] text-[#9aa7b4]" key={`${result.path}-${result.lineNumber}-${result.line}`} type="button" onClick={() => openSearchResult(result)}>
              <span className="text-[#e6edf3] text-[11px] truncate max-w-full">{result.relativePath}:{result.lineNumber}</span>
              <small className="text-[#9aa7b4] text-[11px] truncate max-w-full opacity-80">{result.line}</small>
            </button>
          )) : <small className="text-[#5d6b7a] text-[11px]">Run Find project to populate clickable matches.</small>}
        </div>
      </section>

      <section className="flex flex-col min-h-0 flex-1 p-1.5 border border-[#212b37] rounded-md bg-[#0f141c] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#e6edf3] text-[11px] font-bold tracking-wider uppercase">
          <Wand2 size={16} />
          <span>Text Tools</span>
        </div>
        <div className="flex flex-col gap-1">
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={sortSelectedLines}>Sort lines</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={removeDuplicateLines}>Process Duplicate Lines</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={toUpperCase}>To UPPERCASE</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={toLowerCase}>To lowercase</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={zapGremlins}>Zap Gremlins (ASCII Only)</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={trimTrailingWhitespace}>Trim trailing space</button>
          <button className="flex items-center justify-start min-h-[26px] px-1.5 text-[11px] border border-[#212b37] rounded-md text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors" type="button" onClick={duplicateLine}>Duplicate selection</button>
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-[#9aa7b4]">
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <input checked={wordWrap} type="checkbox" onChange={(event) => setWordWrap(event.target.checked)} className="bg-[#141a23]/90 border border-[#212b37] rounded" />
              Word wrap
            </label>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <input checked={autoFormat} type="checkbox" onChange={(event) => setAutoFormat(event.target.checked)} className="bg-[#141a23]/90 border border-[#212b37] rounded" />
              Format on paste
            </label>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <input checked={showMinimap} type="checkbox" onChange={(event) => setShowMinimap(event.target.checked)} className="bg-[#141a23]/90 border border-[#212b37] rounded" />
              Minimap
            </label>
            <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <input checked={showInvisibles} type="checkbox" onChange={(event) => setShowInvisibles(event.target.checked)} className="bg-[#141a23]/90 border border-[#212b37] rounded" />
              Invisibles
            </label>
          </div>
        </div>
        {automationDraft ? (
          <div className="flex flex-col gap-2 p-2 border border-[#01a982]/25 rounded-md bg-[#01a982]/[0.08]">
            <strong className="text-[#e6edf3]">{automationDraft.title}</strong>
            <pre className="m-0 max-h-[220px] overflow-auto text-[#e6edf3] whitespace-pre-wrap font-mono text-[11px] leading-snug">{automationDraft.content}</pre>
            <div className="flex gap-1.5">
              <button className="flex-1" type="button" onClick={openAutomationDraft}>Open as note</button>
              <button className="flex-1" type="button" onClick={insertAutomationDraft}>Insert</button>
            </div>
          </div>
        ) : (
          <p className="text-[#5d6b7a] text-[11px] leading-snug mt-2">Select text, then run an automation. Drafts preview here before you insert or open them.</p>
        )}
      </section>
    </aside>
  );
}
