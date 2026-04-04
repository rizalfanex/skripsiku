// ── AI Modes ──────────────────────────────────────────────────────────────────
export type AiMode = 'instant' | 'thinking_standard' | 'thinking_extended';
export type Language = 'id' | 'en' | 'bilingual';
export type CitationStyle = 'apa' | 'ieee' | 'mla' | 'chicago' | 'harvard';
export type DocumentType =
  | 'thesis'
  | 'journal_article'
  | 'conference_paper'
  | 'abstract'
  | 'literature_review'
  | 'methodology'
  | 'other';

export type TaskType =
  | 'general'
  | 'thesis_title_generation'
  | 'problem_formulation'
  | 'research_gap_analysis'
  | 'research_novelty'
  | 'hypothesis_drafting'
  | 'conceptual_framework'
  | 'literature_review_synthesis'
  | 'methodology_drafting'
  | 'results_interpretation'
  | 'discussion_strengthening'
  | 'conclusion_improvement'
  | 'abstract_generation'
  | 'journal_upgrade'
  | 'cover_letter'
  | 'rebuttal_letter'
  | 'reviewer_simulation'
  | 'academic_rewrite'
  | 'grammar_correction'
  | 'paraphrasing'
  | 'expand_argument'
  | 'formalize_text'
  | 'reduce_similarity'
  | 'translate_id_to_en'
  | 'translate_en_to_id'
  | 'citation_formatting'
  | 'reference_cleanup'
  | 'originality_analysis';

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  preferred_language: Language;
  preferred_citation_style: CitationStyle;
  preferred_ai_mode: AiMode;
  academic_level: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ── Project ───────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  title: string;
  description: string;
  document_type: DocumentType;
  academic_field: string;
  academic_level: string;
  language: Language;
  citation_style: CitationStyle;
  ai_mode: AiMode;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  description?: string;
  document_type: DocumentType;
  academic_field?: string;
  academic_level?: string;
  language: Language;
  citation_style: CitationStyle;
  ai_mode: AiMode;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Accumulated thinking/reasoning steps (thinking_extended mode only). Hidden by default. */
  thinkingContent?: string;
}

export interface Message extends ChatMessage {
  id: string;
  model_used?: string;
  mode_used?: AiMode;
  task_type?: TaskType;
  created_at: string;
}

export interface StreamEvent {
  type: 'meta' | 'start' | 'chunk' | 'step_complete' | 'complete' | 'error';
  step?: string;
  model?: string;
  content?: string;
  data?: Record<string, unknown>;
  message?: string;
  conversation_id?: string;
}

export interface ChatRequest {
  project_id?: string;
  conversation_id?: string;
  messages: ChatMessage[];
  mode: AiMode;
  task_type: TaskType;
  language: Language;
  citation_style: CitationStyle;
  document_type: DocumentType;
  academic_field?: string;
  academic_level?: string;
  stream?: boolean;
}

// ── Conversations ─────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  title: string | null;
  project_id: string | null;
  mode: string;
  task_type: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  mode_used?: string;
  task_type?: string;
  created_at: string;
}

// ── UI ────────────────────────────────────────────────────────────────────────
export interface QuickAction {
  id: TaskType;
  label: string;
  labelId: string;
  description: string;
  icon: string;
  mode: AiMode;
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  documentType: DocumentType;
  tasks: TaskType[];
  icon: string;
  color: string;
}
