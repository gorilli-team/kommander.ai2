'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: Date;
}

export function useWidgetChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [handledBy, setHandledBy] = useState<'bot' | 'agent'>('bot');
  const conversationIdRef = useRef<string>('');
  const storageKey = `kommander_conversation_${userId}`;
  const site = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        conversationIdRef.current = stored;
      }
    }
  }, [storageKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const fetchLatest = async () => {
      if (!conversationIdRef.current) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/conversations/${conversationIdRef.current}`,
        );
        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');
          setMessages(
            data.messages.map((m: any) => ({
              id: m.timestamp + m.role,
              role: m.role,
              content: m.text,
              timestamp: new Date(m.timestamp),
            })),
          );
        }
      } catch (err) {
        // ignore
      }
    };
    if (handledBy === 'agent') {
      fetchLatest();
      interval = setInterval(fetchLatest, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [handledBy, userId]);

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = useCallback(
    async (userMessageContent: string) => {
      if (!userMessageContent.trim()) return;

      addMessage('user', userMessageContent);
      setIsLoading(true);

      try {
        if (!conversationIdRef.current) {
          conversationIdRef.current = Date.now().toString();
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, conversationIdRef.current);
          }
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/kommander-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            message: userMessageContent,
            conversationId: conversationIdRef.current,
            site,
          }),
        });

        const data = await res.json();

        if (data.conversationId) {
          conversationIdRef.current = data.conversationId;
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, conversationIdRef.current);
          }
        }

        if (data.handledBy) {
          setHandledBy(data.handledBy);
        }

        if (data.reply) {
          addMessage('assistant', data.reply);
        } else if (data.error) {
          addMessage('system', `Error: ${data.error}`);
        }
      } catch (err: any) {
        addMessage('system', `Error: ${err.message || 'Network error.'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, site, storageKey]
  );

  return { messages, isLoading, sendMessage, addMessage, handledBy, setHandledBy };
}