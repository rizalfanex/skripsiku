'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Settings2, BookOpen, Download,
  Zap, Brain, Star, RotateCcw, Copy, Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import { projectsApi, exportApi } from '@/lib/api';
import {
  AI_MODE_LABELS, LANGUAGE_LABELS, CITATION_STYLE_LABELS,
  TASK_TYPE_LABELS, DOCUMENT_TYPE_LABELS, cn,
} from '@/lib/utils';
import {
  AiMode, CitationStyle, DocumentType, Language, TaskType,
} from '@/lib/types';
import { ThinkingDots } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

// ── Quick Actions that appear above the input ─────────────────────────────────
const QUICK_ACTIONS: { taskType: TaskType; label: string; icon: string; mode: AiMode }[] = [
  { taskType: 'academic_rewrite', label: 'Tulis Ulang', icon: '✍️', mode: 'instant' },
  { taskType: 'grammar_correction', label: 'Grammar Check', icon: '✅', mode: 'instant' },
  { taskType: 'paraphrasing', label: 'Parafrase', icon: '🔄', mode: 'instant' },
  { taskType: 'reduce_similarity', label: 'Kurangi Kemiripan', icon: '🛡️', mode: 'instant' },
  { taskType: 'expand_argument', label: 'Kembangkan Argumen', icon: '🚀', mode: 'thinking_standard' },
  { taskType: 'research_gap_analysis', label: 'Analisis Celah', icon: '🔍', mode: 'thinking_standard' },
  { taskType: 'discussion_strengthening', label: 'Perkuat Diskusi', icon: '💪', mode: 'thinking_standard' },
  { taskType: 'abstract_generation', label: 'Buat Abstrak', icon: '📝', mode: 'instant' },
  { taskType: 'translate_id_to_en', label: 'Terjemahkan ID→EN', icon: '🌐', mode: 'instant' },
  { taskType: 'translate_en_to_id', label: 'Terjemahkan EN→ID', icon: '🇮🇩', mode: 'instant' },
  { taskType: 'journal_upgrade', label: 'Journal Upgrade', icon: '⭐', mode: 'thinking_extended' },
  { taskType: 'reviewer_simulation', label: 'Simulasi Reviewer', icon: '🎓', mode: 'thinking_extended' },
  { taskType: 'citation_formatting', label: 'Format Sitasi', icon: '📚', mode: 'instant' },
  { taskType: 'originality_analysis', label: 'Cek Orisinalitas', icon: '🛡️', mode: 'thinking_standard' },
];

const MODE_ICONS: Record<AiMode, React.ComponentType<{ className?: string }>> = {
  instant: Zap,
  thinking_standard: Brain,
  thinking_extended: Star,
};

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition"
      title="Salin"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    user,
    mode, language, citationStyle, documentType,
    setMode, setLanguage, setCitationStyle,
    setActiveProject,
    activeProject,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, activeStep, streamingContent, sendMessage, stopGeneration, clearMessages, setTaskType } = useChat({
    onError: (msg) => toast.error(msg),
  });

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      projectsApi.get(projectId)
        .then((p) => {
          setActiveProject(p);
        })
        .catch(() => router.push('/projects'));
    }
  }, [projectId, setActiveProject, router]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    const text = input.trim();
    if (!text) {
      toast.error('Paste atau ketik teks yang ingin Anda proses terlebih dahulu');
      return;
    }
    setTaskType(action.taskType);
    setInput('');
    const prompt = `[${TASK_TYPE_LABELS[action.taskType].id}]\n\n${text}`;
    await sendMessage(prompt, action.taskType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const ModeIcon = MODE_ICONS[mode];

  return (
    <div className="flex h-full flex-col">
      {/* ── Top Bar ── */}
      <div className="flex h-14 items-center gap-4 border-b border-primary-500/10 px-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="h-4 w-4 text-primary-500 flex-shrink-0" />
          <span className="font-semibold text-white text-sm truncate">
            {activeProject?.title ?? 'Workspace'}
          </span>
          {activeProject && (
            <Badge variant="neutral" className="text-xs flex-shrink-0">
              {DOCUMENT_TYPE_LABELS[activeProject.document_type as DocumentType]?.id}
            </Badge>
          )}
        </div>

        {/* Mode pills */}
        <div className="flex items-center gap-1 bg-navy-800 rounded-xl p-1 border border-primary-500/10">
          {(Object.entries(AI_MODE_LABELS) as [AiMode, (typeof AI_MODE_LABELS)[AiMode]][]).map(([m, info]) => {
            const Icon = MODE_ICONS[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn('mode-pill', mode === m && 'active')}
                title={info.description}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{info.labelId}</span>
              </button>
            );
          })}
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 border',
            showSettings
              ? 'bg-primary-500/10 text-primary-300 border-primary-500/30'
              : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Pengaturan</span>
        </button>

        {/* Export */}
        <button
          onClick={() => exportApi.export(projectId, 'markdown')}
          className="btn-ghost text-xs px-3 py-2"
          title="Ekspor sebagai Markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Clear */}
        <button
          onClick={clearMessages}
          className="btn-ghost text-xs px-3 py-2"
          title="Bersihkan percakapan"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Chat ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-8 w-8 text-primary-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Halo! Saya Skripsiku
                </h2>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-8">
                  Asisten AI akademik Anda. Paste teks yang ingin Anda kerjakan, atau pilih satu
                  tool di bawah untuk mulai. Saya siap membantu skripsi, tesis, atau jurnal Anda.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
                  {QUICK_ACTIONS.slice(0, 6).map((action) => (
                    <button
                      key={action.taskType}
                      onClick={() => {
                        setInput('');
                        const placeholder = `Paste teks Anda di sini untuk ${TASK_TYPE_LABELS[action.taskType].id.toLowerCase()}...`;
                        setInput(placeholder);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-800 border border-primary-500/10 text-xs text-slate-400 hover:text-slate-200 hover:border-primary-500/30 transition-all text-left"
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-2xl rounded-2xl px-4 py-3 text-sm relative group',
                    msg.role === 'user'
                      ? 'bg-primary-500/15 border border-primary-500/20 text-slate-200 rounded-tr-sm'
                      : 'bg-navy-800 border border-primary-500/10 rounded-tl-sm'
                  )}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        <div className="prose-academic">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton content={msg.content} />
                        </div>
                      </>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                      {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming message */}
              {isLoading && (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center animate-pulse-slow">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-navy-800 border border-primary-500/10 px-4 py-3 text-sm flex-1">
                    {activeStep && (
                      <div className="flex items-center gap-2 mb-3 step-badge">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                          <ThinkingDots />
                          <span className="text-xs text-primary-300 font-medium">
                            {activeStep === 'initial_draft' ? 'Menyusun draf...' :
                             activeStep === 'academic_reasoning' ? 'Analisis akademik mendalam...' :
                             activeStep === 'final_revision' ? 'Mempoles hasil akhir...' :
                             activeStep === 'deep_analysis' ? 'Berpikir mendalam...' :
                             'Memproses...'}
                          </span>
                        </div>
                      </div>
                    )}
                    {streamingContent ? (
                      <div className="prose-academic">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                        <span className="typing-cursor" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <ThinkingDots />
                        <span className="text-xs">Sedang memproses...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* ── Quick Actions Bar ── */}
          <div className="border-t border-primary-500/10 px-4 pt-3">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.taskType}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-500/10 bg-navy-800 text-xs text-slate-400 hover:text-slate-200 hover:border-primary-500/25 hover:bg-primary-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{action.icon}</span>
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Input Area ── */}
          <div className="border-t border-primary-500/10 p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <TextareaAutosize
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik atau paste teks akademik Anda... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                  className="w-full input-field resize-none min-h-[52px] max-h-[280px] pr-4 leading-relaxed"
                  minRows={2}
                  maxRows={10}
                  disabled={isLoading}
                />
              </div>
              {isLoading ? (
                <button
                  onClick={stopGeneration}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition"
                  title="Hentikan"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mode indicator */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <ModeIcon className={cn('h-3 w-3', AI_MODE_LABELS[mode].color)} />
              <span className="text-xs text-slate-500">
                Mode: <span className={AI_MODE_LABELS[mode].color}>{AI_MODE_LABELS[mode].labelId}</span>
                {' · '}
                <span className="text-slate-600">{AI_MODE_LABELS[mode].description}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        <AnimatePresence>
          {showSettings && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-primary-500/10 bg-navy-900 overflow-hidden flex-shrink-0"
            >
              <div className="p-5 w-[280px]">
                <h3 className="font-semibold text-white text-sm mb-5">Pengaturan Sesi</h3>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Bahasa Output</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
                        <option key={v} value={v} className="bg-navy-800">{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Gaya Sitasi</label>
                    <select
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(CITATION_STYLE_LABELS) as [CitationStyle, string][]).map(([v, l]) => (
                        <option key={v} value={v} className="bg-navy-800">{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Jenis Dokumen</label>
                    <select
                      value={documentType}
                      onChange={(e) => useAppStore.getState().setDocumentType(e.target.value as DocumentType)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, { id: string; en: string }][]).map(([v, l]) => (
                        <option key={v} value={v} className="bg-navy-800">{l.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-primary-500/10 pt-4">
                    <p className="text-xs font-medium text-slate-400 mb-3">Mode AI</p>
                    <div className="space-y-2">
                      {(Object.entries(AI_MODE_LABELS) as [AiMode, (typeof AI_MODE_LABELS)[AiMode]][]).map(([m, info]) => {
                        const Icon = MODE_ICONS[m];
                        return (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                              'w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200',
                              mode === m
                                ? 'border-primary-500/30 bg-primary-500/10'
                                : 'border-transparent hover:bg-white/5'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', info.color)} />
                            <div>
                              <p className="text-xs font-semibold text-white">{info.labelId}</p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{info.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-primary-500/10 pt-4">
                    <p className="text-xs font-medium text-slate-400 mb-3">Workflow Akademik</p>
                    <div className="space-y-1.5">
                      {[
                        { taskType: 'thesis_title_generation' as TaskType, label: '🎯 Generator Judul Penelitian' },
                        { taskType: 'literature_review_synthesis' as TaskType, label: '📚 Sintesis Tinjauan Pustaka' },
                        { taskType: 'methodology_drafting' as TaskType, label: '⚗️ Draft Metodologi' },
                        { taskType: 'journal_upgrade' as TaskType, label: '⭐ Journal Upgrade' },
                        { taskType: 'rebuttal_letter' as TaskType, label: '📨 Balas Reviewer' },
                        { taskType: 'cover_letter' as TaskType, label: '✉️ Cover Letter Jurnal' },
                      ].map(({ taskType, label }) => (
                        <button
                          key={taskType}
                          onClick={() => {
                            setTaskType(taskType);
                            toast.success(`Mode aktif: ${TASK_TYPE_LABELS[taskType].id}`);
                          }}
                          className="w-full text-left text-xs text-slate-400 hover:text-slate-200 px-2.5 py-2 rounded-lg hover:bg-white/5 transition"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
