'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Settings2, BookOpen,
  Zap, Brain, Star, Copy, Check, ChevronDown, X, Globe, FileText, Quote, Cpu, Paperclip,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import { filesApi } from '@/lib/api';
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
// ── Typewriter Empty State ───────────────────────────────────────────────────
const ROTATING_PROMPTS = [
  'Tulis ulang paragraf ini agar terdengar lebih akademis dan formal.',
  'Identifikasi celah penelitian dari tinjauan pustaka berikut.',
  'Perkuat pernyataan kebaruan (novelty) dalam pendahuluan saya.',
  'Perbaiki bagian metodologi agar lebih sistematis dan terstruktur.',
  'Buat abstrak jurnal dari bab hasil dan pembahasan saya.',
  'Tajamkan judul skripsi agar lebih spesifik dan bernilai ilmiah.',
  'Perkuat argumen dalam bagian diskusi penelitian saya.',
  'Poles simpulan agar lebih padat, tegas, dan berdampak.',
  'Tingkatkan koherensi antara pendahuluan, metode, dan temuan.',
  'Parafraskan kalimat ini agar lebih orisinal dan ilmiah.',
];

const TYPING_SPEED = 38;
const DELETE_SPEED  = 22;
const PAUSE_AFTER   = 2200;
const PAUSE_BEFORE  = 400;

function EmptyState() {
  const [displayed, setDisplayed] = useState('');
  const [promptIdx, setPromptIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting' | 'waiting'>('typing');
  const [caretVisible, setCaretVisible] = useState(true);

  // Caret blink
  useEffect(() => {
    const id = setInterval(() => setCaretVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const target = ROTATING_PROMPTS[promptIdx];

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        const id = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), TYPING_SPEED);
        return () => clearTimeout(id);
      } else {
        const id = setTimeout(() => setPhase('pausing'), PAUSE_AFTER);
        return () => clearTimeout(id);
      }
    }

    if (phase === 'pausing') {
      const id = setTimeout(() => setPhase('deleting'), 0);
      return () => clearTimeout(id);
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const id = setTimeout(() => setDisplayed((d) => d.slice(0, -1)), DELETE_SPEED);
        return () => clearTimeout(id);
      } else {
        const id = setTimeout(() => {
          setPromptIdx((i) => (i + 1) % ROTATING_PROMPTS.length);
          setPhase('typing');
        }, PAUSE_BEFORE);
        return () => clearTimeout(id);
      }
    }
  }, [displayed, phase, promptIdx]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 select-none">
      {/* Headline */}
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
        Selamat datang di <span className="text-indigo-500">Skripsiku</span>
      </h2>
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-10">
        Asisten akademik AI untuk mahasiswa. Tulis, analisis, perbaiki, dan sempurnakan karya ilmiah Anda.
      </p>

      {/* Typewriter prompt */}
      <div className="w-full max-w-lg min-h-[3rem] flex items-center justify-center">
        <p className="text-[15px] text-slate-500 leading-relaxed font-normal">
          {displayed}
          <span
            className="inline-block w-[1.5px] h-[1.1em] bg-indigo-400 ml-[2px] align-middle"
            style={{ opacity: caretVisible ? 1 : 0, transition: 'opacity 0.1s' }}
          />
        </p>
      </div>

      {/* Tagline */}
      <p className="mt-12 text-[11px] text-slate-300 tracking-widest uppercase font-medium">
        Powered by <span className="text-indigo-300">Rizalfanex</span>&nbsp;&nbsp;·&nbsp;&nbsp;Designed for Academics
      </p>
    </div>
  );
}

// ── Thinking Drawer (slide-in side panel) ───────────────────────────────────
interface ThinkingDrawerProps {
  content: string;
  isStreaming?: boolean;
  open: boolean;
  onClose: () => void;
  durationMs: number;
}

function ThinkingDrawer({ content, isStreaming, open, onClose, durationMs }: ThinkingDrawerProps) {
  const fmt = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 flex-1">
                <Brain className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {isStreaming ? 'Sedang berpikir...' : 'Proses berpikir'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {isStreaming
                      ? <><span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse mr-1" />{fmt(durationMs)}</>
                      : durationMs > 0 ? `Selesai dalam ${fmt(durationMs)}` : 'Selesai'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 text-xs text-slate-600 leading-relaxed scrollbar-hide">
              {content ? (
                <div className="prose-academic opacity-90">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS as any}>{content}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 mt-4">
                  <ThinkingDots />
                  <span>Menunggu konten berpikir...</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Thinking Chip (inline trigger) ──────────────────────────────────────────
function ThinkingChip({ isStreaming, onClick }: { isStreaming?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all mb-2',
        isStreaming
          ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      )}
    >
      <Brain className="h-3 w-3 flex-shrink-0" />
      {isStreaming ? (
        <><ThinkingDots /><span className="ml-0.5">Berpikir...</span></>
      ) : (
        <span>Lihat proses berpikir</span>
      )}
    </button>
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

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') ?? '';
  const code = String(children ?? '').trimEnd();

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{lang || 'code'}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Tersalin!</span></>
            : <><Copy className="h-3.5 w-3.5" /><span>Salin kode</span></>}
        </button>
      </div>
      {/* Code content */}
      <pre className="overflow-x-auto px-4 py-3 text-slate-100 font-mono text-xs leading-relaxed scrollbar-hide">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const MD_COMPONENTS = {
  code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[0.85em]" {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
};

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
    settingsPanelOpen, setSettingsPanelOpen,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ fileId: string; filename: string; charCount: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Thinking drawer state ──────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Content shown in drawer: null = streaming thinking, index = past message
  const [drawerContent, setDrawerContent] = useState<{ content: string; durationMs: number } | null>(null);
  // Real-time timer while streaming
  const thinkingStartRef = useRef<number | null>(null);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastThinkingDurationRef = useRef<number>(0);

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

  // Start timer when AI starts thinking (isThinking becomes true)
  useEffect(() => {
    if (isThinking) {
      thinkingStartRef.current = Date.now();
      setThinkingElapsedMs(0);
      timerRef.current = setInterval(() => {
        setThinkingElapsedMs(Date.now() - (thinkingStartRef.current ?? Date.now()));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (thinkingStartRef.current) {
        const dur = Date.now() - thinkingStartRef.current;
        setThinkingElapsedMs(dur);
        lastThinkingDurationRef.current = dur;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isThinking]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await filesApi.upload(file);
      setAttachment({ fileId: result.file_id, filename: result.filename, charCount: result.char_count });
      toast.success(`File "${result.filename}" berhasil dibaca`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Gagal membaca file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (attachment) {
      await filesApi.delete(attachment.fileId).catch(() => {});
      setAttachment(null);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !attachment) || isLoading) return;
    setInput('');

    let fullMessage = text;
    if (attachment) {
      try {
        const { text: fileText } = await filesApi.getText(attachment.fileId);
        fullMessage = `[File: ${attachment.filename}]\n\n${fileText}\n\n---\n\n${text || 'Tolong analisis dan beri penjelasan mengenai dokumen ini.'}`;
      } catch {
        toast.error('File sudah kedaluwarsa, silakan unggah ulang');
        setAttachment(null);
        return;
      }
      setAttachment(null);
    }

    await sendMessage(fullMessage);
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
          <span className="font-semibold text-slate-900 text-sm truncate">
            {currentTitle ?? headerTitle ?? 'Skripsiku'}
          </span>
        </div>


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
              <EmptyState />
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
                        <ThinkingChip
                          onClick={() => {
                            setDrawerContent({ content: msg.thinkingContent!, durationMs: lastThinkingDurationRef.current });
                            setDrawerOpen(true);
                          }}
                        />
                      )}
                      <div className={cn('prose-academic text-slate-800', msg.thinkingContent && 'mt-3')}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS as any}>{msg.content}</ReactMarkdown>
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
                    {/* Thinking chip: opens drawer with live content */}
                    {(isThinking || streamingThinking) && (
                      <ThinkingChip
                        isStreaming={isThinking}
                        onClick={() => {
                          setDrawerContent(null); // null = use live streaming content
                          setDrawerOpen(true);
                        }}
                      />
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
                        {activeStep && activeStep !== 'main' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-500 font-medium">
                              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse inline-block" />
                              {activeStep === 'deep_analysis' ? 'Mode Analitik' :
                               activeStep === 'final_revision' ? 'Menyempurnakan...' :
                               'Thinking'}
                            </div>
                          </div>
                        )}
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS as any}>{streamingContent}</ReactMarkdown>
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

          {/* ── Input ── */}
          <div className="px-4 pb-5 pt-3 bg-slate-50">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            {/* Pill container */}
            <div className={cn(
              'mx-auto w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-sm transition-shadow duration-200',
              'focus-within:shadow-md focus-within:border-slate-300'
            )}>
              {/* Attachment badge */}
              {attachment && (
                <div className="flex items-center gap-2 px-5 pt-3">
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 max-w-xs">
                    <FileText className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs text-indigo-700 font-medium truncate">{attachment.filename}</span>
                    <span className="text-[10px] text-indigo-400 flex-shrink-0">{(attachment.charCount / 1000).toFixed(1)}k chars</span>
                    <button onClick={handleRemoveAttachment} className="text-indigo-300 hover:text-indigo-500 transition flex-shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              {/* Textarea */}
              <div className="px-5 pt-4">
                <TextareaAutosize
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik atau paste teks akademik Anda..."
                  className="w-full resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none leading-relaxed"
                  minRows={2}
                  maxRows={10}
                  disabled={isLoading}
                />
              </div>

              {/* Bottom bar: mode pills left, send/stop right */}
              <div className="flex items-center gap-2 px-4 pb-3 pt-2">
                {/* Mode pills */}
                <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                  <button
                    onClick={() => setMode('instant')}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                      mode === 'instant'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Zap className="h-3 w-3" />
                    Cepat
                  </button>

                  <button
                    onClick={() => { if (mode === 'instant') setMode('thinking_standard'); }}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                      (mode === 'thinking_standard' || mode === 'thinking_extended')
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Brain className="h-3 w-3" />
                    Thinking
                  </button>

                  {/* Sub-toggle Standard / Extended */}
                  {(mode === 'thinking_standard' || mode === 'thinking_extended') && (
                    <>
                      <span className="text-slate-300 text-xs">|</span>
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
                    </>
                  )}
                </div>

                {/* Send / Stop */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Paperclip */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    title="Lampirkan file (PDF, DOCX, XLSX, PPTX, TXT)"
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                      attachment
                        ? 'bg-indigo-100 text-indigo-500'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
                      (isLoading || isUploading) && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {isUploading
                      ? <span className="h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      : <Paperclip className="h-3.5 w-3.5" />
                    }
                  </button>

                  {isLoading ? (
                    <button
                      onClick={stopGeneration}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500 hover:bg-rose-200 transition"
                      title="Hentikan"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() && !attachment}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Disclaimer */}
            <p className="text-center text-[11px] text-slate-400 mt-2.5">
              Skripsiku may occasionally produce inaccurate responses. Always verify important information.
            </p>
          </div>
        </div>

        {/* ── Settings Drawer (slide-in from right, overlay) ── */}
        <AnimatePresence>
          {settingsPanelOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="settings-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40 bg-black/10"
                onClick={() => setSettingsPanelOpen(false)}
              />
              {/* Panel */}
              <motion.div
                key="settings-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white border-l border-slate-200 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white text-sm font-bold">
                      R
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Pengguna Lokal</p>
                      <p className="text-[11px] text-slate-400">Mode Lokal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettingsPanelOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-hide">

                  {/* ── Output Language ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-3.5 w-3.5 text-indigo-400" />
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Bahasa Output</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setLanguage(v)}
                          className={cn(
                            'py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center',
                            language === v
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── AI Mode ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Mode AI</p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => setMode('instant')}
                        className={cn(
                          'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all text-left',
                          mode === 'instant'
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0', mode === 'instant' ? 'bg-indigo-100' : 'bg-slate-100')}>
                          <Zap className={cn('h-4 w-4', mode === 'instant' ? 'text-indigo-500' : 'text-slate-400')} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Cepat</p>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{AI_MODE_LABELS.instant.description}</p>
                        </div>
                        {mode === 'instant' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                      </button>

                      <button
                        onClick={() => { if (mode === 'instant') setMode('thinking_standard'); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all text-left',
                          (mode === 'thinking_standard' || mode === 'thinking_extended')
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0', (mode === 'thinking_standard' || mode === 'thinking_extended') ? 'bg-indigo-100' : 'bg-slate-100')}>
                          <Brain className={cn('h-4 w-4', (mode === 'thinking_standard' || mode === 'thinking_extended') ? 'text-indigo-500' : 'text-slate-400')} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Thinking</p>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5">Reasoning mendalam untuk tugas kompleks</p>
                        </div>
                        {(mode === 'thinking_standard' || mode === 'thinking_extended') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                      </button>

                      {(mode === 'thinking_standard' || mode === 'thinking_extended') && (
                        <div className="ml-4 pl-3 border-l-2 border-indigo-100 flex flex-col gap-1.5">
                          {[
                            { val: 'thinking_standard' as AiMode, icon: Brain, label: 'Standard', desc: AI_MODE_LABELS.thinking_standard.description, color: 'text-indigo-500' },
                            { val: 'thinking_extended' as AiMode, icon: Star, label: 'Extended', desc: AI_MODE_LABELS.thinking_extended.description, color: 'text-amber-500' },
                          ].map(({ val, icon: Icon, label, desc, color }) => (
                            <button
                              key={val}
                              onClick={() => setMode(val)}
                              className={cn(
                                'w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all',
                                mode === val
                                  ? val === 'thinking_extended' ? 'border-amber-200 bg-amber-50' : 'border-indigo-200 bg-white'
                                  : 'border-transparent hover:bg-slate-50'
                              )}
                            >
                              <Icon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', color)} />
                              <div>
                                <p className="text-xs font-semibold text-slate-700">{label}</p>
                                <p className="text-[10px] text-slate-400 leading-snug">{desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Citation Style ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Quote className="h-3.5 w-3.5 text-indigo-400" />
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Gaya Sitasi</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.entries(CITATION_STYLE_LABELS) as [CitationStyle, string][]).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setCitationStyle(v)}
                          className={cn(
                            'py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left',
                            citationStyle === v
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Document Type ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Jenis Dokumen</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, { id: string; en: string }][]).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => useAppStore.getState().setDocumentType(v)}
                          className={cn(
                            'py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left',
                            documentType === v
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                          )}
                        >
                          {l.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                  <p className="text-[11px] text-slate-400 text-center">
                    Powered by <span className="text-indigo-400 font-medium">Rizalfanex</span> · Designed for Academics
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Thinking Drawer (global, portal-like) ── */}
      <ThinkingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        content={drawerContent ? drawerContent.content : streamingThinking}
        isStreaming={drawerContent === null && isThinking}
        durationMs={drawerContent ? drawerContent.durationMs : thinkingElapsedMs}
      />
    </div>
  );
}
