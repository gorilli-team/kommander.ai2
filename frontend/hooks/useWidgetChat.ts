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
  const [conversationId, setConversationId] = useState('');
  const conversationIdRef = useRef<string>('');
  const lastTimestampRef = useRef<string>('');

  const pollFnRef = useRef<() => Promise<void>>();

  const storageKey = `kommander_conversation_${userId}`;
  const site = typeof window !== 'undefined' ? window.location.hostname : '';
  const POLL_INTERVAL_MS = 500;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        conversationIdRef.current = stored;
        setConversationId(stored);
      }
    }
  }, [storageKey]);

  useEffect(() => {

    if (!conversationId) return;

    let interval: NodeJS.Timeout | null = null;

    const fetchInitial = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/widget-conversations/${conversationId}?userId=${encodeURIComponent(userId)}`,


        );
        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');

          const msgs = (data.messages || []).map((m: any) => ({

            id: m.timestamp + m.role,
            role: m.role,
            content: m.text,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(msgs);
          if (msgs.length) {
            lastTimestampRef.current = msgs[msgs.length - 1].timestamp.toISOString();
          }
        }
      } catch {
        // ignore
      }
    };


    const poll = async () => {
      try {
        const params = new URLSearchParams({ userId });
        if (lastTimestampRef.current) {
          params.set('since', lastTimestampRef.current);
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/widget-conversations/${conversationId}/updates?${params.toString()}`,

        );

        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');
          const newMsgs = (data.messages || []).map((m: any) => ({
            id: m.timestamp + m.role,
            role: m.role,
            content: m.text,
            timestamp: new Date(m.timestamp),
          }));
          if (newMsgs.length) {
            lastTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp.toISOString();
            setMessages((prev) => {
              const existing = new Set(prev.map((msg: Message) => msg.id));
              const unique = newMsgs.filter((msg: Message) => !existing.has(msg.id));
              return unique.length ? [...prev, ...unique] : prev;
            });
          }
        }
      } catch {
        // ignore
      }
    };

    pollFnRef.current = poll;

    fetchInitial().then(() => poll());
    interval = setInterval(poll, POLL_INTERVAL_MS);


    return () => {
      if (interval) clearInterval(interval);
    };
  }, [conversationId, userId]);

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
    lastTimestampRef.current = new Date().toISOString();
  };

  const sendMessage = useCallback(
    async (userMessageContent: string, filesContext?: string) => {
      if (!userMessageContent.trim()) return;

      addMessage('user', userMessageContent);
      setIsLoading(true);

      try {
        if (!conversationIdRef.current) {
          const newId = Date.now().toString();
          conversationIdRef.current = newId;
          setConversationId(newId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, newId);
          }
        }

        // Combina il messaggio dell'utente con il context dei file se presente
        const messageWithContext = filesContext 
          ? `${filesContext}\n\n--- MESSAGGIO UTENTE ---\n${userMessageContent}`
          : userMessageContent;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/kommander-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            message: messageWithContext,
            conversationId: conversationIdRef.current,
            site,
          }),
        });

        const data = await res.json();

        if (data.conversationId) {
          conversationIdRef.current = data.conversationId;

          setConversationId(data.conversationId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, data.conversationId);

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
        if (pollFnRef.current) {
          pollFnRef.current();
        }
      }
    },
    [userId, site, storageKey]
  );

  return { messages, isLoading, sendMessage, addMessage, handledBy, setHandledBy };
}