'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';

function NewChatContent() {
  const searchParams = useSearchParams();
  // Use the ?n= timestamp as a key so clicking "Chat Baru" always force-remounts,
  // even when the user is already on /chat.
  const resetKey = searchParams.get('n') ?? 'default';
  return <ChatInterface key={resetKey} conversationId={null} />;
}

export default function NewChatPage() {
  return (
    <Suspense>
      <NewChatContent />
    </Suspense>
  );
}
