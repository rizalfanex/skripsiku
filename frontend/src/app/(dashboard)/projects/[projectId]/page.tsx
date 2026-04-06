'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, MessageSquare, ChevronLeft, Trash2, Clock,
  FolderOpen, Zap, Brain, Star,
} from 'lucide-react';
import { conversationsApi, projectsApi } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { Project, Conversation } from '@/lib/types';
import { DOCUMENT_TYPE_LABELS, CITATION_STYLE_LABELS, LANGUAGE_LABELS, formatRelativeDate, cn } from '@/lib/utils';
import { DocumentType, CitationStyle, Language } from '@/lib/types';
import toast from 'react-hot-toast';

const MODE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  instant: Zap,
  thinking_standard: Brain,
  thinking_extended: Star,
};

const MODE_COLOR: Record<string, string> = {
  instant: 'text-emerald-500',
  thinking_standard: 'text-indigo-500',
  thinking_extended: 'text-amber-500',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { setActiveProject } = useAppStore();

  const [project, setProject] = useState<Project | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, convs] = await Promise.all([
        projectsApi.get(projectId),
        conversationsApi.list(projectId),
      ]);
      setProject(proj);
      setActiveProject(proj);
      setConversations(convs);
    } catch {
      toast.error('Gagal memuat proyek');
      router.push('/projects');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setActiveProject, router]);

  useEffect(() => { load(); }, [load]);

  const handleNewChat = () => {
    if (project) setActiveProject(project);
    router.push('/chat');
  };

  const handleOpenConversation = (conv: Conversation) => {
    if (project) setActiveProject(project);
    router.push(`/chat/${conv.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await conversationsApi.delete(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success('Chat dihapus');
    } catch {
      toast.error('Gagal menghapus chat');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-slate-50 p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-48 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-6 w-80 rounded-lg bg-slate-200 animate-pulse" />
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const ModeIcon = MODE_ICON[project.ai_mode] ?? Zap;

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Semua Proyek
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 mb-1 truncate">{project.title}</h1>
              {project.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full">
                  <FolderOpen className="h-3 w-3" />
                  {DOCUMENT_TYPE_LABELS[project.document_type as DocumentType]?.id ?? project.document_type}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {LANGUAGE_LABELS[project.language as Language] ?? project.language}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {CITATION_STYLE_LABELS[project.citation_style as CitationStyle] ?? project.citation_style}
                </span>
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-full', MODE_COLOR[project.ai_mode])}>
                  <ModeIcon className="h-3 w-3" />
                  {project.ai_mode === 'instant' ? 'Cepat' : project.ai_mode === 'thinking_standard' ? 'Thinking' : 'Extended'}
                </span>
              </div>
            </div>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Chat Baru
            </button>
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="max-w-3xl mx-auto px-8 py-6">
        {conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Belum ada chat di proyek ini</p>
            <p className="text-xs text-slate-400 mb-6">Mulai chat baru dan semua percakapan akan muncul di sini</p>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition"
            >
              <Plus className="h-4 w-4" />
              Mulai Chat Pertama
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {conversations.length} percakapan
            </p>
            {conversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleOpenConversation(conv)}
                className="group flex items-center gap-4 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm rounded-2xl px-4 py-3.5 cursor-pointer transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-indigo-50 flex-shrink-0 transition">
                  <MessageSquare className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {conv.title ?? 'Chat tanpa judul'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(conv.updated_at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition flex-shrink-0"
                  title="Hapus chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
