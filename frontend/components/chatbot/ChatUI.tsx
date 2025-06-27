"use client";

import React, { useState } from 'react';
import { useChat } from '@/frontend/hooks/useChat';
import ChatUIWrapper from '@/frontend/components/chatbot/ChatUIWrapper';
import { cn } from '@/frontend/lib/utils';

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
  const [inputValue, setInputValue] = useState('');

  return (
    <ChatUIWrapper
      messages={messages}
      isLoading={isLoading}
      onSend={sendMessage}
      inputValue={inputValue}
      onInputChange={setInputValue}
      containerClassName={containerClassName}
      headerClassName={headerClassName}
      headerExtras={headerExtras}
      title={title}
      accentColor={accentColor}
    />
  );
}

