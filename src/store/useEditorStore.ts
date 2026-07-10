import { create } from 'zustand';
import type { EditorBuffer, ProjectFile, SearchResult, AutomationDraft, ViewMode, VisualTheme, TabSortMode, ProjectSortMode } from '../types';
import { loadRecoveredBuffers, loadRecentFiles, safeSetLocalStorage } from '../utils/helpers';

const RECOVERY_KEY = 'greentext_open_buffers_v1';

export interface AppState {
  buffers: EditorBuffer[];
  activeBufferId: string;
  setBuffers: (buffers: EditorBuffer[] | ((prev: EditorBuffer[]) => EditorBuffer[])) => void;
  setActiveBufferId: (id: string) => void;
  updateBuffer: (id: string, partial: Partial<EditorBuffer>) => void;
  
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;

  compareBufferId: string | null;
  setCompareBufferId: (id: string | null) => void;

  wordWrap: boolean;
  setWordWrap: (val: boolean | ((prev: boolean) => boolean)) => void;

  showMinimap: boolean;
  setShowMinimap: (val: boolean | ((prev: boolean) => boolean)) => void;

  showInvisibles: boolean;
  setShowInvisibles: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  indentSize: number;
  setIndentSize: (val: number) => void;

  fontSize: number;
  setFontSize: (val: number | ((prev: number) => number)) => void;

  autoFormat: boolean;
  setAutoFormat: (val: boolean | ((prev: boolean) => boolean)) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;

  inspectorOpen: boolean;
  setInspectorOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchFocusRequest: number;
  requestSearchFocus: () => void;

  statusMessage: string;
  setStatusMessage: (msg: string) => void;

  tabSortMode: TabSortMode;
  setTabSortMode: (val: TabSortMode) => void;

  projectSortMode: ProjectSortMode;
  setProjectSortMode: (val: ProjectSortMode) => void;

  groupProjectFiles: boolean;
  setGroupProjectFiles: (val: boolean | ((prev: boolean) => boolean)) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (val: boolean) => void;

  commandQuery: string;
  setCommandQuery: (val: string) => void;

  projectRoot: string | null;
  setProjectRoot: (val: string | null) => void;

  projectFiles: ProjectFile[];
  setProjectFiles: (val: ProjectFile[]) => void;

  projectFilter: string;
  setProjectFilter: (val: string) => void;

  recentFiles: string[];
  setRecentFiles: (val: string[] | ((prev: string[]) => string[])) => void;

  automationDraft: AutomationDraft | null;
  setAutomationDraft: (val: AutomationDraft | null) => void;

  projectSearchResults: SearchResult[];
  setProjectSearchResults: (val: SearchResult[]) => void;

  projectSearchTitle: string;
  setProjectSearchTitle: (val: string) => void;

  cursorPosition: { lineNumber: number, column: number };
  setCursorPosition: (val: { lineNumber: number, column: number }) => void;

  selectedTemplateId: string;
  setSelectedTemplateId: (val: string) => void;
}

const initialBuffers = loadRecoveredBuffers();

export const useEditorStore = create<AppState>((set) => ({
  buffers: initialBuffers,
  activeBufferId: initialBuffers[0].id,
  setBuffers: (updater) => {
    set((state) => {
      const newBuffers = typeof updater === 'function' ? updater(state.buffers) : updater;
      safeSetLocalStorage(RECOVERY_KEY, JSON.stringify(newBuffers));
      return { buffers: newBuffers };
    });
  },
  setActiveBufferId: (id) => set({ activeBufferId: id }),
  updateBuffer: (id, partial) => {
    set((state) => {
      const newBuffers = state.buffers.map((b) => (b.id === id ? { ...b, ...partial } : b));
      safeSetLocalStorage(RECOVERY_KEY, JSON.stringify(newBuffers));
      return { buffers: newBuffers };
    });
  },

  viewMode: 'edit',
  setViewMode: (viewMode) => set({ viewMode }),

  visualTheme: 'neutral',
  setVisualTheme: (visualTheme) => set({ visualTheme }),

  compareBufferId: null,
  setCompareBufferId: (compareBufferId) => set({ compareBufferId }),

  wordWrap: true,
  setWordWrap: (updater) => set((state) => ({ wordWrap: typeof updater === 'function' ? updater(state.wordWrap) : updater })),

  showMinimap: true,
  setShowMinimap: (updater) => set((state) => ({ showMinimap: typeof updater === 'function' ? updater(state.showMinimap) : updater })),

  showInvisibles: false,
  setShowInvisibles: (updater) => set((state) => ({ showInvisibles: typeof updater === 'function' ? updater(state.showInvisibles) : updater })),

  indentSize: 2,
  setIndentSize: (indentSize) => set({ indentSize }),

  fontSize: 13,
  setFontSize: (updater) => set((state) => ({ fontSize: typeof updater === 'function' ? updater(state.fontSize) : updater })),

  autoFormat: true,
  setAutoFormat: (updater) => set((state) => ({ autoFormat: typeof updater === 'function' ? updater(state.autoFormat) : updater })),

  sidebarOpen: false,
  setSidebarOpen: (updater) => set((state) => ({ sidebarOpen: typeof updater === 'function' ? updater(state.sidebarOpen) : updater })),

  inspectorOpen: false,
  setInspectorOpen: (updater) => set((state) => ({ inspectorOpen: typeof updater === 'function' ? updater(state.inspectorOpen) : updater })),
  searchFocusRequest: 0,
  requestSearchFocus: () => set((state) => ({ inspectorOpen: true, searchFocusRequest: state.searchFocusRequest + 1 })),

  statusMessage: 'GreenText is ready.',
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  tabSortMode: 'manual',
  setTabSortMode: (tabSortMode) => set({ tabSortMode }),

  projectSortMode: 'path',
  setProjectSortMode: (projectSortMode) => set({ projectSortMode }),

  groupProjectFiles: true,
  setGroupProjectFiles: (updater) => set((state) => ({ groupProjectFiles: typeof updater === 'function' ? updater(state.groupProjectFiles) : updater })),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

  commandQuery: '',
  setCommandQuery: (commandQuery) => set({ commandQuery }),

  projectRoot: null,
  setProjectRoot: (projectRoot) => set({ projectRoot }),

  projectFiles: [],
  setProjectFiles: (projectFiles) => set({ projectFiles }),

  projectFilter: '',
  setProjectFilter: (projectFilter) => set({ projectFilter }),

  recentFiles: loadRecentFiles(),
  setRecentFiles: (updater) => set((state) => ({ 
    recentFiles: typeof updater === 'function' ? updater(state.recentFiles) : updater 
  })),

  automationDraft: null,
  setAutomationDraft: (automationDraft) => set({ automationDraft }),

  projectSearchResults: [],
  setProjectSearchResults: (projectSearchResults) => set({ projectSearchResults }),

  projectSearchTitle: 'Project search',
  setProjectSearchTitle: (projectSearchTitle) => set({ projectSearchTitle }),

  cursorPosition: { lineNumber: 1, column: 1 },
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),

  selectedTemplateId: 'aruba-cx-base', // Will be overridden
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),
}));