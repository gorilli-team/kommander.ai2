
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat, type Message } from '@/frontend/hooks/useChat';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  Bot, Send, Mic, FileText, ChevronUp, ChevronDown, 
  HelpCircle, User, Headphones, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import { formatDate } from '@/frontend/lib/formatDate';
import { format } from 'date-fns';
import { MarkdownRenderer } from './MarkdownRenderer';
import VoiceRecorder from './VoiceRecorder';
import { capitalizeFirstLetter, applyRealtimeCapitalization } from '@/frontend/lib/textUtils';

function ChatMessage({ message }: { message: Message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';
  const hasSources = message.sources && message.sources.length > 0;

  return (
    <div
      className={cn(
        'flex items-end space-x-2 sm:space-x-3 py-2 sm:py-3 px-1',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar rimosso per layout più pulito */}
      <div
        className={cn(
          'max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-xl rounded-xl px-4 sm:px-5 py-3 sm:py-4 shadow-md', /* Aumentato spazio orizzontale */
          isUser ? 'bg-primary text-primary-foreground rounded-br-none' : '',
          isAssistant
            ? 'bg-card text-card-foreground rounded-bl-none border border-border'
            : isAgent
            ? 'bg-accent text-accent-foreground rounded-bl-none border border-border'
            : '',
          isSystem ? 'bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-bl-none' : ''
        )}
      >
        {isUser ? (
          <p className="text-sm sm:text-base whitespace-pre-wrap break-words font-medium">{message.content}</p>
        ) : (
          <MarkdownRenderer 
            content={message.content} 
            className="text-xs sm:text-sm leading-relaxed"
          />
        )}
        
        {/* Source Citations */}
        {hasSources && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSources(!showSources)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-3 h-3 mr-1" />
              Sources ({message.sources?.length})
              {showSources ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
            
            {showSources && (
              <div className="mt-1 space-y-1">
                {message.sources?.map((source, index) => (
                  <Badge key={index} variant="secondary" className="text-xs mr-1 mb-1">
                    {source.type === 'faq' ? (
                      <><HelpCircle className="w-3 h-3 mr-1" />FAQ: {source.title}</>
                    ) : (
                      <><FileText className="w-3 h-3 mr-1" />{source.title}</>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        <p className={cn(
             "text-xs mt-1.5",
             isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
           )}>
          {format(message.timestamp, 'p')}
        </p>
      </div>
      {/* Avatar utente rimosso per layout più pulito */}
    </div>
  );
}

interface ChatUIProps {
  containerClassName?: string;
  headerClassName?: string;
  headerExtras?: React.ReactNode;
  title?: string;
  accentColor?: string;
  organizationId?: string;
}

export default function ChatUI({
  containerClassName,
  headerClassName,
  headerExtras,
  title = 'Kommander.ai Chat',
  accentColor,
  organizationId,
}: ChatUIProps) {
  const { messages, isLoading, sendMessage } = useChat(organizationId);
  const [inputValue, setInputValue] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevInputValue = useRef('');

  // Auto-scroll disabilitato durante streaming - lascia che controlli l'utente
  // useEffect(() => {
  //   if (viewportRef.current) {
  //     viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  //   }
  // }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setInputValue(text);
    setShowVoiceRecorder(false);
  };

  return (
    <div className={cn(
        "flex flex-col h-full w-full bg-card shadow-xl rounded-lg border border-border",
        containerClassName // Allows custom class for container if needed (e.g., widget specific)
        )}>
      <div
        className={cn(
          'p-4 border-b border-border flex items-center justify-between',
          headerClassName
        )}
        style={accentColor ? { backgroundColor: accentColor, color: '#fff' } : undefined}
      >
        <h2 className="text-xl font-semibold font-headline">
          {title}
        </h2>
        {headerExtras}
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div ref={viewportRef} className="space-y-2">
         {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
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

      <div className="p-3 sm:p-4 border-t border-border bg-background/50 rounded-b-lg space-y-3">
        {showVoiceRecorder && (
          <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
            <VoiceRecorder 
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={isLoading}
            />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              // Applica capitalizzazione automatica
              const capitalizedValue = applyRealtimeCapitalization(newValue, inputValue);
              setInputValue(capitalizedValue);
            }}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 !bg-white text-black focus:ring-primary focus:border-primary text-sm sm:text-base"
            aria-label="Chat input"
            autoComplete="off"
          />
          
          <Button
            type="button"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            variant="outline"
            size="icon"
            aria-label="Voice input"
            className="h-9 w-9 sm:h-10 sm:w-10"
            disabled={isLoading}
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()} 
            size="icon" 
            aria-label="Send message"
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
