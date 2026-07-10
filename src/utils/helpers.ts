import type { EditorBuffer } from '../types';
import { detectLanguage, type GreenTextLanguageId } from '../data/languages';
import type { TemplateDefinition } from '../data/templates';

const RECOVERY_KEY = 'greentext_open_buffers_v1';
const RECENT_KEY = 'greentext_recent_files_v1';

const welcomeConfig = `! GreenCLI Native Settings Editor
! One cockpit for Aruba, Juniper & Mist
! This editor auto-detects syntax, formats configs, and manages state.

hostname GreenCLI-Central
ip route 0.0.0.0/0 10.0.0.1
interface 1/1/1
  no shutdown
  routing
  ip address 10.0.0.2/24

! Ready for your edits. Try Cmd+F to find or Cmd+I to format.`;

export function id(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function newBuffer(
  name = 'untitled',
  content = '',
  language?: GreenTextLanguageId,
): EditorBuffer {
  return {
    id: id(),
    name,
    content,
    savedContent: content,
    language: language ?? detectLanguage(name, content),
    filePath: null,
    encoding: 'UTF-8',
    eol: 'LF',
    readOnly: false,
    pinned: false,
    dirty: false,
  };
}

export function welcomeBuffer(): EditorBuffer {
  return newBuffer('welcome.arubacx', welcomeConfig, 'aruba-cx');
}

export function loadRecoveredBuffers(): EditorBuffer[] {
  if (typeof localStorage === 'undefined') return [welcomeBuffer()];
  const raw = localStorage.getItem(RECOVERY_KEY);
  if (!raw) return [welcomeBuffer()];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcomeBuffer()];
    return parsed
      .filter((buffer) => typeof buffer?.name === 'string' && typeof buffer?.content === 'string')
      .slice(0, 24)
      .map((buffer) => ({
        id: id(),
        name: buffer.name,
        content: buffer.content,
        savedContent: typeof buffer.savedContent === 'string' ? buffer.savedContent : buffer.content,
        language: detectLanguage(buffer.name, buffer.content),
        filePath: null,
        encoding: typeof buffer.encoding === 'string' ? buffer.encoding : 'UTF-8',
        eol: typeof buffer.eol === 'string' ? buffer.eol : 'LF',
        readOnly: Boolean(buffer.readOnly),
        pinned: Boolean(buffer.pinned),
        dirty: buffer.content !== (buffer.savedContent ?? buffer.content),
      }));
  } catch {
    return [welcomeBuffer()];
  }
}

export function loadRecentFiles(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(RECENT_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Recovery and recents are best-effort; editing must never crash because storage is full.
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export function countLines(text: string): number {
  if (!text) return 1;
  return text.split(/\r\n|\r|\n/).length;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function scanVariables(body: string): string[] {
  const matches = body.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((v) => v.slice(2, -2))));
}

export function uniqueTemplateVariables(template: TemplateDefinition): string[] {
  return Array.from(new Set([...template.variables, ...scanVariables(template.body)])).sort();
}

export function renderTemplateWithPromptedVariables(template: TemplateDefinition): string | null {
  let output = template.body;
  for (const variable of uniqueTemplateVariables(template)) {
    const value = window.prompt(`Value for {{${variable}}}`, variable.replaceAll('_', ' '));
    if (value === null) return null;
    output = output.replaceAll(`{{${variable}}}`, value);
  }
  return output;
}

export function conformToEol(content: string, buffer: EditorBuffer): string {
  const normalized = content.replace(/\r\n|\r/g, '\n');
  if (buffer.eol === 'CRLF') return normalized.replace(/\n/g, '\r\n');
  if (buffer.eol === 'CR') return normalized.replace(/\n/g, '\r');
  return normalized;
}

export function basename(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() || path;
}

export function dirname(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/[^/]*$/, '') || path;
}

export function extensionOf(path: string): string {
  return path.match(/\.([^.\\/]+)$/)?.[1]?.toLowerCase() ?? '';
}

export function directoryOf(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '.';
}
