'use client';

import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  AI_MODE_LABELS, LANGUAGE_LABELS, CITATION_STYLE_LABELS,
} from '@/lib/utils';
import { AiMode, CitationStyle, Language } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { mode, language, citationStyle, setMode, setLanguage, setCitationStyle } = useAppStore();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">Kelola preferensi AI Anda</p>
      </div>

      <div className="flex gap-8">
        <nav className="w-52 flex-shrink-0 space-y-1">
          <div className="sidebar-item active">
            <Palette className="h-4 w-4" />
            <span>Preferensi AI</span>
          </div>
        </nav>

        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="card">
              <h3 className="font-semibold text-white text-sm mb-4">Bahasa Output Default</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setLanguage(v)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
                      language === v
                        ? 'border-primary-500/40 bg-primary-500/10 text-primary-200'
                        : 'border-primary-500/10 bg-navy-800 text-slate-400 hover:text-slate-200 hover:border-primary-500/20'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-white text-sm mb-4">Gaya Sitasi Default</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(CITATION_STYLE_LABELS) as [CitationStyle, string][]).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setCitationStyle(v)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
                      citationStyle === v
                        ? 'border-primary-500/40 bg-primary-500/10 text-primary-200'
                        : 'border-primary-500/10 bg-navy-800 text-slate-400 hover:text-slate-200 hover:border-primary-500/20'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-white text-sm mb-4">Mode AI Default</h3>
              <div className="space-y-2">
                {(Object.entries(AI_MODE_LABELS) as [AiMode, (typeof AI_MODE_LABELS)[AiMode]][]).map(([m, info]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200',
                      mode === m
                        ? 'border-primary-500/30 bg-primary-500/10'
                        : 'border-primary-500/10 bg-navy-800 hover:bg-white/5'
                    )}
                  >
                    <div className={cn('mt-0.5 text-sm', info.color)}>*</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{info.labelId}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
