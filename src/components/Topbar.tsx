import { Sparkles } from 'lucide-react';

export function Topbar() {
  return (
    <header className="flex items-center h-11 px-3 border-b border-[#212b37] bg-[#0f141c]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2 min-w-[170px]">
        <div className="grid w-6 h-6 place-items-center border border-[#01a982]/45 rounded-md text-[#01a982] bg-[#01a982]/10 font-black tracking-tighter">
          GT
        </div>
        <div>
          <h1 className="m-0 text-[#e6edf3] text-[13px] leading-tight font-semibold">GreenText</h1>
          <p className="max-w-[88px] m-0 text-[#9aa7b4] text-[11px] leading-tight truncate">
            Config Editor
          </p>
        </div>
      </div>

      <div className="flex flex-1 justify-end gap-1 overflow-x-auto">
        <button className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-[#212b37] text-[#e6edf3] bg-[#141a23]/90 hover:border-[#30404f] hover:bg-[#1a222c] transition-colors text-xs">
          <Sparkles className="w-[13px] h-[13px]" />
          <span>AI Formatter</span>
        </button>
      </div>
    </header>
  );
}
