'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className={cn(
            // Centering: left/top 50% + negative translate. animate-fade-in is opacity-only
            // and does NOT override these transforms (animate-slide-up would break centering)
            'fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2',
            // Width: calc leaves 1rem margin on each side on mobile; max-w caps on desktop
            'w-[calc(100%-2rem)]',
            // Prevent overflow on short screens
            'max-h-[90vh] overflow-y-auto',
            'rounded-2xl border p-6 shadow-2xl animate-fade-in',
            'border-primary-500/20 bg-navy-800',
            sizeClasses[size],
            className
          )}
        >
          {title && (
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-slate-400">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
