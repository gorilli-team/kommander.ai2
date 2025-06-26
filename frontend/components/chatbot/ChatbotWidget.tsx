'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { useWidgetChat } from '@/frontend/hooks/useWidgetChat';
import ChatWindow from './ChatWindow';

interface ChatbotWidgetProps {
  userId: string;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const { messages, isLoading, sendMessage, addMessage, handledBy } = useWidgetChat(userId);
  const prevHandledBy = useRef<'bot' | 'agent'>('bot');
  const [botName, setBotName] = useState('Kommander.ai');
  const [botColor, setBotColor] = useState('#1E3A8A');

  useEffect(() => {
    fetch(`/api/settings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setBotName(data.name);
        if (data.color) setBotColor(data.color);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
      addMessage('system', 'Stai parlando con un operatore umano');
    }
    prevHandledBy.current = handledBy;
  }, [handledBy, addMessage]);

  useEffect(() => {
    if (open && messages.length === 0) {
      addMessage('assistant', `Ciao, sono ${botName}! Come posso aiutarti oggi?`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentDate = format(new Date(), 'dd MMM yyyy', { locale: it });

  const headerExtras = (
    <div className="flex items-center gap-2">
      <Badge className="bg-green-600 text-white border-none">Online</Badge>
      <span className="text-sm">{currentDate}</span>
      <button onClick={() => setOpen(false)} aria-label="Close" className="ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: botColor }}
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
            className="fixed inset-0 sm:bottom-20 sm:right-4 sm:inset-auto z-50 flex w-full h-full sm:w-[400px] sm:h-[600px]"
          >
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              sendMessage={sendMessage}
              containerClassName="flex flex-col w-full h-full bg-card border border-border rounded-none sm:rounded-lg shadow-xl"
              headerClassName="text-white"
              headerExtras={headerExtras}
              title={`${botName} – Trial`}
              accentColor={botColor}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
