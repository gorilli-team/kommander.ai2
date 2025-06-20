'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X } from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
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
  const { messages, isLoading, sendMessage, addMessage } = useWidgetChat(userId);
  const [inputValue, setInputValue] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      addMessage('assistant', 'Ciao, sono Kommander.ai! Come posso aiutarti oggi?');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentDate = format(new Date(), 'dd MMM yyyy', { locale: it });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E3A8A] text-white shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Apri chat"
      >
        ⌘
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 sm:bottom-20 sm:right-4 sm:inset-auto z-50 flex w-full h-full sm:w-[400px] sm:h-[600px] flex-col bg-card border border-border rounded-none sm:rounded-lg shadow-xl"
          >
            <div className="px-4 py-3 flex items-center justify-between bg-[#1E3A8A] text-white rounded-t-lg">
              <span className="font-semibold">Kommander.ai – Trial</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white border-none">Online</Badge>
                <span className="text-sm">{currentDate}</span>
                <button onClick={() => setOpen(false)} aria-label="Close" className="ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div ref={viewportRef} className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end space-x-3 py-3 px-1',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {msg.role !== 'user' && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src="https://placehold.co/40x40/1a56db/FFFFFF.png?text=K" />
                        <AvatarFallback>
                          <Bot size={18} />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[65%] rounded-lg px-3 py-2 shadow-md text-sm',
                        msg.role === 'user'
                          ? 'bg-[#1E3A8A] text-white rounded-br-none'
                          : 'bg-card text-card-foreground rounded-bl-none border border-border',
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={cn(
                          'text-xs mt-1.5',
                          msg.role === 'user'
                            ? 'text-primary-foreground/70 text-right'
                            : 'text-muted-foreground text-left',
                        )}
                      >
                        {format(msg.timestamp, 'p')}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src="https://placehold.co/40x40/8cb0ea/1A202C.png?text=U" />
                        <AvatarFallback>
                          <User size={18} />
                        </AvatarFallback>
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
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border bg-background/50 rounded-b-lg flex items-center space-x-3"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Scrivi qui…"
                disabled={isLoading}
                className="flex-1 bg-background focus:ring-primary focus:border-primary"
              />
              <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} aria-label="Invia">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
