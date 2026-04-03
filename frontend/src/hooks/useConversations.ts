'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { conversationsApi } from '@/lib/api';
import { Conversation } from '@/lib/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await conversationsApi.list();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await conversationsApi.delete(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
      } catch {
        // ignore
      }
    },
    []
  );

  return { conversations, isLoading, refresh, remove };
}
