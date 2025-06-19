
"use client";

import { useState, useCallback } from 'react';
import { generateChatResponse } from '@/app/chatbot/actions';
import { useToast } from '@/frontend/hooks/use-toast';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  const sendMessage = useCallback(async (userMessageContent: string) => {
    if (!userMessageContent.trim()) return;

    addMessage('user', userMessageContent);
    setIsLoading(true);

    const historyForAI = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ role: msg.role, content: msg.content }));
      
    try {
      const result = await generateChatResponse(userMessageContent, historyForAI);
      if (result.error) {
        addMessage('system', `Error: ${result.error}`);
        toast({ title: "Chat Error", description: result.error, variant: "destructive" });
      } else if (result.response) {
        addMessage('assistant', result.response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred with the chat service.';
      addMessage('system', `Error: ${errorMessage}`);
      toast({ title: "Chat Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
