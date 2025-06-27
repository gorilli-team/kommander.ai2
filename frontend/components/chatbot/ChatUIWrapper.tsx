'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/frontend/hooks/useWidgetChat';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Send, User, Bot, AlertTriangle, Headphones } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/frontend/lib/utils';

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'flex items-end space-x-3 py-3 px-1',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage
            src={isAssistant ? 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K' : 'https://placehold.co/40x40/444/FFFFFF.png?text=A'}
          />
          <AvatarFallback>
            {isAssistant ? <Bot size={18} /> : isAgent ? <Headphones size={18} /> : <AlertTriangle size={18} />}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[65%] md:max-w-md lg:max-w-lg rounded-lg px-3 py-2 shadow-md text-sm',
          isUser ? 'text-white rounded-br-none' : '',
          isAssistant ? 'bg-card text-card-foreground rounded-bl-none border border-border' : '',
          isAgent ? 'bg-accent text-accent-foreground rounded-bl-none border border-border' : '',
          isSystem ? 'bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-bl-none' : ''
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            isUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'
          )}
        >
          {format(message.timestamp, 'p')}
        </p>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src="https://placehold.co/40x40/8cb0eA/1A202C.png?text=U" />
          <AvatarFallback>
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

interface ChatUIWrapperProps {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  containerClassName?: string;
  headerClassName?: string;
  headerExtras?: React.ReactNode;
  title?: string;
  accentColor?: string;
}

export default function ChatUIWrapper({
  messages,
  isLoading,
  sendMessage,
  containerClassName,
  headerClassName,
  headerExtras,
  title = 'Kommander.ai Chat',
  accentColor,
}: ChatUIWrapperProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full bg-card shadow-xl rounded-lg border border-border',
        containerClassName
      )}
    >
      <div
        className={cn(
          'p-4 border-b border-border flex items-center justify-between',
          headerClassName
        )}
        style={accentColor ? { backgroundColor: accentColor, color: '#fff' } : undefined}
      >
        <h2 className="text-xl font-semibold font-headline">{title}</h2>
        {headerExtras}
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div ref={viewportRef} className="space-y-2">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 p-2 text-muted-foreground">
              <Bot className="w-5 h-5 animate-pulse" />
              <span>{title} is typing...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border bg-background/50 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 !bg-white text-black focus:ring-primary focus:border-primary"
            aria-label="Chat input"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" aria-label="Send message">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

