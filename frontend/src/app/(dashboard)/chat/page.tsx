'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';

/**
 * New-chat page. ChatInterface handles navigation to /chat/[id] once the
 * backend returns a conversation_id on the first message.
 */
export default function NewChatPage() {
  return <ChatInterface conversationId={null} />;
}
