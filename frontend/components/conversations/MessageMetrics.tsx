'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Progress } from '@/frontend/components/ui/progress';
import { Button } from '@/frontend/components/ui/button';
import { 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Brain,
  Target,
  Zap,
  X
} from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import { ConversationMessageDisplay } from './ConversationsClient';

interface MessageMetricsProps {
  message: ConversationMessageDisplay;
  messageIndex: number;
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MessageMetricsData {
  responseTime: number;
  confidence: number;
  usageCount: number;
  successRate: number;
  userFeedback: {
    positive: number;
    negative: number;
    total: number;
  };
  similarMessages: number;
  categories: string[];
  performance: {
    accuracy: number;
    relevance: number;
    completeness: number;
  };
  trends: {
    period: string;
    usage: number;
    satisfaction: number;
  }[];
}

export const MessageMetrics = ({
  message,
  messageIndex,
  conversationId,
  isOpen,
  onClose
}: MessageMetricsProps) => {
  const [metrics, setMetrics] = useState<MessageMetricsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !metrics) {
      fetchMessageMetrics();
    }
  }, [isOpen, messageIndex, conversationId]);

  const fetchMessageMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageIndex}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching message metrics:', error);
      // Mock data for demonstration
      setMetrics({
        responseTime: 1.2,
        confidence: message.confidence || 0.85,
        usageCount: 24,
        successRate: 0.87,
        userFeedback: {
          positive: 18,
          negative: 3,
          total: 21
        },
        similarMessages: 12,
        categories: ['supporto', 'tecnico', 'prodotto'],
        performance: {
          accuracy: 0.88,
          relevance: 0.92,
          completeness: 0.84
        },
        trends: [
          { period: 'Ultimo mese', usage: 45, satisfaction: 0.89 },
          { period: 'Questa settimana', usage: 12, satisfaction: 0.91 },
          { period: 'Oggi', usage: 3, satisfaction: 0.87 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Metriche Messaggio AI
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : metrics ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Tempo Risposta</p>
                        <p className="text-2xl font-bold">{metrics.responseTime}s</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Sicurezza</p>
                        <p className="text-2xl font-bold">{Math.round(metrics.confidence * 100)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Utilizzi</p>
                        <p className="text-2xl font-bold">{metrics.usageCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Successo</p>
                        <p className="text-2xl font-bold">{Math.round(metrics.successRate * 100)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuratezza</span>
                        <span>{Math.round(metrics.performance.accuracy * 100)}%</span>
                      </div>
                      <Progress value={metrics.performance.accuracy * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Rilevanza</span>
                        <span>{Math.round(metrics.performance.relevance * 100)}%</span>
                      </div>
                      <Progress value={metrics.performance.relevance * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completezza</span>
                        <span>{Math.round(metrics.performance.completeness * 100)}%</span>
                      </div>
                      <Progress value={metrics.performance.completeness * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback Utenti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Positivo</span>
                        </div>
                        <Badge variant="secondary">{metrics.userFeedback.positive}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Negativo</span>
                        </div>
                        <Badge variant="secondary">{metrics.userFeedback.negative}</Badge>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Totale</span>
                          <Badge>{metrics.userFeedback.total}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informazioni Aggiuntive</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Messaggi Simili</span>
                      <Badge variant="outline">{metrics.similarMessages}</Badge>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Categorie</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {metrics.categories.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {message.lastRevisedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ultima Revisione</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.lastRevisedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trend Utilizzo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.trends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{trend.period}</p>
                          <p className="text-sm text-muted-foreground">{trend.usage} utilizzi</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{Math.round(trend.satisfaction * 100)}%</p>
                          <p className="text-sm text-muted-foreground">soddisfazione</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Impossibile caricare le metriche</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageMetrics;
