
"use client";

import { useState, useCallback } from 'react';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { useToast } from '@/frontend/hooks/use-toast';

export interface MessageSource {
  type: 'faq' | 'document';
  title: string;
  relevance?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: Date;
  sources?: MessageSource[];
  isRetry?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  const addMessage = (role: Message['role'], content: string, sources?: MessageSource[], isRetry = false) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      sources,
      isRetry
    };
    
    setMessages((prevMessages) => [
      ...prevMessages,
      newMessage,
    ]);
    
    return newMessage.id;
  };

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages.slice().reverse().find(msg => msg.role === 'user');
    if (lastUserMessage && !isLoading) {
      // Remove the last assistant/system response if it exists
      setMessages(prev => {
        const lastUserIndex = prev.map(m => m.id).lastIndexOf(lastUserMessage.id);
        return prev.slice(0, lastUserIndex + 1);
      });
      sendMessage(lastUserMessage.content, true);
    }
  }, [messages, isLoading]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const sendMessage = useCallback(async (userMessageContent: string, isRetry = false) => {
    if (!userMessageContent.trim()) return;

    // Only add user message if it's not a retry
    if (!isRetry) {
      addMessage('user', userMessageContent);
    }
    
    setIsLoading(true);

    // Build conversation history for AI
    const currentMessages = isRetry ? messages : [...messages, { 
      id: 'temp', role: 'user' as const, content: userMessageContent, timestamp: new Date() 
    }];
    
    const historyForAI: ChatMessage[] = currentMessages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
      
    try {
      const result = await generateChatResponse(userMessageContent, historyForAI);
      
      if (result.error) {
        const errorMsg = `I encountered an error: ${result.error}`;
        addMessage('system', errorMsg, undefined, isRetry);
        toast({ 
          title: "Chat Error", 
          description: result.error, 
          variant: "destructive",
          action: isRetry ? undefined : {
            altText: "Retry",
            label: "Try Again",
            onClick: retryLastMessage
          }
        });
      } else if (result.response) {
        // Use real sources from the backend response
        const realSources: MessageSource[] = result.sources || [];
        
        addMessage('assistant', result.response, realSources, isRetry);
        
        // Update conversation ID if it's a new conversation
        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId);
        }
        
        if (isRetry) {
          toast({ title: "Response Regenerated", description: "I've provided a new response for you." });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed. Please check your internet and try again.';
      addMessage('system', `Connection Error: ${errorMessage}`, undefined, isRetry);
      toast({ 
        title: "Connection Error", 
        description: errorMessage, 
        variant: "destructive",
        action: {
          altText: "Retry",
          label: "Try Again",
          onClick: retryLastMessage
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, retryLastMessage]);

  return {
    messages,
    isLoading,
    sendMessage,
    retryLastMessage,
    clearConversation,
    conversationId,
  };
}
