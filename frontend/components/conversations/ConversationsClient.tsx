'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/frontend/components/ui/popover';
import { cn } from '@/frontend/lib/utils';
import { format } from 'date-fns';
import { MoreVertical, UserCircle } from 'lucide-react';

export interface ConversationMessageDisplay {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ConversationDisplayItem {
  id: string;
  messages: ConversationMessageDisplay[];
  site?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  conversations: ConversationDisplayItem[];
}

export default function ConversationsClient({ conversations: initial }: Props) {
  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id || '');

  const selected = conversations.find((c) => c.id === selectedId);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId('');
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[80vh]">
      <aside className="md:w-72 w-full md:flex-shrink-0">
        <ScrollArea className="h-full bg-card border border-border rounded-lg">
          {conversations.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <div
                key={c.id}
                className={cn(
                  'p-3 flex items-start gap-2 border-b border-border last:border-b-0',
                  selectedId === c.id ? 'bg-muted' : 'hover:bg-accent'
                )}
              >
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedId(c.id)}>
                  <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {last?.text || 'Nuova conversazione'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.updatedAt ? format(new Date(c.updatedAt), 'Pp') : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </aside>
      <section className="flex-1">
        {selected ? (
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b rounded-t-lg">
              <h2 className="text-lg font-semibold">
                Conversazione del{' '}
                {selected.updatedAt ? format(new Date(selected.updatedAt), 'Pp') : ''}
              </h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 rounded hover:bg-accent" aria-label="Site info">
                      <UserCircle className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-48">
                    <p className="text-sm">{selected.site || 'Sito sconosciuto'}</p>
                  </PopoverContent>
                </Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-accent" aria-label="Azioni">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleDelete(selected.id)}>
                      Elimina
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {selected.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
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
            </CardContent>
          </Card>
        ) : (
          <div className="p-4 text-muted-foreground">Nessuna conversazione selezionata.</div>
        )}
      </section>
    </div>
  );
}