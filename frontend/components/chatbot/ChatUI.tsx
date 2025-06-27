"use client";

import React from 'react';
import { useChat } from '@/frontend/hooks/useChat';
import ChatUIWrapper, { ChatUIWrapperProps } from './ChatUIWrapper';

export type ChatUIProps = Omit<ChatUIWrapperProps, 'messages' | 'isLoading' | 'sendMessage'>;

export default function ChatUI(props: ChatUIProps) {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <ChatUIWrapper
      {...props}
      messages={messages}
      isLoading={isLoading}
      sendMessage={sendMessage}
    />
  );
}

