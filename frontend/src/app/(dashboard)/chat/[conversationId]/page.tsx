'use client';

import { use } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

interface Props {
  params: Promise<{ conversationId: string }>;
}

/**
 * Existing-conversation page. Loads history on mount via useChat,
 * then continues the conversation inline.
 */
export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  return <ChatInterface conversationId={conversationId} />;
}
