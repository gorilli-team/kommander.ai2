'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { cn } from '@/frontend/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  MoreVertical, 
  UserCircle, 
  Search, 
  Filter, 
  Download, 
  Bot, 
  User, 
  Clock,
  MessageSquare,
  Globe,
  RefreshCw,
  Archive,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'bot' | 'agent'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'messages'>('newest');
  const [isExporting, setIsExporting] = useState(false);
  
  const selected = conversations.find((c) => c.id === selectedId);
  
  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply handler filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(c => c.handledBy === filterBy);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(c => 
        c.messages.some(m => 
          m.text.toLowerCase().includes(searchQuery.toLowerCase())
        ) || 
        c.site?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        case 'messages':
          return b.messages.length - a.messages.length;
        case 'newest':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });
    
    return filtered;
  }, [conversations, searchQuery, filterBy, sortBy]);
  
  // Analytics data
  const analytics = useMemo(() => {
    const total = conversations.length;
    const botHandled = conversations.filter(c => c.handledBy === 'bot').length;
    const agentHandled = conversations.filter(c => c.handledBy === 'agent').length;
    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
    const avgMessagesPerConversation = total > 0 ? (totalMessages / total).toFixed(1) : '0';
    
    return {
      total,
      botHandled,
      agentHandled,
      totalMessages,
      avgMessagesPerConversation,
      botPercentage: total > 0 ? ((botHandled / total) * 100).toFixed(1) : '0',
      agentPercentage: total > 0 ? ((agentHandled / total) * 100).toFixed(1) : '0'
    };
  }, [conversations]);

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
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataToExport = {
        exported_at: new Date().toISOString(),
        total_conversations: conversations.length,
        analytics,
        conversations: conversations.map(c => ({
          id: c.id,
          site: c.site,
          handled_by: c.handledBy,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
          messages_count: c.messages.length,
          messages: c.messages
        }))
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const copyConversationLink = (id: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/conversations?id=${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview sempre visibile */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold">Overview</h2>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Conversazioni</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total}</div>
              <p className="text-xs text-muted-foreground">Conversazioni totali</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestite da AI</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.botHandled}</div>
              <p className="text-xs text-muted-foreground">{analytics.botPercentage}% del totale</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestite da Operatori</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.agentHandled}</div>
              <p className="text-xs text-muted-foreground">{analytics.agentPercentage}% del totale</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messaggi per Conversazione</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgMessagesPerConversation}</div>
              <p className="text-xs text-muted-foreground">Media messaggi</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Tabs per Conversazioni e Analytics */}
      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations">Conversazioni</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations">
          {/* Enhanced Conversations Interface */}
          <div className="space-y-4">
            {/* Search and Filter Toolbar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-1 gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Cerca nelle conversazioni..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          {filterBy === 'all' ? 'Tutti' : filterBy === 'bot' ? 'AI' : 'Operatori'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Filtro per gestore</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterBy('all')}>Tutti</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterBy('bot')}>Gestite da AI</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterBy('agent')}>Gestite da Operatori</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Clock className="h-4 w-4 mr-2" />
                          {sortBy === 'newest' ? 'Più recenti' : sortBy === 'oldest' ? 'Più vecchie' : 'Per messaggi'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Ordina per</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSortBy('newest')}>Più recenti</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('oldest')}>Più vecchie</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('messages')}>Per numero messaggi</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex items-center gap-2"
                    >
                      {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Esporta
                    </Button>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {filteredConversations.length} risultati
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Conversations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 min-h-[70vh]">
              <aside className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Conversazioni
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredConversations.length} di {conversations.length} conversazioni
                    </p>
                  </CardHeader>
                  <ScrollArea className="h-[calc(70vh-8rem)]">
                    <div className="p-2 space-y-2">
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">
                            {searchQuery ? 'Nessun risultato trovato' : 'Nessuna conversazione ancora'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery ? 'Prova a modificare i termini di ricerca' : 'Le conversazioni appariranno qui'}
                          </p>
                        </div>
                      ) : (
                        filteredConversations.map((c) => {
                          const last = c.messages[c.messages.length - 1];
                          const isSelected = selectedId === c.id;
                          const messageCount = c.messages.length;
                          const timeAgo = c.updatedAt ? formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true }) : '';
                          
                          return (
                            <div
                              key={c.id}
                              className={cn(
                                'p-4 rounded-lg cursor-pointer transition-all duration-200 border hover:shadow-md',
                                isSelected 
                                  ? 'bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20' 
                                  : 'hover:bg-muted/50 border-border/50 hover:border-border'
                              )}
                              onClick={() => setSelectedId(c.id)}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-2 mb-1">
                                      {last?.text || 'Nuova conversazione'}
                                    </p>
                                    {c.site && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                        <Globe className="h-3 w-3" />
                                        {c.site}
                                      </p>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyConversationLink(c.id); }}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copia link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Apri dettagli
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Elimina
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={c.handledBy === 'agent' ? 'default' : 'secondary'}
                                      className={cn(
                                        "text-xs",
                                        c.handledBy === 'agent' 
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                      )}
                                    >
                                      {c.handledBy === 'agent' ? (
                                        <><User className="h-3 w-3 mr-1" />Operatore</>
                                      ) : (
                                        <><Bot className="h-3 w-3 mr-1" />AI</>
                                      )}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {messageCount} msg
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {timeAgo}
                                  </p>
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

              <section className="lg:col-span-4">
                {selected ? (
                  <Card className="h-full flex flex-col">
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Conversazione {selected.id.slice(-8)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selected.updatedAt ? format(new Date(selected.updatedAt), 'PPpp') : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selected.site && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {selected.site}
                            </Badge>
                          )}
                          <Badge
                            variant={selected.handledBy === 'agent' ? 'default' : 'secondary'}
                            className={cn(
                              selected.handledBy === 'agent' 
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            )}
                          >
                            {selected.handledBy === 'agent' ? (
                              <><User className="h-3 w-3 mr-1" />Operatore</>
                            ) : (
                              <><Bot className="h-3 w-3 mr-1" />AI</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full py-4">
                        <div className="space-y-4">
                          {selected.messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const isAgent = msg.role === 'agent';
                            return (
                              <div key={idx} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                                <div className={cn('flex items-start gap-3 max-w-[85%]', isUser ? 'flex-row-reverse' : 'flex-row')}>
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    isUser 
                                      ? "bg-primary text-primary-foreground"
                                      : isAgent
                                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  )}>
                                    {isUser ? (
                                      <User className="h-4 w-4" />
                                    ) : isAgent ? (
                                      <User className="h-4 w-4" />
                                    ) : (
                                      <Bot className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div
                                    className={cn(
                                      'rounded-2xl px-4 py-3 shadow-sm',
                                      isUser
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted border border-border'
                                    )}
                                  >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                    <p className={cn(
                                      'text-xs mt-2',
                                      isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    )}>
                                      {format(new Date(msg.timestamp), 'HH:mm')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
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
                        className="p-4 border-t flex gap-3"
                      >
                        <Input
                          name="agentMsg"
                          className="flex-1"
                          placeholder="Scrivi una risposta come operatore..."
                        />
                        <Button type="submit" size="sm">
                          Invia
                        </Button>
                      </form>
                    )}
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Seleziona una conversazione per visualizzare i dettagli</p>
                      <p className="text-sm text-muted-foreground">I messaggi appariranno qui</p>
                    </div>
                  </Card>
                )}
              </section>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Gestori</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-500" />
                      <span>Gestite da AI</span>
                    </div>
                    <span className="font-bold">{analytics.botPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics.botPercentage}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-500" />
                      <span>Gestite da Operatori</span>
                    </div>
                    <span className="font-bold">{analytics.agentPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.agentPercentage}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Statistiche Messaggi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analytics.totalMessages}</p>
                      <p className="text-sm text-muted-foreground">Totale messaggi</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analytics.avgMessagesPerConversation}</p>
                      <p className="text-sm text-muted-foreground">Media per conversazione</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}