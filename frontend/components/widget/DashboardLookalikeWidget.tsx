
"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Send, User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/frontend/lib/utils';

// Static messages for visual replication
const staticMessages = [
  { id: '1', role: 'user' as const, content: 'Ciao, avrei bisogno di assistenza con il mio account.', timestamp: new Date(Date.now() - 60000 * 5) },
  { id: '2', role: 'assistant' as const, content: 'Ciao! Certo, come posso aiutarti oggi con il tuo account?', timestamp: new Date(Date.now() - 60000 * 4) },
  { id: '3', role: 'user' as const, content: 'Non riesco ad accedere alla sezione fatture.', timestamp: new Date(Date.now() - 60000 * 3) },
  { id: '4', role: 'assistant' as const, content: 'Capisco. Potresti verificare se hai i permessi corretti o se c\'è un messaggio di errore specifico?', timestamp: new Date(Date.now() - 60000 * 2) },
];

function StaticChatMessage({ message }: { message: typeof staticMessages[0] }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

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
          <AvatarFallback><Bot size={18}/></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-3 shadow-md',
          isUser ? 'bg-primary text-primary-foreground rounded-br-none' : '',
          isAssistant ? 'bg-card text-card-foreground rounded-bl-none border border-border' : ''
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

export default function DashboardLookalikeWidget() {
  return (
    // The container ensures it fills the iframe and uses theme's card styling
    // h-full and w-full ensure it takes the full dimensions of its parent (the iframe content area)
    <div className="flex flex-col h-full w-full bg-card text-foreground">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold font-headline text-foreground">Kommander.ai Chat</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
         {staticMessages.map((msg) => (
            <StaticChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background/50 rounded-b-lg">
        <form onSubmit={(e) => e.preventDefault()} className="flex items-center space-x-3">
          <Input
            type="text"
            value=""
            readOnly // Static, so input is not editable
            placeholder="Type your message..."
            className="flex-1 bg-background focus:ring-primary focus:border-primary"
            aria-label="Chat input"
          />
          <Button type="submit" disabled size="icon" aria-label="Send message">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
