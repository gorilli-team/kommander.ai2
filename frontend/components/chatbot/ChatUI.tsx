"use client";

import React from 'react';
import { useChat } from '@/frontend/hooks/useChat';
import ChatWindow, { ChatWindowProps } from '@/frontend/components/chatbot/ChatWindow';

export default function ChatUI(props: Omit<ChatWindowProps, 'messages' | 'isLoading' | 'sendMessage'>) {
  const { messages, isLoading, sendMessage } = useChat();
  return <ChatWindow {...props} messages={messages} isLoading={isLoading} sendMessage={sendMessage} />;
}

