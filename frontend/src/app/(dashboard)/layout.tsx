'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/store/useAppStore';
import { authApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, setUser, logout } = useAppStore();

  useEffect(() => {
    // On every dashboard mount, verify the token is still valid
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    authApi.me()
      .then((user) => setUser(user))
      .catch(() => {
        logout();
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
