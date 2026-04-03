import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AiMode, CitationStyle, DocumentType, Language, TaskType } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateStr);
}

export const AI_MODE_LABELS: Record<AiMode, { label: string; labelId: string; description: string; color: string }> = {
  instant: {
    label: 'Instant',
    labelId: 'Cepat',
    description: 'Fast drafting, editing, translation, grammar fix',
    color: 'text-emerald-400',
  },
  thinking_standard: {
    label: 'Thinking',
    labelId: 'Analitik',
    description: 'Research gap, novelty, methodology, lit review synthesis',
    color: 'text-primary-400',
  },
  thinking_extended: {
    label: 'Deep Think',
    labelId: 'Mendalam',
    description: 'Complex reasoning, journal upgrade, full review simulation',
    color: 'text-gold-400',
  },
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  id: '🇮🇩 Bahasa Indonesia',
  en: '🇬🇧 English',
  bilingual: '🌐 Bilingual',
};

export const CITATION_STYLE_LABELS: Record<CitationStyle, string> = {
  apa: 'APA 7th Ed.',
  ieee: 'IEEE',
  mla: 'MLA 9th Ed.',
  chicago: 'Chicago 17th',
  harvard: 'Harvard',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { en: string; id: string }> = {
  thesis: { en: 'Thesis / Dissertation', id: 'Skripsi / Tesis / Disertasi' },
  journal_article: { en: 'Journal Article', id: 'Artikel Jurnal' },
  conference_paper: { en: 'Conference Paper', id: 'Makalah Konferensi' },
  abstract: { en: 'Abstract', id: 'Abstrak' },
  literature_review: { en: 'Literature Review', id: 'Tinjauan Pustaka' },
  methodology: { en: 'Methodology', id: 'Metodologi' },
  other: { en: 'Other', id: 'Lainnya' },
};

export const TASK_TYPE_LABELS: Record<TaskType, { en: string; id: string }> = {
  general: { en: 'General', id: 'Umum' },
  thesis_title_generation: { en: 'Title Generation', id: 'Judul Penelitian' },
  problem_formulation: { en: 'Problem Formulation', id: 'Rumusan Masalah' },
  research_gap_analysis: { en: 'Research Gap Analysis', id: 'Analisis Celah Penelitian' },
  research_novelty: { en: 'Research Novelty', id: 'Kebaruan Penelitian' },
  hypothesis_drafting: { en: 'Hypothesis', id: 'Hipotesis' },
  conceptual_framework: { en: 'Conceptual Framework', id: 'Kerangka Konseptual' },
  literature_review_synthesis: { en: 'Literature Review', id: 'Tinjauan Pustaka' },
  methodology_drafting: { en: 'Methodology', id: 'Metodologi' },
  results_interpretation: { en: 'Results Interpretation', id: 'Interpretasi Hasil' },
  discussion_strengthening: { en: 'Strengthen Discussion', id: 'Perkuat Diskusi' },
  conclusion_improvement: { en: 'Improve Conclusion', id: 'Perbaiki Kesimpulan' },
  abstract_generation: { en: 'Generate Abstract', id: 'Buat Abstrak' },
  journal_upgrade: { en: 'Journal Upgrade', id: 'Tingkatkan ke Jurnal' },
  cover_letter: { en: 'Cover Letter', id: 'Surat Pengantar' },
  rebuttal_letter: { en: 'Rebuttal Letter', id: 'Surat Balasan Reviewer' },
  reviewer_simulation: { en: 'Reviewer Simulation', id: 'Simulasi Reviewer' },
  academic_rewrite: { en: 'Academic Rewrite', id: 'Tulis Ulang Akademik' },
  grammar_correction: { en: 'Grammar Check', id: 'Periksa Tata Bahasa' },
  paraphrasing: { en: 'Paraphrase', id: 'Parafrase' },
  expand_argument: { en: 'Expand Argument', id: 'Kembangkan Argumen' },
  formalize_text: { en: 'Formalize', id: 'Formalkan' },
  reduce_similarity: { en: 'Reduce Similarity', id: 'Kurangi Kemiripan' },
  translate_id_to_en: { en: 'Translate ID → EN', id: 'Terjemahkan ID → EN' },
  translate_en_to_id: { en: 'Translate EN → ID', id: 'Terjemahkan EN → ID' },
  citation_formatting: { en: 'Format Citations', id: 'Format Sitasi' },
  reference_cleanup: { en: 'Clean References', id: 'Bersihkan Daftar Pustaka' },
  originality_analysis: { en: 'Originality Check', id: 'Periksa Orisinalitas' },
};

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
