import type { GreenTextLanguageId } from '../data/languages';

export interface EditorBuffer {
  id: string;
  name: string;
  content: string;
  savedContent: string;
  language: GreenTextLanguageId;
  filePath: string | null;
  encoding: string;
  eol: string;
  readOnly: boolean;
  pinned: boolean;
  dirty: boolean;
}

export interface OpenedFile {
  path: string;
  name: string;
  content: string;
  encoding: string;
  eol: string;
  readOnly: boolean;
}

export interface SavedFile {
  path: string;
  name: string;
}

export interface ProjectFolder {
  root: string;
  files: ProjectFile[];
}

export interface ProjectFile {
  path: string;
  relativePath: string;
  size: number;
}

export interface ProjectFileGroup {
  directory: string;
  files: ProjectFile[];
}

export interface SearchResult {
  path: string;
  relativePath: string;
  lineNumber: number;
  line: string;
}

export interface AutomationDraft {
  title: string;
  content: string;
  count?: number;
}

export interface CommandAction {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export type ViewMode = 'edit' | 'split' | 'diff' | 'compare' | 'terminal' | 'vault' | 'mcp' | 'regex' | 'sftp' | 'help';
export type VisualTheme = 'neutral' | 'google' | 'greencli' | 'soft';
export type TabSortMode = 'manual' | 'name' | 'language' | 'dirty' | 'path';
export type ProjectSortMode = 'path' | 'name' | 'type' | 'size';

export interface OutlineEntry {
  label: string;
  detail: string;
  lineNumber: number;
  kind: number;
}
export interface TemplateDefinition {
  id: string;
  name: string;
  vendor: string;
  platform: string;
  category: string;
  description: string;
  language: GreenTextLanguageId;
  tags: string[];
  variables: string[];
  body: string;
}
