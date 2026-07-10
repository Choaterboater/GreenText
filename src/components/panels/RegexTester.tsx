import { useState, useMemo } from 'react';
import { Regex, FileCode2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gm');
  const [replacement, setReplacement] = useState('');
  
  const activeBufferId = useEditorStore(s => s.activeBufferId);
  const buffers = useEditorStore(s => s.buffers);
  
  const activeBuffer = useMemo(
    () => buffers.find((b) => b.id === activeBufferId) ?? buffers[0],
    [activeBufferId, buffers]
  );

  const [testText, setTestText] = useState(activeBuffer?.content || '');

  const results = useMemo(() => {
    if (!pattern) return null;
    
    try {
      const regex = new RegExp(pattern, flags);
      const text = testText;
      let match;
      const matches = [];
      
      if (!regex.global) {
        match = regex.exec(text);
        if (match) matches.push(match);
      } else {
        while ((match = regex.exec(text)) !== null) {
          matches.push(match);
          if (match.index === regex.lastIndex) regex.lastIndex++; // prevent infinite loops on zero-length matches
        }
      }

      let replaced = '';
      if (replacement !== undefined) {
         replaced = text.replace(regex, replacement);
      }

      return { matches, replaced, error: null };
    } catch (e: any) {
      return { matches: [], replaced: '', error: e.message };
    }
  }, [pattern, flags, testText, replacement]);

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-[#e6edf3]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#212b37] bg-[#0f141c]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-[#01a982]/10 text-[#01a982]">
            <Regex size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Pattern Playground</h2>
            <p className="text-xs text-[#9aa7b4]">Test and refine regular expressions</p>
          </div>
        </div>
        <button 
          onClick={() => setTestText(activeBuffer?.content || '')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#01a982]/45 text-[#01a982] hover:bg-[#01a982]/10 transition-colors text-sm font-semibold"
        >
          <FileCode2 size={16} />
          Load Active Buffer
        </button>
      </header>

      <div className="flex-1 p-6 overflow-hidden flex gap-6">
        <div className="flex flex-col gap-4 w-1/2 min-w-[300px] h-full overflow-y-auto pr-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#9aa7b4] uppercase tracking-wider">Regular Expression</label>
            <div className="flex gap-2">
              <span className="flex items-center justify-center bg-[#1a222c] border border-[#212b37] border-r-0 rounded-l-md px-3 text-[#9aa7b4] font-mono text-lg">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="pattern..."
                className="flex-1 h-10 px-3 border border-[#212b37] bg-[#141a23] text-[#e6edf3] font-mono focus:border-[#01a982] outline-none"
              />
              <span className="flex items-center justify-center bg-[#1a222c] border border-[#212b37] border-l-0 border-r-0 px-3 text-[#9aa7b4] font-mono text-lg">/</span>
              <input
                type="text"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                placeholder="flags (gmi)"
                className="w-20 h-10 px-3 border border-[#212b37] rounded-r-md bg-[#141a23] text-[#e6edf3] font-mono focus:border-[#01a982] outline-none"
              />
            </div>
            {results?.error && <div className="text-[#f0533f] text-xs mt-1">{results.error}</div>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#9aa7b4] uppercase tracking-wider">Replacement Pattern</label>
            <input
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="$1 replacement..."
              className="w-full h-10 px-3 border border-[#212b37] rounded-md bg-[#141a23] text-[#e6edf3] font-mono focus:border-[#01a982] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <label className="text-[11px] font-bold text-[#9aa7b4] uppercase tracking-wider">Test Text</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full flex-1 p-3 border border-[#212b37] rounded-md bg-[#141a23] text-[#e6edf3] font-mono text-xs focus:border-[#01a982] outline-none resize-none"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 w-1/2 h-full overflow-hidden border-l border-[#212b37] pl-6">
          <div className="flex flex-col gap-1.5 h-1/2 min-h-[200px]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#9aa7b4] uppercase tracking-wider">Matches ({results?.matches?.length || 0})</label>
            </div>
            <div className="w-full flex-1 p-3 border border-[#212b37] rounded-md bg-[#0f141c] text-[#e6edf3] font-mono text-xs overflow-y-auto">
              {!pattern ? (
                <div className="h-full flex items-center justify-center text-[#5d6b7a] italic">Enter a pattern to see matches</div>
              ) : results?.matches.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#5d6b7a] italic">No matches found</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {results?.matches.map((m, i) => (
                    <div key={i} className="flex flex-col gap-1 p-2 bg-[#1a222c] border border-[#30404f] rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#01a982]">Match {i + 1}</span>
                        <span className="text-[#9aa7b4] text-[10px]">Index: {m.index}</span>
                      </div>
                      <div className="text-[#e6edf3] break-all">"{m[0]}"</div>
                      {m.length > 1 && (
                        <div className="mt-1 flex flex-col gap-1 pl-2 border-l-2 border-[#01a982]/30">
                          {m.slice(1).map((group, j) => (
                            <div key={j} className="text-[#9aa7b4] break-all">
                              <span className="text-[#5d6b7a] mr-1">${j + 1}:</span>
                              {group === undefined ? <span className="italic opacity-50">undefined</span> : `"${group}"`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 h-1/2 min-h-[200px]">
            <label className="text-[11px] font-bold text-[#9aa7b4] uppercase tracking-wider">Replacement Result</label>
            <div className="w-full flex-1 p-3 border border-[#212b37] rounded-md bg-[#0f141c] text-[#e6edf3] font-mono text-xs overflow-y-auto whitespace-pre-wrap break-all">
              {!pattern ? (
                <div className="h-full flex items-center justify-center text-[#5d6b7a] italic">Enter a pattern to see replacements</div>
              ) : (
                results?.replaced
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
