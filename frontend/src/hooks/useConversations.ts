'use client';

import { useCallback, useEffect, useRef } from 'react';
import { conversationsApi } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

export function useConversations() {
  const {
    sidebarConversations: conversations,
    setSidebarConversations,
    removeSidebarConversation,
  } = useAppStore();

  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await conversationsApi.list();
      setSidebarConversations(data);
    } catch {
      // silently ignore — existing list stays visible
    }
  }, [setSidebarConversations]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const remove = useCallback(
    async (id: string) => {
      removeSidebarConversation(id); // optimistic
      try {
        await conversationsApi.delete(id);
      } catch {
        load(); // rollback by re-fetching
      }
    },
    [removeSidebarConversation, load]
  );

  return { conversations, refresh, remove };
}
