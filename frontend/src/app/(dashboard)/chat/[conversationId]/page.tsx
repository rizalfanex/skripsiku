'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';

interface Props {
  params: { conversationId: string };
}

export default function ConversationPage({ params }: Props) {
  return <ChatInterface conversationId={params.conversationId} />;
}
