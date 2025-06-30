'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Card, CardContent } from '@/frontend/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover';
import { cn } from '@/frontend/lib/utils';
import { format } from 'date-fns';
import { MoreVertical, UserCircle } from 'lucide-react';
import AgentControlBar from './AgentControlBar';
import { Input } from '@/frontend/components/ui/input';

export interface ConversationMessageDisplay {
  role: 'user' | 'assistant' | 'agent';
  text: string;
  timestamp: string;
}

export interface ConversationDisplayItem {
  id: string;
  messages: ConversationMessageDisplay[];
  site?: string;
  createdAt?: string;
  updatedAt?: string;
  handledBy?: 'bot' | 'agent';
}

interface Props {
  conversations: ConversationDisplayItem[];
}

export default function ConversationsClient({ conversations: initial }: Props) {
  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id || '');
  const selected = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    let interval: NodeJS.Timeout;
    const fetchConv = async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}`);
        if (res.ok) {
          const data: ConversationDisplayItem = await res.json();
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, ...data } : c)),
          );
        }
      } catch {
        // ignore
      }
    };
    fetchConv();
    interval = setInterval(fetchConv, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    const last = selected.messages[selected.messages.length - 1];
    if (last && last.role === 'user' && typeof window !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification('Nuovo messaggio', { body: last.text });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [selected]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[70vh]">
      <aside className="lg:col-span-1">
        <Card className="h-full">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Conversazioni Recenti
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {conversations.length} conversazioni trovate
            </p>
          </div>
          <ScrollArea className="h-[calc(70vh-8rem)]">
            <div className="p-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-muted-foreground">Nessuna conversazione ancora</p>
                  <p className="text-sm text-muted-foreground mt-1">Le conversazioni appariranno qui</p>
                </div>
              ) : (
                conversations.map((c) => {
                  const last = c.messages[c.messages.length - 1];
                  const isSelected = selectedId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        'p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 border',
                        isSelected 
                          ? 'bg-primary/10 border-primary/20 shadow-sm' 
                          : 'hover:bg-muted/50 border-transparent hover:border-border'
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          isSelected ? "bg-primary" : "bg-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {last?.text || 'Nuova conversazione'}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {c.updatedAt ? format(new Date(c.updatedAt), 'dd/MM HH:mm') : ''}
                            </p>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              c.handledBy === 'agent' 
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            )}>
                              {c.handledBy === 'agent' ? 'Operatore' : 'AI'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </aside>

      <section className="flex-1">
        {selected ? (
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b rounded-t-lg">
              <h2 className="text-lg font-semibold">
                Conversazione del {selected.updatedAt ? format(new Date(selected.updatedAt), 'Pp') : ''}
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

            <CardContent className="flex-1 overflow-y-auto space-y-2 pt-4">
              {selected.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isAgent = msg.role === 'agent';
                return (
                  <div key={idx} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2 max-w-[75%]',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : isAgent
                          ? 'bg-accent text-accent-foreground rounded-bl-none border border-border'
                          : 'bg-muted text-foreground rounded-bl-none border border-border'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={cn('text-xs mt-1', isUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left')}>
                        {format(new Date(msg.timestamp), 'Pp')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <AgentControlBar
              conversationId={selected.id}
              initialHandledBy={selected.handledBy || 'bot'}
              onChange={(val) => {
                setConversations((prev) => prev.map((c) => (c.id === selected.id ? { ...c, handledBy: val } : c)));
              }}
            />
            {selected.handledBy === 'agent' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('agentMsg') as HTMLInputElement;
                  const text = input.value.trim();
                  if (!text) return;
                  const res = await fetch(`/api/conversations/${selected.id}/agent-message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                  });
                  if (res.ok) {
                    const msg: ConversationMessageDisplay = {
                      role: 'agent',
                      text,
                      timestamp: new Date().toISOString(),
                    };
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === selected.id
                          ? { ...c, messages: [...c.messages, msg] }
                          : c,
                      ),
                    );
                  }
                  input.value = '';
                }}
                className="p-2 border-t flex gap-2"
              >
                <Input
                  name="agentMsg"
                  className="flex-1"
                  placeholder="Scrivi una risposta"
                />
                <button type="submit" className="px-3 py-1 rounded bg-primary text-primary-foreground">Invia</button>
              </form>
            )}
          </Card>
        ) : (
          <div className="p-4 text-muted-foreground">Nessuna conversazione selezionata.</div>
        )}
      </section>
    </div>
  );
}