import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AiMode, CitationStyle, Conversation, DocumentType, Language, Project,
  TaskType,
} from '@/lib/types';

interface AppState {
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

  // ── Conversation refresh trigger ───────────────────────────
  conversationRefreshAt: number;
  triggerConversationRefresh: () => void;

  // ── Sidebar conversations (source of truth for sidebar list) ──
  sidebarConversations: Conversation[];
  setSidebarConversations: (convs: Conversation[]) => void;
  upsertSidebarConversation: (conv: Partial<Conversation> & { id: string }) => void;
  removeSidebarConversation: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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

      // Conversation refresh
      conversationRefreshAt: 0,
      triggerConversationRefresh: () => set({ conversationRefreshAt: Date.now() }),

      // Sidebar conversations
      sidebarConversations: [],
      setSidebarConversations: (sidebarConversations) => set({ sidebarConversations }),
      upsertSidebarConversation: (conv) =>
        set((state) => {
          const exists = state.sidebarConversations.findIndex((c) => c.id === conv.id);
          if (exists >= 0) {
            const updated = [...state.sidebarConversations];
            updated[exists] = { ...updated[exists], ...conv };
            return { sidebarConversations: updated };
          }
          // Prepend new conversation with defaults for missing fields
          const now = new Date().toISOString();
          const newConv: Conversation = {
            title: null, project_id: null, mode: 'instant',
            task_type: 'general', language: 'id',
            created_at: now, updated_at: now,
            ...conv,
          };
          return { sidebarConversations: [newConv, ...state.sidebarConversations] };
        }),
      removeSidebarConversation: (id) =>
        set((state) => ({
          sidebarConversations: state.sidebarConversations.filter((c) => c.id !== id),
        })),
    }),
    {
      name: 'skripsiku-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        mode: state.mode,
        language: state.language,
        citationStyle: state.citationStyle,
        documentType: state.documentType,
        academicField: state.academicField,
      }),
    }
  )
);
