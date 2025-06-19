"use client";

import React, { useState } from 'react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { cn } from '@/frontend/lib/utils';
import { format } from 'date-fns';

export interface ConversationMessageDisplay {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ConversationDisplayItem {
  id: string;
  messages: ConversationMessageDisplay[];
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  conversations: ConversationDisplayItem[];
}

export default function ConversationsClient({ conversations }: Props) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || '');

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full space-x-4">
      <aside className="w-64 border-r border-border overflow-y-auto">
        {conversations.map((c) => {
          const last = c.messages[c.messages.length - 1];
          return (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'p-3 cursor-pointer border-b border-border',
                selectedId === c.id ? 'bg-accent' : 'hover:bg-muted'
              )}
            >
              <p className="text-sm font-medium truncate">
                {last?.text || 'Nuova conversazione'}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.updatedAt ? format(new Date(c.updatedAt), 'Pp') : ''}
              </p>
            </div>
          );
        })}
      </aside>
      <section className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="flex flex-col h-full">
            <h1 className="text-xl font-headline font-semibold mb-2 px-2">
              Conversazione del{' '}
              {selected.updatedAt
                ? format(new Date(selected.updatedAt), 'Pp')
                : ''}
            </h1>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {selected.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2 max-w-[75%]',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted text-foreground rounded-bl-none border border-border'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          msg.role === 'user'
                            ? 'text-primary-foreground/70 text-right'
                            : 'text-muted-foreground text-left'
                        )}
                      >
                        {format(new Date(msg.timestamp), 'Pp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="p-4">Nessuna conversazione selezionata.</div>
        )}
      </section>
    </div>
  );
}
