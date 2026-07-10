import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalTabProps {
  isActive: boolean;
}

export function TerminalTab({ isActive }: TerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#0a0e14',
        foreground: '#e6edf3',
        cursor: '#01a982',
        selectionBackground: 'rgba(1, 169, 130, 0.3)',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('\x1b[1;32mGreenCLI Terminal initialized.\x1b[0m');
    term.writeln('SSH/Telnet backend is not connected yet.');
    term.writeln('');
    term.write('$ ');

    term.onData((data) => {
      if (data === '\r') {
        term.writeln('');
        term.write('$ ');
      } else if (data === '\x7F') { // Backspace
        term.write('\b \b');
      } else {
        term.write(data);
      }
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isActive]);

  return (
    <div 
      className="w-full h-full p-2 bg-[#0a0e14]" 
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
