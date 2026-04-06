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
  /** Called when the backend emits an AI-generated title for the conversation. */
  onTitleUpdate?: (title: string, conversationId: string) => void;
  onError?: (msg: string) => void;
}

export function useChat({ conversationId, onConversationId, onTitleUpdate, onError }: UseChatOptions = {}) {
  const {
    mode, language, citationStyle, documentType, taskType, setTaskType,
    activeProject, academicField,
    triggerConversationRefresh, upsertSidebarConversation,
  } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currentConvIdRef = useRef<string | null>(conversationId ?? null);
  const pendingConvIdRef = useRef<string | null>(null);

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
      setStreamingThinking('');
      setIsThinking(false);
      setActiveStep(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let fullContent = '';
        let thinkingContent = '';

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
            if (!currentConvIdRef.current) {
              currentConvIdRef.current = event.conversation_id;
              pendingConvIdRef.current = event.conversation_id;
              // Use first user message (truncated) as placeholder — replaced by AI title later
              const cleanContent = content.trim();
              const placeholderTitle =
                cleanContent.length > 60
                  ? cleanContent.slice(0, 57).trimEnd() + '...'
                  : cleanContent || 'Chat Baru';
              upsertSidebarConversation({
                id: event.conversation_id,
                title: placeholderTitle,
                project_id: activeProject?.id ?? null,
                mode,
                task_type: taskType,
                language,
              });
            }
          } else if (event.type === 'thinking_start') {
            setIsThinking(true);
          } else if (event.type === 'thinking_chunk') {
            thinkingContent += event.content ?? '';
            setStreamingThinking(thinkingContent);
          } else if (event.type === 'thinking_end') {
            setIsThinking(false);
          } else if (event.type === 'start') {
            setActiveStep(event.step ?? null);
          } else if (event.type === 'chunk') {
            fullContent += event.content ?? '';
            setStreamingContent(fullContent);
          } else if (event.type === 'title_update') {
            if (event.title && event.conversation_id) {
              onTitleUpdate?.(event.title, event.conversation_id);
              // Update the title in the sidebar list directly
              upsertSidebarConversation({ id: event.conversation_id, title: event.title });
            }
          } else if (event.type === 'step_complete') {
            // continue
          } else if (event.type === 'complete') {
            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: fullContent,
              thinkingContent: thinkingContent || undefined,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent('');
            setStreamingThinking('');
            setIsThinking(false);
            setActiveStep(null);
            if (pendingConvIdRef.current) {
              onConversationId?.(pendingConvIdRef.current);
              pendingConvIdRef.current = null;
            }
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
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [
      isLoading, messages, mode, language, citationStyle, documentType,
      taskType, activeProject, academicField, onConversationId, onTitleUpdate, onError,
      upsertSidebarConversation,
    ]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isLoading,
    activeStep,
    streamingContent,
    streamingThinking,
    isThinking,
    historyLoaded,
    sendMessage,
    stopGeneration,
    clearMessages,
    setTaskType,
  };
}
