"use client";

import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function useWidgetChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const conversationIdRef = useRef<string>('');

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  const sendMessage = useCallback(async (userMessageContent: string) => {
    if (!userMessageContent.trim()) return;

    addMessage('user', userMessageContent);
    setIsLoading(true);

    try {
      if (!conversationIdRef.current) {
        conversationIdRef.current = Date.now().toString();
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/kommander-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: userMessageContent, conversationId: conversationIdRef.current }),
      });
      const data = await res.json();
      if (data.reply) {
        addMessage('assistant', data.reply);
        if (data.conversationId) {
          conversationIdRef.current = data.conversationId;
        }
      } else if (data.error) {
        addMessage('system', `Error: ${data.error}`);
      }
    } catch (err: any) {
      addMessage('system', `Error: ${err.message || 'Network error.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { messages, isLoading, sendMessage };
}
