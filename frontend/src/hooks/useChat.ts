'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat, conversationsApi } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { ChatMessage, TaskType } from '@/lib/types';

interface UseChatOptions {
  /** ID of the existing conversation to load and continue. */
  conversationId?: string | null;
  /** Called when the backend assigns a new conversation_id (first message). */
  onConversationId?: (id: string) => void;
  onError?: (msg: string) => void;
}

export function useChat({ conversationId, onConversationId, onError }: UseChatOptions = {}) {
  const {
    mode, language, citationStyle, documentType, taskType, setTaskType,
    activeProject, academicField,
  } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currentConvIdRef = useRef<string | null>(conversationId ?? null);

  // Load conversation history from backend when conversationId is provided
  useEffect(() => {
    currentConvIdRef.current = conversationId ?? null;
    setMessages([]);
    setHistoryLoaded(false);

    if (!conversationId) {
      setHistoryLoaded(true);
      return;
    }

    conversationsApi
      .messages(conversationId)
      .then((msgs) => {
        setMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => setHistoryLoaded(true));
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, overrideTask?: TaskType) => {
      if (isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);
      setStreamingContent('');
      setActiveStep(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let fullContent = '';

        for await (const event of streamChat(
          {
            project_id: activeProject?.id,
            conversation_id: currentConvIdRef.current ?? undefined,
            messages: newMessages,
            mode,
            task_type: overrideTask ?? taskType,
            language,
            citation_style: citationStyle,
            document_type: documentType,
            academic_field: academicField,
            academic_level: activeProject?.academic_level ?? 'undergraduate',
          },
          controller.signal
        )) {
          if (event.type === 'meta' && event.conversation_id) {
            // Backend assigned a conversation_id (new or existing)
            if (!currentConvIdRef.current) {
              currentConvIdRef.current = event.conversation_id;
              onConversationId?.(event.conversation_id);
            }
          } else if (event.type === 'start') {
            setActiveStep(event.step ?? null);
          } else if (event.type === 'chunk') {
            fullContent += event.content ?? '';
            setStreamingContent(fullContent);
          } else if (event.type === 'step_complete') {
            // continue streaming
          } else if (event.type === 'complete') {
            const assistantMsg: ChatMessage = { role: 'assistant', content: fullContent };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent('');
            setActiveStep(null);
          } else if (event.type === 'error') {
            onError?.(event.message ?? 'Unknown error');
            break;
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          onError?.((err as Error)?.message ?? 'Request failed');
        }
      } finally {
        setIsLoading(false);
        setActiveStep(null);
        abortRef.current = null;
      }
    },
    [
      isLoading, messages, mode, language, citationStyle, documentType,
      taskType, activeProject, academicField, onConversationId, onError,
    ]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
  }, []);

  const resetConversation = useCallback(() => {
    currentConvIdRef.current = null;
    setMessages([]);
    setStreamingContent('');
    setActiveStep(null);
  }, []);

  return {
    messages,
    isLoading,
    activeStep,
    streamingContent,
    historyLoaded,
    sendMessage,
    stopGeneration,
    clearMessages,
    resetConversation,
    setTaskType,
  };
}
