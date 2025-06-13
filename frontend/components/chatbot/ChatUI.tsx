
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat, type Message } from '@/frontend/hooks/useChat';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Send, User, Bot, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/frontend/lib/utils';

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
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
          <AvatarImage src="https://placehold.co/40x40/1a56db/FFFFFF.png?text=K" data-ai-hint="bot avatar" />
          <AvatarFallback>{isAssistant ? <Bot size={18}/> : <AlertTriangle size={18}/>}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-3 shadow-md',
          isUser ? 'bg-primary text-primary-foreground rounded-br-none' : '',
          isAssistant ? 'bg-card text-card-foreground rounded-bl-none border border-border' : '',
          isSystem ? 'bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-bl-none' : ''
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={cn(
             "text-xs mt-1.5",
             isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
           )}>
          {format(message.timestamp, 'p')}
        </p>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src="https://placehold.co/40x40/8cb0eA/1A202C.png?text=U" data-ai-hint="user avatar" />
          <AvatarFallback><User size={18}/></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default function ChatUI() {
  const { messages, isLoading, sendMessage } = useChat();
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
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-card shadow-xl rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold font-headline text-foreground">Kommander.ai Chat</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div ref={viewportRef} className="space-y-2">
         {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 p-2 text-muted-foreground">
              <Bot className="w-5 h-5 animate-pulse" />
              <span>Kommander.ai is typing...</span>
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
            className="flex-1 bg-background focus:ring-primary focus:border-primary"
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
