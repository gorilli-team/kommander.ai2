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
  ExternalLink,
  History
} from 'lucide-react';
import AgentControlBar from './AgentControlBar';
import { Input } from '@/frontend/components/ui/input';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import { useContextualRequest } from '@/frontend/hooks/useContextualRequest';

export interface ConversationMessageDisplay {
  role: 'user' | 'assistant' | 'agent';
  text: string;
  timestamp: string;
}

export interface ControlHistoryEntry {
  action: 'take' | 'release';
  byUserId?: string;
  byEmail?: string | null;
  byName?: string | null;
  at: string;
}

export interface ConversationDisplayItem {
  id: string;
  messages: ConversationMessageDisplay[];
  site?: string;
  createdAt?: string;
  updatedAt?: string;
  handledBy?: 'bot' | 'agent';
  controlHistory?: ControlHistoryEntry[];
}

interface Props {
  conversations: ConversationDisplayItem[];
}

export default function ConversationsClient({ conversations: initial }: Props) {
  const [conversations, setConversations] = useState(() => initial || []);
  // Check URL parameter for conversation ID
  const [selectedId, setSelectedId] = useState(() => {
    // Server-side rendering safe URL parameter extraction
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationIdFromUrl = urlParams.get('id');
      // Verify that the conversation ID exists in initial data
      if (conversationIdFromUrl && initial?.some(c => c.id === conversationIdFromUrl)) {
        console.log('[ConversationsClient] Found conversation ID in URL:', conversationIdFromUrl);
        return conversationIdFromUrl;
      }
    }
    return initial?.[0]?.id || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'bot' | 'agent'>('all');
  const [siteFilter, setSiteFilter] = useState<'all' | string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'widget' | 'dashboard'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'messages'>('newest');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [failedRequests, setFailedRequests] = useState<Set<string>>(new Set());
  
  const { currentContext, currentOrganization } = useOrganization();
  const { fetchWithContext } = useContextualRequest();
  
  const selected = conversations.find((c) => c.id === selectedId);
  
  // Function to fetch conversations with current context
  const fetchConversations = async () => {
    if (typeof window === 'undefined') return;  // Ensure fetch only runs on client side
    setIsLoadingConversations(true);
    try {
      const response = await fetchWithContext('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        // Reset selected ID if current selection doesn't exist in new data
        // Preserve current selection even if not present in the just-fetched list;
        // selection will be hydrated by the specific-conversation fetch effect.
        // Clear failed requests when conversations are refreshed
        setFailedRequests(new Set());
      } else {
        console.error('Failed to fetch conversations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };
  
  // Effect to mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Effect to handle URL parameters after mount
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationIdFromUrl = urlParams.get('id');
    
    if (conversationIdFromUrl && conversationIdFromUrl !== selectedId) {
      console.log('[ConversationsClient] URL conversation ID changed:', conversationIdFromUrl);
      
      // Check if conversation exists in current data
      const existsInCurrent = conversations.some(c => c.id === conversationIdFromUrl);
      
      if (existsInCurrent) {
        console.log('[ConversationsClient] Conversation found in current data, selecting it');
        setSelectedId(conversationIdFromUrl);
      } else {
        console.log('[ConversationsClient] Conversation not found in current data, fetching specific conversation');
        
        // Try to fetch the specific conversation
        const fetchSpecificConversation = async () => {
          try {
            const response = await fetch(`/api/conversations/${conversationIdFromUrl}`);
            if (response.ok) {
              const conversationData = await response.json();
              console.log('[ConversationsClient] Fetched specific conversation:', conversationData);
              
              // Add the conversation to our list if it doesn't exist
              setConversations(prev => {
                const exists = prev.some(c => c.id === conversationIdFromUrl);
                if (!exists) {
                  return [conversationData, ...prev];
                }
                return prev;
              });
              
              setSelectedId(conversationIdFromUrl);
            } else if (response.status === 404) {
              console.warn('[ConversationsClient] Conversation not found (404):', conversationIdFromUrl);
              // Remove the invalid ID from URL
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('id');
              window.history.replaceState({}, '', newUrl.toString());
            } else {
              console.error('[ConversationsClient] Error fetching specific conversation:', response.status);
            }
          } catch (error) {
            console.error('[ConversationsClient] Error fetching specific conversation:', error);
          }
        };
        
        fetchSpecificConversation();
      }
    }
  }, [isMounted, selectedId, conversations]);
  
  // Effect to reload conversations when context changes
  useEffect(() => {
    if (!isMounted) return;
    console.log('[ConversationsClient] Context changed:', currentContext, currentOrganization?.id);
    fetchConversations();
  }, [currentContext, currentOrganization?.id, isMounted]);
  
  // Get unique sites for filter
  const uniqueSites = useMemo(() => {
    const sites = conversations.map(c => c.site).filter(Boolean);
    return ['all', ...Array.from(new Set(sites))];
  }, [conversations]);
  
  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply handler filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(c => c.handledBy === filterBy);
    }
    
    // Apply site filter
    if (siteFilter !== 'all') {
      filtered = filtered.filter(c => c.site === siteFilter);
    }
    
    // Apply type filter (widget vs dashboard)
    if (typeFilter !== 'all') {
      if (typeFilter === 'widget') {
        // Widget conversations have conversationId starting with 'konv-'
        filtered = filtered.filter(c => c.id.startsWith('konv-'));
      } else if (typeFilter === 'dashboard') {
        // Dashboard conversations don't start with 'konv-'
        filtered = filtered.filter(c => !c.id.startsWith('konv-'));
      }
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(c => {
        const conversationDate = new Date(c.updatedAt || c.createdAt || 0);
        switch (dateFilter) {
          case 'today':
            return conversationDate >= today;
          case 'week':
            return conversationDate >= weekAgo;
          case 'month':
            return conversationDate >= monthAgo;
          default:
            return true;
        }
      });
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(c => 
        (c.messages || []).some(m => 
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
          return (b.messages?.length || 0) - (a.messages?.length || 0);
        case 'newest':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });
    
    return filtered;
  }, [conversations, searchQuery, filterBy, siteFilter, dateFilter, typeFilter, sortBy]);
  
  // Analytics data
  const analytics = useMemo(() => {
    const total = conversations.length;
    const botHandled = conversations.filter(c => c.handledBy === 'bot').length;
    const agentHandled = conversations.filter(c => c.handledBy === 'agent').length;
    const totalMessages = conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
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
    if (!selectedId || !isMounted || failedRequests.has(selectedId)) return;
    let interval: NodeJS.Timeout;
    const fetchConv = async () => {
      try {
        const res = await fetchWithContext(`/api/conversations/${selectedId}`);
        if (res.ok) {
          const data: ConversationDisplayItem = await res.json();
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, ...data } : c)),
          );
        } else if (res.status === 404) {
          // Conversation was deleted or doesn't exist, reset selection
          console.warn(`Conversation ${selectedId} not found (404), resetting selection`);
          setFailedRequests(prev => new Set([...prev, selectedId]));
          setSelectedId('');
          // Optionally refresh the conversations list
          fetchConversations();
        } else {
          console.error(`Error fetching conversation ${selectedId}:`, res.status, res.statusText);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
    if (selectedId) {
      fetchConv();
      interval = setInterval(fetchConv, 3000);
    }
    return () => clearInterval(interval);
  }, [selectedId, isMounted, failedRequests]);

  useEffect(() => {
    if (!selected || !selected.messages || selected.messages.length === 0) return;
    const last = selected.messages[selected.messages.length - 1];
    if (last && last.role === 'user' && typeof window !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification('New message', { body: last.text });
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
          messages_count: c.messages?.length || 0,
          messages: c.messages || []
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
          <div className="p-2 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
            <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold">Overview</h2>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total}</div>
              <p className="text-xs text-muted-foreground">Total conversations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handled by AI</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.botHandled}</div>
              <p className="text-xs text-muted-foreground">{analytics.botPercentage}% of total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handled by Operators</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.agentHandled}</div>
              <p className="text-xs text-muted-foreground">{analytics.agentPercentage}% of total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages per Conversation</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgMessagesPerConversation}</div>
              <p className="text-xs text-muted-foreground">Average messages</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Tabs for Conversations and Analytics */}
      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations">
          {/* Enhanced Conversations Interface */}
          <div className="space-y-4">
            {/* Search and Filter Toolbar */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search in conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                  </div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {/* Handler Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            {filterBy === 'all' ? 'All' : filterBy === 'bot' ? 'AI' : 'Operators'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Filter by handler</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setFilterBy('all')}>All</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterBy('bot')}>Handled by AI</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterBy('agent')}>Handled by Operators</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Site Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Globe className="h-4 w-4 mr-2" />
                            {siteFilter === 'all' ? 'All sites' : siteFilter}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Filter by site</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {uniqueSites.map((site) => (
                            <DropdownMenuItem 
                              key={site} 
                              onClick={() => setSiteFilter(site)}
                            >
                              {site === 'all' ? 'All sites' : site}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Date Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Clock className="h-4 w-4 mr-2" />
                            {dateFilter === 'all' ? 'All dates' : 
                             dateFilter === 'today' ? 'Today' :
                             dateFilter === 'week' ? 'This week' : 'This month'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Filter by date</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDateFilter('all')}>All dates</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDateFilter('today')}>Today</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDateFilter('week')}>This week</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDateFilter('month')}>This month</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Type Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {typeFilter === 'all' ? 'All types' : 
                             typeFilter === 'widget' ? 'Widget' : 'Dashboard'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTypeFilter('all')}>All types</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTypeFilter('widget')}>Widget Conversations</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTypeFilter('dashboard')}>Dashboard Conversations</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Sort Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Clock className="h-4 w-4 mr-2" />
                            {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'By messages'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSortBy('newest')}>Newest</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('oldest')}>Oldest</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('messages')}>By message count</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchConversations}
              disabled={isLoadingConversations}
              className="flex items-center gap-2"
            >
              {isLoadingConversations ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </Button>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {filteredConversations.length} results
                      </Badge>
                    </div>
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
                    <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      Conversations
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredConversations.length} of {conversations.length} conversations
                      {currentContext === 'organization' && currentOrganization && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                          {currentOrganization.name}
                        </span>
                      )}
                      {currentContext === 'personal' && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                          Personal
                        </span>
                      )}
                    </p>
                  </CardHeader>
                  <ScrollArea className="h-[calc(70vh-8rem)]">
                    <div className="p-2 space-y-2">
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">
                            {searchQuery ? 'No results found' : 'No conversations yet'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery ? 'Try changing search terms' : 'Conversations will appear here'}
                          </p>
                        </div>
                      ) : (
                        filteredConversations.map((c) => {
                          const messages = c.messages || [];
                          const last = messages.length > 0 ? messages[messages.length - 1] : null;
                          const isSelected = selectedId === c.id;
                          const messageCount = messages.length;
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
                              onClick={() => {
                                if (!failedRequests.has(c.id)) {
                                  setSelectedId(c.id);
                                }
                              }}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-2 mb-1">
                                      {last?.text || 'New conversation'}
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
                                        Copy link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
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
                          : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                      )}
                                    >
                                      {c.handledBy === 'agent' ? (
                                        <><User className="h-3 w-3 mr-1" />Operator</>
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
                            Conversation {selected.id.slice(-8)}
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
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            )}
                          >
                            {selected.handledBy === 'agent' ? (
                              <><User className="h-3 w-3 mr-1" />Operator</>
                            ) : (
                              <><Bot className="h-3 w-3 mr-1" />AI</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden">
                      {/* Control history */}
                      <div className="mb-4 p-3 border rounded-md bg-muted/40">
                        <div className="flex items-center gap-2 mb-2">
                          <History className="h-4 w-4" />
                          <span className="text-sm font-medium">Control history</span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-auto pr-1">
                          {Array.isArray(selected.controlHistory) && selected.controlHistory.length > 0 ? (
                            selected.controlHistory
                              .slice()
                              .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                              .map((e, i) => (
                                <div key={`${e.at}-${i}`} className="text-xs text-muted-foreground flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={e.action === 'take' ? 'default' : 'secondary'} className="uppercase">
                                      {e.action}
                                    </Badge>
                                    <span className="text-foreground">{e.byName || e.byEmail || e.byUserId || 'Unknown'}</span>
                                  </div>
                                  <span title={format(new Date(e.at), 'PPpp')}>
                                    {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                                  </span>
                                </div>
                              ))
                          ) : (
                            <div className="text-xs text-muted-foreground">Nessun evento di controllo ancora</div>
                          )}
                        </div>
                      </div>

                      <ScrollArea className="h-full py-4">
                        <div className="space-y-4">
                          {(selected.messages || []).map((msg, idx) => {
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
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
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
                          const res = await fetchWithContext(`/api/conversations/${selected.id}/agent-message`, {
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
                                  ? { ...c, messages: [...(c.messages || []), msg] }
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
                          placeholder="Write a response as an operator..."
                        />
                        <Button type="submit" size="sm">
                          Send
                        </Button>
                      </form>
                    )}
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Select a conversation to view details</p>
                      <p className="text-sm text-muted-foreground">Messages will appear here</p>
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
                <CardTitle>Handler Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <span>Handled by AI</span>
                    </div>
                    <span className="font-bold">{analytics.botPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${analytics.botPercentage}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-500" />
                      <span>Handled by Operators</span>
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
                <CardTitle>Message Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analytics.totalMessages}</p>
                      <p className="text-sm text-muted-foreground">Total messages</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analytics.avgMessagesPerConversation}</p>
                      <p className="text-sm text-muted-foreground">Average per conversation</p>
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