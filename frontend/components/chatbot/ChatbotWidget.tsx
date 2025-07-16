'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Headphones, Paperclip, FileText } from 'lucide-react';
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
import { MarkdownRenderer } from './MarkdownRenderer';
import { FileUploader } from './FileUploader';
import { useFileProcessor, ProcessedFile } from '@/frontend/hooks/useFileProcessor';
import { capitalizeFirstLetter, applyRealtimeCapitalization } from '@/frontend/lib/textUtils';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

interface ChatbotWidgetProps {
  userId: string;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const { getCurrentContextId, currentContext, currentOrganization } = useOrganization();
  const currentContextId = getCurrentContextId() || userId;
  const { messages, isLoading, sendMessage, addMessage, handledBy } = useWidgetChat(currentContextId);
  const prevHandledBy = useRef<'bot' | 'agent'>('bot');
  const [inputValue, setInputValue] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const [botName, setBotName] = useState('Kommander.ai');
  const [botColor, setBotColor] = useState('#1E3A8A');
  const [showFileUploader, setShowFileUploader] = useState(false);
  const { getFilesContext, uploadedFiles } = useFileProcessor();

  // Fetch settings function
  const fetchSettings = React.useCallback(() => {
    console.log('[ChatbotWidget] Fetching settings for contextId:', currentContextId);
    fetch(`/api/settings/${currentContextId}`)
      .then(res => res.json())
      .then(data => {
        console.log('[ChatbotWidget] Settings received:', data);
        if (data.name) {
          console.log('[ChatbotWidget] Setting bot name to:', data.name);
          setBotName(data.name);
        }
        if (data.color) {
          console.log('[ChatbotWidget] Setting bot color to:', data.color);
          setBotColor(data.color);
        }
      })
      .catch((err) => {
        console.error('[ChatbotWidget] Error fetching settings:', err);
      });
  }, [currentContextId]);

  // Immediate fetch when context changes
  useEffect(() => {
    console.log('[ChatbotWidget] Context changed, fetching settings immediately');
    fetchSettings();
  }, [currentContext, currentOrganization?.id, fetchSettings]);

  // Reset messages when context changes
  useEffect(() => {
    console.log('[ChatbotWidget] Context changed, clearing messages');
    // Clear messages when switching contexts to start fresh
    if (messages.length > 0) {
      // We'll let the useWidgetChat hook handle the message reset based on contextId change
    }
  }, [currentContextId]);

  // Regular polling for settings changes
  useEffect(() => {
    const interval = setInterval(fetchSettings, 30000); // Reduced to 30 seconds
    return () => clearInterval(interval);
  }, [fetchSettings]);

  // Auto-scroll disabilitato - lascia che controlli l'utente durante streaming
  // useEffect(() => {
  //   if (viewportRef.current) {
  //     viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight });
  //   }
  // }, [messages]);

useEffect(() => {
    if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
      addMessage('system', 'You are speaking with a human operator');
    } else if (handledBy === 'bot' && prevHandledBy.current !== 'bot') {
      addMessage('system', 'You are now back to talking with the bot');
    }
    prevHandledBy.current = handledBy;
  }, [handledBy, addMessage]);

useEffect(() => {
    if (open && messages.length === 0) {
      addMessage('assistant', `Hello, I'm ${botName}! How can I help you today? 👋`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, botName]);

  // Auto-scroll disabilitato durante streaming - controllo utente
  // useEffect(() => {
  //   if (viewportRef.current) {
  //     viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight });
  //   }
  // }, [messages]);

  const currentDate = format(new Date(), 'dd MMM yyyy', { locale: it });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Get the context of files if present
    const filesContext = getFilesContext();
    
    sendMessage(inputValue, filesContext);
    setInputValue('');
    
    // Close the upload area after sending
    setShowFileUploader(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: botColor }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat"
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
            className="fixed inset-0 sm:bottom-20 sm:right-4 sm:inset-auto z-50 flex w-full h-full sm:w-[500px] sm:h-[750px] flex-col bg-card border border-border rounded-none sm:rounded-lg shadow-xl"
          >
            <div className="px-4 py-3 flex items-center justify-between rounded-t-lg text-white" style={{ backgroundColor: botColor }}>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{botName}</span>
                <Badge className="bg-white/20 text-white border-none text-xs">Live Preview</Badge>
              </div>
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
                    {/* Avatar rimosso per layout più pulito */}
                    <div
                      className={cn(
                        'max-w-[92%] rounded-lg px-5 py-4 shadow-md text-sm', /* Aumentata larghezza bolle per più spazio orizzontale */
                        msg.role === 'user'
                          ? 'text-white rounded-br-none'
                          : msg.role === 'agent'
                          ? 'bg-accent text-accent-foreground rounded-bl-none border border-border'
                          : 'bg-card text-card-foreground rounded-bl-none border border-border',
                      )}
                      style={msg.role === 'user' ? { backgroundColor: botColor } : undefined}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-base whitespace-pre-wrap font-medium">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer 
                          content={msg.content} 
                          className="text-sm leading-relaxed"
                        />
                      )}
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
                    {/* Avatar utente rimosso per layout più pulito */}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center justify-start p-2">
                    <div className="bg-card border border-border rounded-xl px-4 py-3 max-w-[85%] sm:max-w-xs">
                      <div className="flex items-center justify-center">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '-0.3s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '-0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* File Uploader */}
            {showFileUploader && (
              <div className="border-t border-border p-4 bg-muted/30">
                <FileUploader 
                  className="" 
                  userId={userId}
                  onFilesProcessed={(files) => {
                    if (files.length > 0) {
                      // Add system message to confirm the upload
                      const fileNames = files.map(f => f.name).join(', ');
                      addMessage('system', `📎 File uploaded: ${fileNames}\n\nNow you can ask me questions about the content of this file or request a summary.`);
                    }
                  }}
                />
              </div>
            )}
            
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border bg-white rounded-b-2xl space-y-3"
            >
              {/* Indicatore file caricati */}
              {uploadedFiles.length > 0 && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
                  <FileText className="w-3 h-3" />
                  <span>{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded</span>
                  <span>•</span>
                  <span>Included in the conversation</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFileUploader(!showFileUploader)}
                  className={cn(
                    "rounded-full",
                    showFileUploader && "bg-primary/10 text-primary"
                  )}
                  aria-label="Upload file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Applica capitalizzazione automatica
                    const capitalizedValue = applyRealtimeCapitalization(newValue, inputValue);
                    setInputValue(capitalizedValue);
                  }}
                  placeholder="Type here…"
                  disabled={isLoading}
                  className="flex-1 !bg-white text-black rounded-xl focus:ring-primary focus:border-primary"
                />
                
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !inputValue.trim()}
                  aria-label="Send"
                  className="rounded-full"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
