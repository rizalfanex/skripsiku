'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { authApi } from '@/lib/api';
import {
  AI_MODE_LABELS, LANGUAGE_LABELS, CITATION_STYLE_LABELS,
} from '@/lib/utils';
import { AiMode, CitationStyle, Language } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACADEMIC_LEVELS = [
  { value: 'high_school', label: 'SMA/Sederajat' },
  { value: 'undergraduate', label: 'S1 / Sarjana' },
  { value: 'masters', label: 'S2 / Magister' },
  { value: 'doctoral', label: 'S3 / Doktor' },
  { value: 'researcher', label: 'Peneliti / Akademisi' },
];

const SECTIONS = [
  { id: 'profile', label: 'Profil & Akun', icon: User },
  { id: 'preferences', label: 'Preferensi AI', icon: Palette },
];

export default function SettingsPage() {
  const { user, setUser, mode, language, citationStyle, setMode, setLanguage, setCitationStyle } = useAppStore();

  const [activeSection, setActiveSection] = useState('profile');
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [academicLevel, setAcademicLevel] = useState(user?.academic_level ?? 'undergraduate');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updatePreferences({
        full_name: fullName,
        academic_level: academicLevel,
        preferred_language: language,
        preferred_citation_style: citationStyle,
        preferred_ai_mode: mode,
      });
      setUser(updated);
      toast.success('Profil berhasil diperbarui');
    } catch {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">Kelola preferensi akun dan AI Anda</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-52 flex-shrink-0 space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'sidebar-item w-full',
                activeSection === id && 'active'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card space-y-6"
            >
              <h2 className="font-semibold text-white">Profil & Akun</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field w-full"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="input-field w-full opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-600 mt-1">Email tidak dapat diubah saat ini</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Jenjang Akademik</label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="input-field w-full"
                  >
                    {ACADEMIC_LEVELS.map(({ value, label }) => (
                      <option key={value} value={value} className="bg-navy-800">{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Language */}
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

              {/* Citation style */}
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

              {/* AI Mode */}
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
                      <div className={cn('mt-0.5 text-sm', info.color)}>●</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{info.labelId}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
