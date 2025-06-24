'use client';

import { ChatBotWidget } from 'chatbot-widget-ui';
import { useRef, useEffect } from 'react';
import { useWidgetChat } from '@/frontend/hooks/useWidgetChat';

interface ChatbotWidgetProps {
  userId: string;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const { messages, callApi, addMessage, handledBy } = useWidgetChat(userId);
  const prevHandledBy = useRef<'bot' | 'agent'>('bot');

  useEffect(() => {
    if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
      addMessage('system', 'Stai parlando con un operatore umano');
    }
    prevHandledBy.current = handledBy;
  }, [handledBy, addMessage]);

  return (
    <ChatBotWidget
      callApi={callApi}
      handleNewMessage={(m) =>
        addMessage(m.role === 'error' ? 'system' : (m.role as any), m.content)
      }
      onBotResponse={(response) => addMessage('assistant', response)}
      messages={messages}
      primaryColor="#1E3A8A"
    />
  );
}
