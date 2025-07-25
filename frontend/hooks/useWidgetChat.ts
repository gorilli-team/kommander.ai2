'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: Date;
}

export function useWidgetChat(contextId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [handledBy, setHandledBy] = useState<'bot' | 'agent'>('bot');
  const [conversationId, setConversationId] = useState('');
  const conversationIdRef = useRef<string>('');
  const lastTimestampRef = useRef<string>('');

  const pollFnRef = useRef<() => Promise<void>>();

  const storageKey = `kommander_conversation_${contextId}`;
  const site = typeof window !== 'undefined' ? window.location.hostname : '';
// const POLL_INTERVAL_MS = 500;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        conversationIdRef.current = stored;
        setConversationId(stored);
      } else {
        // Reset conversation state when switching contexts
        conversationIdRef.current = '';
        setConversationId('');
        setMessages([]);
        lastTimestampRef.current = '';
        console.log('[useWidgetChat] Reset conversation state for new context:', contextId);
      }
    }
  }, [storageKey, contextId]);

  useEffect(() => {

    if (!conversationId) return;

    let interval: NodeJS.Timeout | null = null;

const fetchInitial = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai'}/api/widget-conversations/${conversationId}?userId=${encodeURIComponent(contextId)}`,
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
      const params = new URLSearchParams({ userId: contextId });
      if (lastTimestampRef.current) {
        params.set('since', lastTimestampRef.current);
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai'}/api/widget-conversations/${conversationId}/updates?${params.toString()}`,
      );

      if (res.ok) {
        const data = await res.json();
        setHandledBy(data.handledBy || 'bot');
        let newMsgs = (data.messages || []).map((m: any) => ({
          id: m.timestamp + m.role,
          role: m.role,
          content: m.text,
          timestamp: new Date(m.timestamp),
        }));
        
        // Filter out user messages from polling - they should only come from local addMessage
        newMsgs = newMsgs.filter(msg => msg.role !== 'user');
        
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

fetchInitial().then(() => {
      // Start polling for updates
      pollFnRef.current = poll;
      interval = setInterval(poll, 2000); // Poll every 2 seconds
    });
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [conversationId, contextId]);

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

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai'}/api/kommander-query-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: contextId,
            message: messageWithContext,
            conversationId: conversationIdRef.current,
            site,
          }),
        });

        if (!res.ok) {
          throw new Error('Network response was not ok');
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let currentMessageId = Date.now().toString();
        let hasStartedStreaming = false;
        
        // Add initial empty message that will be updated
        setMessages((prev) => [...prev, {
          id: currentMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }]);

        while (true) {
          const { done, value } = await reader?.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.replace(/^data: /, ''));

                if (event.type === 'chunk') {
                  // Nascondi typing loader al primo chunk
                  if (!hasStartedStreaming) {
                    setIsLoading(false);
                    hasStartedStreaming = true;
                  }
                  
                  fullResponse += event.content;
                  
                  // Update the message content in real-time
                  setMessages((prev) => prev.map(msg => 
                    msg.id === currentMessageId 
                      ? { ...msg, content: fullResponse }
                      : msg
                  ));
                  
                  if (event.conversationId) {
                    conversationIdRef.current = event.conversationId;
                    setConversationId(event.conversationId);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(storageKey, event.conversationId);
                    }
                  }
                } else if (event.type === 'complete') {
                  if (event.conversationId) {
                    conversationIdRef.current = event.conversationId;
                    setConversationId(event.conversationId);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(storageKey, event.conversationId);
                    }
                  }
                  
                  if (event.handledBy) {
                    setHandledBy(event.handledBy);
                  }
                } else if (event.type === 'error') {
                  addMessage('system', `Error: ${event.error}`);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
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
    [contextId, site, storageKey]
  );

  return { messages, isLoading, sendMessage, addMessage, handledBy, setHandledBy };
}