import axios from 'axios';
import {
  ChatRequest,
  Conversation,
  ConversationMessage,
  Project,
  ProjectCreate,
  TokenResponse,
  User,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post<TokenResponse>(`${BASE}/api/v1/auth/refresh`, {
          refresh_token: refresh,
        });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Guest mode — no redirect on auth failure
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; full_name: string; password: string; academic_level?: string }) =>
    api.post<TokenResponse>('/api/v1/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>('/api/v1/auth/login', data).then((r) => r.data),

  me: () => api.get<User>('/api/v1/auth/me').then((r) => r.data),

  updatePreferences: (prefs: Partial<User>) =>
    api.patch<User>('/api/v1/auth/me/preferences', prefs).then((r) => r.data),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get<Project[]>('/api/v1/projects').then((r) => r.data),

  create: (data: ProjectCreate) =>
    api.post<Project>('/api/v1/projects', data).then((r) => r.data),

  get: (id: string) => api.get<Project>(`/api/v1/projects/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<ProjectCreate>) =>
    api.patch<Project>(`/api/v1/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/api/v1/projects/${id}`),
};

// ── Chat (streaming) ──────────────────────────────────────────────────────────
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<{ type: string; content?: string; step?: string; model?: string; message?: string; conversation_id?: string; title?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const response = await fetch(`${BASE}/api/v1/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        yield JSON.parse(raw);
      } catch {
        // Skip malformed lines
      }
    }
  }
}

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversationsApi = {
  list: (projectId?: string) =>
    api
      .get<Conversation[]>('/api/v1/conversations', {
        params: projectId ? { project_id: projectId } : {},
      })
      .then((r) => r.data),

  messages: (conversationId: string) =>
    api
      .get<ConversationMessage[]>(`/api/v1/conversations/${conversationId}/messages`)
      .then((r) => r.data),

  update: (id: string, data: { title?: string; project_id?: string }) =>
    api
      .patch<{ id: string; title: string | null; project_id: string | null }>(
        `/api/v1/conversations/${id}`,
        data
      )
      .then((r) => r.data),

  delete: (id: string) => api.delete(`/api/v1/conversations/${id}`),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  export: async (projectId: string, format: 'markdown' | 'docx') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const res = await fetch(`${BASE}/api/v1/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ project_id: projectId, format }),
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const ext = format === 'docx' ? 'docx' : 'md';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skripsiku-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
