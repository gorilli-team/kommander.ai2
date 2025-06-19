"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X } from 'lucide-react';
import { useWidgetChat } from '@/frontend/hooks/useWidgetChat';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { cn } from '@/frontend/lib/utils';

interface ChatbotWidgetProps {
  userId: string;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const { messages, isLoading, sendMessage } = useWidgetChat(userId);
  const [inputValue, setInputValue] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary text-primary-foreground p-3 shadow-lg"
      >
        Chat
      </button>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 h-96 bg-background border border-border rounded-lg flex flex-col shadow-xl">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Kommander.ai</h2>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div ref={viewportRef} className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex items-end space-x-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role !== 'user' && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="https://placehold.co/24x24/1a56db/FFFFFF.png?text=K" />
                      <AvatarFallback><Bot size={14} /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-xs rounded-lg px-3 py-2 text-sm shadow',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="https://placehold.co/24x24/8cb0ea/1A202C.png?text=U" />
                      <AvatarFallback><User size={14} /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="text-muted-foreground text-sm flex items-center space-x-2">
                  <Bot className="w-4 h-4 animate-pulse" />
                  <span>Typing...</span>
                </div>
              )}
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="p-3 border-t border-border flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} aria-label="Send">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
