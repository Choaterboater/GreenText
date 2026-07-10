import { useState } from 'react';
import { Server, Plug, Plus, Trash2, Edit2, Play, Square, Activity } from 'lucide-react';

export interface McpServerDef {
  name: string;
  transport: 'stdio' | 'http';
  command: string;
  args: string[];
  url?: string;
  enabled: boolean;
}

export function McpPanel() {
  const [servers, setServers] = useState<McpServerDef[]>([
    {
      name: 'GitHub',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      enabled: false,
    },
    {
      name: 'Local Dev',
      transport: 'stdio',
      command: 'node',
      args: ['/path/to/mcp-server/index.js'],
      enabled: true,
    }
  ]);

  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const toggleConnection = (name: string) => {
    setConnected(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const deleteServer = (name: string) => {
    setServers(prev => prev.filter(s => s.name !== name));
    setConnected(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-[#e6edf3]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#212b37] bg-[#0f141c]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-[#01a982]/10 text-[#01a982]">
            <Server size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">MCP Servers</h2>
            <p className="text-xs text-[#9aa7b4]">Model Context Protocol Integration</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#01a982]/45 text-[#01a982] hover:bg-[#01a982]/10 transition-colors text-sm font-semibold">
          <Plus size={16} />
          Add Server
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#5d6b7a]">
            <Activity size={48} className="mb-4 opacity-50" />
            <p>No MCP servers configured.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map(server => {
              const isConnected = connected[server.name] || false;
              
              return (
                <div key={server.name} className="flex flex-col p-4 rounded-lg border border-[#212b37] bg-[#141a23] hover:border-[#30404f] transition-colors group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#2ece8a] shadow-[0_0_8px_#2ece8a]' : 'bg-[#5d6b7a]'}`}></div>
                      <span className="font-semibold text-sm">{server.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a222c] border border-[#30404f] text-[#9aa7b4]">
                        {server.transport.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleConnection(server.name)}
                        className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                          isConnected 
                            ? 'text-[#f0533f] hover:bg-[#f0533f]/10' 
                            : 'text-[#2ece8a] hover:bg-[#2ece8a]/10'
                        }`}
                        title={isConnected ? "Disconnect" : "Connect"}
                      >
                        {isConnected ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
                      </button>
                      <button className="p-1.5 text-[#9aa7b4] hover:text-[#e6edf3] opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>
                      <button 
                        onClick={() => deleteServer(server.name)}
                        className="p-1.5 text-[#9aa7b4] hover:text-[#f0533f] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-xs p-2.5 rounded bg-[#0a0e14] border border-[#212b37] font-mono overflow-x-auto">
                    {server.transport === 'stdio' ? (
                      <span className="text-[#e6edf3] whitespace-nowrap">
                        <span className="text-[#01a982]">$</span> {server.command} {server.args.join(' ')}
                      </span>
                    ) : (
                      <span className="text-[#e6edf3] whitespace-nowrap">
                        <span className="text-[#01a982]">URL</span> {server.url || 'http://localhost'}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-[#9aa7b4]">
                    <Plug size={12} />
                    {isConnected ? 'Connected. Tools ready.' : 'Disconnected'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}