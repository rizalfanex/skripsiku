'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Settings,
  ChevronLeft, ChevronRight, Plus, MessageSquare, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useConversations } from '@/hooks/useConversations';
import { useEffect, useMemo } from 'react';
import { Conversation } from '@/lib/types';

function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Hari Ini', items: [] },
    { label: 'Kemarin', items: [] },
    { label: 'Minggu Ini', items: [] },
    { label: 'Sebelumnya', items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (d >= todayStart) groups[0].items.push(c);
    else if (d >= yesterdayStart) groups[1].items.push(c);
    else if (d >= weekStart) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

const NAV_ITEMS = [
  { href: '/projects', icon: FolderOpen, label: 'Proyek' },
  { href: '/settings', icon: Settings, label: 'Pengaturan' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, settingsPanelOpen, setSettingsPanelOpen } = useAppStore();
  const { conversations, refresh, remove } = useConversations();

  // Re-fetch from API on navigation to keep list in sync with server
  useEffect(() => { refresh(); }, [pathname, refresh]);

  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  const activeConvId = pathname.startsWith('/chat/')
    ? pathname.split('/chat/')[1]?.split('/')[0] ?? null
    : null;

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 68 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="relative flex h-full flex-col border-r border-slate-200 bg-white"
        style={{ minWidth: sidebarOpen ? 260 : 68 }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
            <Image src="/logo.png" alt="Skripsiku" width={32} height={32} className="rounded-xl object-contain" />
          </div>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-base font-bold text-slate-900"
            >
              Skripsiku
            </motion.span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto flex-shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Chat Baru CTA */}
        <div className="p-3">
          <button
            onClick={() => router.push(`/chat?n=${Date.now()}`)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
            'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            )}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            {sidebarOpen && <span>Chat Baru</span>}
          </button>
        </div>

        {/* Nav + Conversation history */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
          {/* Kelola section — always on top */}
          <div className="mb-2">
            {sidebarOpen && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Kelola
              </p>
            )}
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link href={href} className={cn('sidebar-item', active && 'active')}>
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {sidebarOpen && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* History section — below Kelola */}
          <div className="border-t border-slate-200 pt-2 mt-1">
            {sidebarOpen && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Riwayat Chat
              </p>
            )}

            {/* Expanded: grouped list */}
            {sidebarOpen && conversations.length > 0 && (
              <div>
                {groups.map((group) => (
                  <div key={group.label} className="mb-3">
                    <p className="mb-1 px-2 text-[10px] font-medium text-slate-400">
                      {group.label}
                    </p>
                    <ul className="space-y-0.5">
                      {group.items.map((conv) => (
                        <li key={conv.id} className="group/item relative">
                          <button
                            onClick={() => router.push(`/chat/${conv.id}`)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all',
                              activeConvId === conv.id
                                ? 'bg-indigo-50 text-slate-800 border border-indigo-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                          >
                            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                            <span className="truncate text-xs flex-1">{conv.title ?? 'Chat Baru'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeConvId === conv.id) router.push('/chat');
                              remove(conv.id);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/item:flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                            title="Hapus chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded: empty state */}
            {sidebarOpen && conversations.length === 0 && (
              <p className="px-2 py-3 text-xs text-slate-400">Belum ada riwayat chat.</p>
            )}

            {/* Collapsed: conversation icons */}
            {!sidebarOpen && conversations.slice(0, 8).map((conv) => (
              <button
                key={conv.id}
                onClick={() => router.push(`/chat/${conv.id}`)}
                title={conv.title ?? '...'}
                className={cn(
                  'flex w-full items-center justify-center rounded-xl p-2 mb-0.5 transition',
                  activeConvId === conv.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            ))}
          </div>
        </nav>

        {/* Settings footer */}
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
            title="Pengaturan"
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
              settingsPanelOpen
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            )}
          >
            <Settings className={cn('h-4 w-4 flex-shrink-0', settingsPanelOpen ? 'text-indigo-500' : 'text-slate-400')} />
            {sidebarOpen && (
              <span className="text-xs font-medium">Pengaturan</span>
            )}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

