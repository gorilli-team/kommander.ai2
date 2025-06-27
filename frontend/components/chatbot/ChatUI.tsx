"use client";

import React from 'react';
import { useChat } from '@/frontend/hooks/useChat';
import ChatUIWrapper from '@/frontend/components/chatbot/ChatUIWrapper';

interface ChatUIProps {
  containerClassName?: string;
  headerClassName?: string;
  headerExtras?: React.ReactNode;
  title?: string;
  accentColor?: string;
}

export default function ChatUI({
  containerClassName,
  headerClassName,
  headerExtras,
  title = 'Kommander.ai Chat',
  accentColor,
}: ChatUIProps) {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <ChatUIWrapper
      messages={messages}
      isLoading={isLoading}
      sendMessage={sendMessage}
      containerClassName={containerClassName}
      headerClassName={headerClassName}
      headerExtras={headerExtras}
      title={title}
      accentColor={accentColor}
    />
  );
}

