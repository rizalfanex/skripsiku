'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Settings2, BookOpen,
  Zap, Brain, Star, RotateCcw, Copy, Check, MessageSquarePlus, ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import {
  AI_MODE_LABELS, LANGUAGE_LABELS, CITATION_STYLE_LABELS,
  TASK_TYPE_LABELS, DOCUMENT_TYPE_LABELS, cn,
} from '@/lib/utils';
import {
  AiMode, CitationStyle, DocumentType, Language, TaskType,
} from '@/lib/types';
import { ThinkingDots } from '@/components/ui/Spinner';

// ── Quick Actions ─────────────────────────────────────────────────────────────
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

// ── Thinking Panel ──────────────────────────────────────────────────────────
function ThinkingPanel({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(isStreaming ?? false);
  // Auto-open while streaming, keep whatever state after done
  useEffect(() => {
    if (isStreaming) setOpen(true);
  }, [isStreaming]);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Brain className="h-3 w-3 text-primary-400 flex-shrink-0" />
        <span className="flex-1 text-left">
          {isStreaming ? 'Sedang berpikir...' : 'Lihat proses berpikir'}
        </span>
        {isStreaming && <ThinkingDots />}
        <ChevronDown
          className={cn('h-3 w-3 ml-1 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-slate-500 max-h-64 overflow-y-auto scrollbar-hide border-t border-slate-200 pt-2">
          <div className="prose-academic opacity-80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
      title="Salin"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface ChatInterfaceProps {
  /** ID of an existing conversation to load & continue. Null = new conversation. */
  conversationId?: string | null;
  /** Called once the backend confirms a new conversation_id. */
  onConversationCreated?: (id: string) => void;
  /** Title shown in the top bar (e.g. conversation title or project name). */
  headerTitle?: string;
}

export function ChatInterface({ conversationId, onConversationCreated, headerTitle }: ChatInterfaceProps) {
  const router = useRouter();
  const {
    mode, language, citationStyle, documentType,
    setMode, setLanguage, setCitationStyle,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleConversationId = useCallback((id: string) => {
    onConversationCreated?.(id);
    // Stream is already complete when this fires, so navigation is safe.
    if (!conversationId) {
      router.replace(`/chat/${id}`);
    }
  }, [conversationId, onConversationCreated, router]);

  const handleTitleUpdate = useCallback((title: string) => {
    setCurrentTitle(title);
  }, []);

  const {
    messages, isLoading, activeStep, streamingContent,
    streamingThinking, isThinking,
    historyLoaded, sendMessage, stopGeneration, clearMessages, setTaskType,
  } = useChat({
    conversationId,
    onConversationId: handleConversationId,
    onTitleUpdate: handleTitleUpdate,
    onError: (msg) => toast.error(msg),
  });

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
    await sendMessage(`[${TASK_TYPE_LABELS[action.taskType].id}]\n\n${text}`, action.taskType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Top Bar ── */}
      <div className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="h-4 w-4 text-primary-500 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm truncate">
            {currentTitle ?? headerTitle ?? 'Skripsiku'}
          </span>
        </div>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 border',
            showSettings
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Pengaturan</span>
        </button>

        {/* New chat */}
        <button
          onClick={() => router.push(`/chat?n=${Date.now()}`)}
          className="btn-ghost text-xs px-3 py-2"
          title="Chat Baru"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
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
        {/* ── Chat Area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {/* Loading skeleton while fetching history */}
            {conversationId && !historyLoaded && (
              <div className="flex flex-col gap-4 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                    <div className="h-12 bg-slate-200 rounded-2xl animate-pulse w-64" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {historyLoaded && messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                  <BookOpen className="h-8 w-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Halo! Saya Skripsiku</h2>
                <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-8">
                  Asisten AI akademik Anda. Ketik pertanyaan, paste teks, atau pilih satu tool di bawah.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
                  {QUICK_ACTIONS.slice(0, 6).map((action) => (
                    <button
                      key={action.taskType}
                      onClick={() =>
                        setInput(`Paste teks Anda di sini untuk ${TASK_TYPE_LABELS[action.taskType].id.toLowerCase()}...`)
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 hover:text-slate-700 hover:border-indigo-200 transition-all text-left shadow-sm"
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
                  className={cn(msg.role === 'user' ? 'flex justify-end' : 'w-full')}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-indigo-50 border border-indigo-200 text-slate-800">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="w-full text-sm relative group">
                      {msg.thinkingContent && (
                        <ThinkingPanel content={msg.thinkingContent} />
                      )}
                      <div className={cn('prose-academic text-slate-800', msg.thinkingContent && 'mt-3')}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton content={msg.content} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming */}
              {isLoading && (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <div className="w-full text-sm">
                    {/* Thinking panel: shows steps 1 & 2 content during thinking_extended */}
                    {(isThinking || streamingThinking) && (
                      <ThinkingPanel content={streamingThinking} isStreaming={isThinking} />
                    )}

                    {/* Active step label when NOT in thinking phase (step 3 / final revision) */}
                    {activeStep && !isThinking && !streamingThinking && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                          <ThinkingDots />
                          <span className="text-xs text-indigo-600 font-medium">
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
                      <div className={cn('prose-academic text-slate-800', (isThinking || streamingThinking) && 'mt-3')}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        <span className="typing-cursor" />
                      </div>
                    ) : !isThinking && !streamingThinking ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <ThinkingDots />
                        <span className="text-xs">Sedang memproses...</span>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* ── Quick Actions Bar ── */}
          <div className="border-t border-slate-200 px-4 pt-3">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.taskType}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-500 hover:text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{action.icon}</span>
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Input ── */}
          <div className="border-t border-slate-200 p-4">

            {/* Mode selector — right above the textarea */}
            <div className="mb-2.5">
              <div className="flex items-center gap-1.5">
                {/* Fast button */}
                <button
                  onClick={() => setMode('instant')}
                  disabled={isLoading}
                  className={cn('mode-pill', mode === 'instant' && 'active')}
                  title={AI_MODE_LABELS.instant.description}
                >
                  <Zap className="h-3 w-3" />
                  <span>Cepat</span>
                </button>

                {/* Thinking group button */}
                <button
                  onClick={() => { if (mode === 'instant') setMode('thinking_standard'); }}
                  disabled={isLoading}
                  className={cn('mode-pill', (mode === 'thinking_standard' || mode === 'thinking_extended') && 'active')}
                  title="Mode berpikir mendalam"
                >
                  <Brain className="h-3 w-3" />
                  <span>Thinking</span>
                </button>

                <span className="ml-auto text-[11px] text-slate-400 hidden sm:block">
                  {AI_MODE_LABELS[mode].description}
                </span>
              </div>

              {/* Sub-toggle: only visible when Thinking is active */}
              {(mode === 'thinking_standard' || mode === 'thinking_extended') && (
                <div className="flex items-center gap-1 mt-1.5 ml-0.5">
                  <span className="text-[10px] text-slate-400 mr-1">Tingkat:</span>
                  <button
                    onClick={() => setMode('thinking_standard')}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                      mode === 'thinking_standard'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Brain className="h-2.5 w-2.5" />
                    Standard
                  </button>
                  <button
                    onClick={() => setMode('thinking_extended')}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                      mode === 'thinking_extended'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Star className="h-2.5 w-2.5" />
                    Extended
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <TextareaAutosize
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik atau paste teks akademik Anda... (Enter untuk kirim, Shift+Enter baris baru)"
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
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
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
              className="border-l border-slate-200 bg-white overflow-hidden flex-shrink-0"
            >
              <div className="p-5 w-[280px]">
                <h3 className="font-semibold text-slate-900 text-sm mb-5">Pengaturan Sesi</h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Bahasa Output</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Gaya Sitasi</label>
                    <select
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(CITATION_STYLE_LABELS) as [CitationStyle, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500">Jenis Dokumen</label>
                    <select
                      value={documentType}
                      onChange={(e) => useAppStore.getState().setDocumentType(e.target.value as DocumentType)}
                      className="input-field text-xs py-2"
                    >
                      {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, { id: string; en: string }][]).map(([v, l]) => (
                        <option key={v} value={v}>{l.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-medium text-slate-500 mb-3">Mode AI</p>
                    <div className="space-y-2">
                      {/* Fast */}
                      <button
                        onClick={() => setMode('instant')}
                        className={cn(
                          'w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200',
                          mode === 'instant' ? 'border-indigo-200 bg-indigo-50' : 'border-transparent hover:bg-slate-100'
                        )}
                      >
                        <Zap className={cn('h-4 w-4 mt-0.5 flex-shrink-0', AI_MODE_LABELS.instant.color)} />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Cepat</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{AI_MODE_LABELS.instant.description}</p>
                        </div>
                      </button>

                      {/* Thinking group */}
                      <button
                        onClick={() => { if (mode === 'instant') setMode('thinking_standard'); }}
                        className={cn(
                          'w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200',
                          (mode === 'thinking_standard' || mode === 'thinking_extended') ? 'border-indigo-200 bg-indigo-50' : 'border-transparent hover:bg-slate-100'
                        )}
                      >
                        <Brain className={cn('h-4 w-4 mt-0.5 flex-shrink-0', AI_MODE_LABELS.thinking_standard.color)} />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Thinking</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">Reasoning mendalam untuk tugas kompleks</p>
                        </div>
                      </button>

                      {/* Sub-options when Thinking is active */}
                      {(mode === 'thinking_standard' || mode === 'thinking_extended') && (
                        <div className="ml-3 pl-3 border-l-2 border-indigo-100 space-y-1.5">
                          <button
                            onClick={() => setMode('thinking_standard')}
                            className={cn(
                              'w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-all',
                              mode === 'thinking_standard' ? 'border-indigo-200 bg-white' : 'border-transparent hover:bg-slate-50'
                            )}
                          >
                            <Brain className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-indigo-500" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">Standard</p>
                              <p className="text-[10px] text-slate-400 leading-snug">{AI_MODE_LABELS.thinking_standard.description}</p>
                            </div>
                          </button>
                          <button
                            onClick={() => setMode('thinking_extended')}
                            className={cn(
                              'w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-all',
                              mode === 'thinking_extended' ? 'border-amber-200 bg-amber-50' : 'border-transparent hover:bg-slate-50'
                            )}
                          >
                            <Star className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">Extended</p>
                              <p className="text-[10px] text-slate-400 leading-snug">{AI_MODE_LABELS.thinking_extended.description}</p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-medium text-slate-500 mb-3">Workflow Akademik</p>
                    <div className="space-y-1.5">
                      {[
                        { taskType: 'thesis_title_generation' as TaskType, label: '🎯 Generator Judul' },
                        { taskType: 'literature_review_synthesis' as TaskType, label: '📚 Sintesis Tinjauan' },
                        { taskType: 'methodology_drafting' as TaskType, label: '⚗️ Draft Metodologi' },
                        { taskType: 'journal_upgrade' as TaskType, label: '⭐ Journal Upgrade' },
                        { taskType: 'rebuttal_letter' as TaskType, label: '📨 Balas Reviewer' },
                        { taskType: 'cover_letter' as TaskType, label: '✉️ Cover Letter' },
                      ].map(({ taskType, label }) => (
                        <button
                          key={taskType}
                          onClick={() => {
                            setTaskType(taskType);
                            toast.success(`Mode aktif: ${TASK_TYPE_LABELS[taskType].id}`);
                          }}
                          className="w-full text-left text-xs text-slate-500 hover:text-slate-700 px-2.5 py-2 rounded-lg hover:bg-slate-100 transition"
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
