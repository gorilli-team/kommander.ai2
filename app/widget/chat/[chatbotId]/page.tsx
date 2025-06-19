
"use client";

import ChatUI from '@/frontend/components/chatbot/ChatUI';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WidgetChatPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string | undefined;
  const [isValidId, setIsValidId] = useState(false);

  useEffect(() => {
    if (chatbotId) {
      // Basic validation: check if chatbotId is a non-empty string.
      // You might want to add more robust validation later (e.g., format check).
      setIsValidId(typeof chatbotId === 'string' && chatbotId.trim() !== '');
    }
  }, [chatbotId]);

  if (!isValidId) {
    // Optionally render a message or a minimal loading/error state
    // if the ID is not valid or not yet available.
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#555' }}>
            <p>Loading chat or invalid chatbot ID.</p>
        </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      <ChatUI />
    </div>
  );
}
