import { useState } from 'react';
import { Lock, Plus, Key, Server, Trash2, Edit } from 'lucide-react';

export interface VaultCredential {
  id: string;
  name: string;
  type: 'ssh' | 'api' | 'password';
  username?: string;
  secret: string; // password or token
  host?: string;
}

export function VaultPanel() {
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword === 'demo') { // Dummy for now
      setIsUnlocked(true);
    } else {
      alert('Wrong password. Use "demo" for testing.');
    }
  };

  const addDummyCred = () => {
    setCredentials([...credentials, {
      id: crypto.randomUUID(),
      name: 'Core Router SSH',
      type: 'ssh',
      username: 'admin',
      secret: 'secret123',
      host: '10.0.0.1'
    }]);
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0e14] text-[#e6edf3] p-6">
        <div className="flex flex-col items-center p-8 border border-[#212b37] rounded-xl bg-[#0f141c] max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#01a982]/10 text-[#01a982] flex items-center justify-center mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Encrypted Vault</h2>
          <p className="text-sm text-[#9aa7b4] text-center mb-6">Enter your master password to unlock credentials and API keys.</p>
          
          <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Master Password" 
              className="w-full h-10 px-3 border border-[#212b37] rounded-md bg-[#141a23] focus:border-[#01a982] outline-none transition-colors"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
            />
            <button type="submit" className="h-10 rounded-md bg-gradient-to-r from-[#01a982] to-[#018f6e] text-[#04130e] font-bold">
              Unlock Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-[#e6edf3]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#212b37] bg-[#0f141c]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-[#01a982]/10 text-[#01a982]">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Credential Vault</h2>
            <p className="text-xs text-[#9aa7b4]">AES-256-GCM Encrypted</p>
          </div>
        </div>
        <button onClick={addDummyCred} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#01a982]/45 text-[#01a982] hover:bg-[#01a982]/10 transition-colors text-sm font-semibold">
          <Plus size={16} />
          Add Credential
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#5d6b7a]">
            <Key size={48} className="mb-4 opacity-50" />
            <p>Your vault is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {credentials.map(cred => (
              <div key={cred.id} className="flex flex-col p-4 rounded-lg border border-[#212b37] bg-[#141a23] hover:border-[#30404f] transition-colors group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {cred.type === 'ssh' ? <Server size={16} className="text-[#ff8300]" /> : <Key size={16} className="text-[#01a982]" />}
                    <span className="font-semibold text-sm">{cred.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-[#9aa7b4] hover:text-[#e6edf3]"><Edit size={14}/></button>
                    <button className="p-1 text-[#9aa7b4] hover:text-[#f0533f]"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  {cred.username && (
                    <div className="flex justify-between">
                      <span className="text-[#5d6b7a]">User</span>
                      <span className="text-[#e6edf3]">{cred.username}</span>
                    </div>
                  )}
                  {cred.host && (
                    <div className="flex justify-between">
                      <span className="text-[#5d6b7a]">Host</span>
                      <span className="text-[#e6edf3]">{cred.host}</span>
                    </div>
                  )}
                  <div className="flex justify-between mt-1 pt-2 border-t border-[#212b37]">
                    <span className="text-[#5d6b7a]">Secret</span>
                    <span className="text-[#9aa7b4] font-mono tracking-widest">••••••••</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
