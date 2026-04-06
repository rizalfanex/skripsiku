'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { conversationsApi } from '@/lib/api';
import { Conversation } from '@/lib/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await conversationsApi.list();
      setConversations(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        // Only wipe the list for non-auth errors
        setConversations([]);
      }
      setError(status === 401 ? 'unauthenticated' : 'error');
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

  return { conversations, isLoading, error, refresh, remove };
}
