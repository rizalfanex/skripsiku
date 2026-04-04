import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AiMode, CitationStyle, DocumentType, Language, Project,
  TaskType, User,
} from '@/lib/types';

interface AppState {
  // ── Auth ──────────────────────────────────────────────────
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // ── Active project (for project-scoped workspace) ─────────
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;

  // ── Session preferences ────────────────────────────────────
  mode: AiMode;
  language: Language;
  citationStyle: CitationStyle;
  documentType: DocumentType;
  taskType: TaskType;
  academicField: string;
  setMode: (mode: AiMode) => void;
  setLanguage: (lang: Language) => void;
  setCitationStyle: (style: CitationStyle) => void;
  setDocumentType: (type: DocumentType) => void;
  setTaskType: (task: TaskType) => void;
  setAcademicField: (field: string) => void;

  // ── UI state ──────────────────────────────────────────────
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;

  // ── Conversation signals (not persisted) ──────────────────
  conversationRefreshKey: number;
  newChatKey: number;
  triggerConversationRefresh: () => void;
  triggerNewChat: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, isAuthenticated: false, activeProject: null });
      },

      // Project
      activeProject: null,
      setActiveProject: (project) =>
        set({
          activeProject: project,
          ...(project
            ? {
                mode: project.ai_mode,
                language: project.language,
                citationStyle: project.citation_style,
                documentType: project.document_type,
              }
            : {}),
        }),

      // Preferences
      mode: 'instant',
      language: 'id',
      citationStyle: 'apa',
      documentType: 'thesis',
      taskType: 'general',
      academicField: '',
      setMode: (mode) => set({ mode }),
      setLanguage: (language) => set({ language }),
      setCitationStyle: (citationStyle) => set({ citationStyle }),
      setDocumentType: (documentType) => set({ documentType }),
      setTaskType: (taskType) => set({ taskType }),
      setAcademicField: (academicField) => set({ academicField }),

      // UI
      sidebarOpen: true,
      settingsPanelOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSettingsPanelOpen: (settingsPanelOpen) => set({ settingsPanelOpen }),

      // Conversation signals
      conversationRefreshKey: 0,
      newChatKey: 0,
      triggerConversationRefresh: () => set((s) => ({ conversationRefreshKey: s.conversationRefreshKey + 1 })),
      triggerNewChat: () => set((s) => ({ newChatKey: s.newChatKey + 1 })),
    }),
    {
      name: 'skripsiku-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mode: state.mode,
        language: state.language,
        citationStyle: state.citationStyle,
        documentType: state.documentType,
        academicField: state.academicField,
      }),
    }
  )
);
