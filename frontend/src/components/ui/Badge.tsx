'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'gold' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

const variants = {
  primary: 'badge-primary',
  gold: 'badge-gold',
  success: 'badge-success',
  warning: 'badge text-amber-400 bg-amber-400/15',
  error: 'badge text-rose-400 bg-rose-400/15',
  neutral: 'badge text-slate-400 bg-slate-400/10',
};

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  return <span className={cn(variants[variant], className)}>{children}</span>;
}
