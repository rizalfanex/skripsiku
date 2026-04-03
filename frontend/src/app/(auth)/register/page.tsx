'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

const ACADEMIC_LEVELS = [
  { value: 'undergraduate', label: 'S1 / Sarjana (Skripsi)' },
  { value: 'postgraduate', label: 'S2 / S3 (Tesis / Disertasi)' },
  { value: 'researcher', label: 'Peneliti / Dosen / Akademisi' },
];

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    academic_level: 'undergraduate',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.length < 2) e.full_name = 'Nama minimal 2 karakter';
    if (!form.email) e.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email tidak valid';
    if (form.password.length < 8) e.password = 'Password minimal 8 karakter';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Password tidak cocok';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const data = await authApi.register({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        academic_level: form.academic_level,
      });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setUser(data.user);
      toast.success('Akun berhasil dibuat! Selamat datang di Skripsiku!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? 'Gagal membuat akun. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-12 bg-grid">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-primary-500/6 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 shadow-lg shadow-primary-500/30">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Skripsiku</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Buat Akun Gratis</h1>
          <p className="mt-2 text-sm text-slate-400">Mitra akademik AI Anda menunggu</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4" noValidate>
          <Input
            id="full_name"
            label="Nama Lengkap"
            placeholder="Nama Anda"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            error={errors.full_name}
            autoComplete="name"
          />

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Tingkat Akademik</label>
            <select
              value={form.academic_level}
              onChange={(e) => update('academic_level', e.target.value)}
              className="input-field"
            >
              {ACADEMIC_LEVELS.map((l) => (
                <option key={l.value} value={l.value} className="bg-navy-800">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className={`input-field pr-12 ${errors.password ? 'border-rose-500/60' : ''}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-400">{errors.password}</p>}
          </div>

          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            label="Konfirmasi Password"
            placeholder="Ulangi password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <div className="pt-2">
            <Button type="submit" isLoading={isLoading} className="w-full py-3">
              Daftar Sekarang <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-sm text-slate-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition">
              Masuk
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
