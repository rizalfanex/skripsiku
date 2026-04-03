'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, FolderOpen, BookOpen, FileText, Zap, Brain, Star,
  ArrowRight, Clock, Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useProject } from '@/hooks/useProject';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AI_MODE_LABELS, DOCUMENT_TYPE_LABELS, formatRelativeDate } from '@/lib/utils';
import { AiMode } from '@/lib/types';

const QUICK_ACTIONS = [
  {
    title: 'Proyek Tesis / Skripsi',
    description: 'Bantuan terstruktur dari judul hingga kesimpulan',
    icon: BookOpen,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    href: '/projects?type=thesis',
  },
  {
    title: 'Proyek Jurnal',
    description: 'Journal upgrade, cover letter, dan rebuttal',
    icon: FileText,
    color: 'text-gold-400',
    bg: 'bg-gold-500/10',
    href: '/projects?type=journal_article',
  },
  {
    title: 'Analisis Celah Penelitian',
    description: 'Identifikasi research gap dari literatur Anda',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    href: '/workspace',
  },
];

const MODE_ICONS: Record<AiMode, React.ComponentType<{ className?: string }>> = {
  instant: Zap,
  thinking_standard: Brain,
  thinking_extended: Star,
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const { projects, loadProjects, setActiveProject, isLoading } = useProject();

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Pengguna';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-white mb-1">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-slate-400 text-sm">
          Apa yang ingin Anda kerjakan hari ini?
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-10"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Mulai Cepat
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card hover className="group h-full">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${action.bg} group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm">{action.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent projects */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Proyek Aktif ({activeProjects.length})
          </h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-36 animate-pulse bg-navy-800/60" />
            ))}
          </div>
        ) : activeProjects.length === 0 ? (
          <Card className="text-center py-12">
            <FolderOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-5">Belum ada proyek. Mulai proyek pertama Anda!</p>
            <Link href="/projects">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Buat Proyek Baru
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.slice(0, 6).map((project) => {
              const ModeIcon = MODE_ICONS[project.ai_mode as AiMode] ?? Zap;
              const modeInfo = AI_MODE_LABELS[project.ai_mode as AiMode];
              return (
                <Card
                  key={project.id}
                  hover
                  onClick={() => {
                    setActiveProject(project);
                    router.push(`/workspace/${project.id}`);
                  }}
                  className="group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={project.document_type === 'thesis' ? 'primary' : 'gold'}>
                      {DOCUMENT_TYPE_LABELS[project.document_type as keyof typeof DOCUMENT_TYPE_LABELS]?.id ?? project.document_type}
                    </Badge>
                    <Badge variant="neutral">
                      {project.citation_style.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <ModeIcon className={`h-3 w-3 ${modeInfo?.color ?? 'text-slate-400'}`} />
                      <span>{modeInfo?.labelId ?? project.ai_mode}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(project.updated_at)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
