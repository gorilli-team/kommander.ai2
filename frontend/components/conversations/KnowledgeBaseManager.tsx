'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Separator } from '@/frontend/components/ui/separator';
import { 
  Database, 
  Search, 
  Brain, 
  TrendingUp, 
  Clock, 
  Filter,
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/frontend/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface KnowledgeBaseItem {
  id: string;
  originalQuery: string;
  originalResponse: string;
  revisedResponse: string;
  category: string;
  tags: string[];
  usageCount: number;
  effectiveness: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    conversationId?: string;
    messageId?: string;
    reviewer?: string;
    similarity?: number;
  };
}

interface KnowledgeBaseManagerProps {
  className?: string;
}

export const KnowledgeBaseManager = ({ className }: KnowledgeBaseManagerProps) => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'usage' | 'effectiveness'>('newest');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/knowledge-base');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBase(data.responses || []);
      } else {
        throw new Error('Failed to load knowledge base');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare la knowledge base",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchSimilarResponses = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          threshold: 0.7
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBase(data.results || []);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nella ricerca",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleItemStatus = async (id: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: newStatus
        }),
      });
      
      if (response.ok) {
        setKnowledgeBase(prev => 
          prev.map(item => 
            item.id === id ? { ...item, isActive: newStatus } : item
          )
        );
        
        toast({
          title: "Successo",
          description: `Risposta ${newStatus ? 'attivata' : 'disattivata'} con successo`,
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    }
  };

  const filteredItems = knowledgeBase.filter(item => {
    // Search filter
    if (searchQuery && !item.originalQuery.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.revisedResponse.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    
    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'usage':
        return b.usageCount - a.usageCount;
      case 'effectiveness':
        return b.effectiveness - a.effectiveness;
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const categories = [...new Set(knowledgeBase.map(item => item.category))];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Knowledge Base Manager
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gestisci e cerca nelle risposte revisionate approvate
        </p>
      </CardHeader>

      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cerca nelle risposte revisionate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => searchSimilarResponses(searchQuery)}
              disabled={searchLoading}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {searchLoading ? 'Ricerca...' : 'Ricerca Semantica'}
            </Button>
          </div>

          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Inattivi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Più recenti</SelectItem>
                <SelectItem value="oldest">Più vecchi</SelectItem>
                <SelectItem value="usage">Più usati</SelectItem>
                <SelectItem value="effectiveness">Più efficaci</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Totale Risposte</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{knowledgeBase.length}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Attive</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {knowledgeBase.filter(item => item.isActive).length}
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Utilizzi Totali</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">
              {knowledgeBase.reduce((sum, item) => sum + item.usageCount, 0)}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Efficacia Media</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {knowledgeBase.length > 0 
                ? (knowledgeBase.reduce((sum, item) => sum + item.effectiveness, 0) / knowledgeBase.length * 100).toFixed(1)
                : 0}%
            </p>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna risposta trovata</p>
                <p className="text-sm mt-1">
                  Prova a modificare i filtri di ricerca
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {item.isActive ? 'Attiva' : 'Inattiva'}
                      </Badge>
                      
                      <Badge variant="outline">{item.category}</Badge>
                      
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={item.isActive ? "outline" : "default"}
                        onClick={() => toggleItemStatus(item.id, !item.isActive)}
                      >
                        {item.isActive ? 'Disattiva' : 'Attiva'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Query Originale:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {item.originalQuery}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Risposta Revisionata:</h4>
                      <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                        {item.revisedResponse}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Utilizzi: {item.usageCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                        <span>Efficacia: {(item.effectiveness * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(item.createdAt), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseManager;
