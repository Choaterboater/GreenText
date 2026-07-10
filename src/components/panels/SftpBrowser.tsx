import { useState } from 'react';
import { HardDrive, Server, Folder, File, ArrowLeft, Download, Upload, Trash2, FolderPlus, RefreshCw } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'dir' | 'file';
  size?: string;
  modified?: string;
  permissions?: string;
}

export function SftpBrowser() {
  const [currentPath] = useState('/var/log');
  const [selectedHost, setSelectedHost] = useState('');
  
  const dummyHosts = ['Core Router 1 (10.0.0.1)', 'Access Switch A (10.0.1.2)', 'Linux Server (192.168.1.10)'];
  const dummyFiles: FileNode[] = [
    { name: '..', type: 'dir' },
    { name: 'auth.log', type: 'file', size: '1.2 MB', modified: 'Oct 23 14:22', permissions: 'rw-r-----' },
    { name: 'syslog', type: 'file', size: '8.4 MB', modified: 'Oct 23 15:00', permissions: 'rw-r-----' },
    { name: 'dmesg', type: 'file', size: '2.1 MB', modified: 'Oct 22 09:15', permissions: 'rw-r-----' },
    { name: 'nginx', type: 'dir', modified: 'Oct 20 11:30', permissions: 'rwxr-xr-x' },
    { name: 'messages', type: 'file', size: '12 MB', modified: 'Oct 23 12:00', permissions: 'rw-r--r--' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-[#e6edf3]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#212b37] bg-[#0f141c]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-[#ff8300]/10 text-[#ff8300]">
            <HardDrive size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">SFTP Browser</h2>
            <p className="text-xs text-[#9aa7b4]">Remote file transfer over SSH</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedHost}
            onChange={(e) => setSelectedHost(e.target.value)}
            className="h-8 px-3 rounded border border-[#212b37] bg-[#141a23] text-sm focus:border-[#ff8300] outline-none"
          >
            <option value="" disabled>Select a connection...</option>
            {dummyHosts.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#ff8300]/45 text-[#ff8300] hover:bg-[#ff8300]/10 transition-colors text-sm font-semibold">
            <Server size={16} />
            Connect
          </button>
        </div>
      </header>

      {selectedHost ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#212b37] bg-[#141a23]">
            <button className="p-1.5 rounded hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3]">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 flex items-center h-8 px-3 border border-[#212b37] rounded bg-[#0a0e14] font-mono text-sm text-[#9aa7b4]">
              {currentPath}
            </div>
            <button className="p-1.5 rounded hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3]" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <div className="h-4 w-px bg-[#212b37] mx-1"></div>
            <button className="p-1.5 rounded hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3]" title="New Folder">
              <FolderPlus size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-[#1a222c] text-[#9aa7b4] hover:text-[#e6edf3]" title="Upload">
              <Upload size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto bg-[#0a0e14]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-[#0f141c] text-[#5d6b7a] shadow-[0_1px_0_#212b37]">
                <tr>
                  <th className="px-4 py-2 font-medium w-full">Name</th>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 font-medium">Modified</th>
                  <th className="px-4 py-2 font-medium">Permissions</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dummyFiles.map((file, i) => (
                  <tr key={i} className="border-b border-[#212b37]/50 hover:bg-[#1a222c] group cursor-pointer">
                    <td className="px-4 py-2 flex items-center gap-2">
                      {file.type === 'dir' ? <Folder size={16} className="text-[#01a982]" /> : <File size={16} className="text-[#9aa7b4]" />}
                      <span className={file.name === '..' ? 'text-[#01a982] font-bold' : 'text-[#e6edf3]'}>{file.name}</span>
                    </td>
                    <td className="px-4 py-2 text-[#9aa7b4]">{file.size || '--'}</td>
                    <td className="px-4 py-2 text-[#9aa7b4]">{file.modified || '--'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-[#5d6b7a]">{file.permissions || '--'}</td>
                    <td className="px-4 py-2 text-right">
                      {file.name !== '..' && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.type === 'file' && (
                            <button className="p-1.5 rounded text-[#9aa7b4] hover:text-[#2ece8a] hover:bg-[#2ece8a]/10" title="Download">
                              <Download size={14} />
                            </button>
                          )}
                          <button className="p-1.5 rounded text-[#9aa7b4] hover:text-[#f0533f] hover:bg-[#f0533f]/10" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#5d6b7a]">
          <Server size={48} className="mb-4 opacity-50" />
          <p>Select a host from your Vault to open the file browser.</p>
        </div>
      )}
    </div>
  );
}
