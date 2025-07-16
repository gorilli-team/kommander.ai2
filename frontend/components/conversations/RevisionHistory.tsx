'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Separator } from '@/frontend/components/ui/separator';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { 
  History, 
  Check, 
  X, 
  Clock, 
  Brain, 
  TrendingUp, 
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useRevisions } from '@/frontend/hooks/useRevisions';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface RevisionHistoryProps {
  conversationId: string;
  className?: string;
}

export const RevisionHistory = ({ conversationId, className }: RevisionHistoryProps) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const { revisionHistory, historyLoading, getRevisionHistory, approveRevision, loading } = useRevisions(conversationId);

  useEffect(() => {
    loadHistory();
  }, [conversationId, statusFilter]);

  const loadHistory = () => {
    const options = statusFilter === 'all' ? {} : { status: statusFilter as any };
    getRevisionHistory(options);
  };

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedItems(newExpanded);
  };

  const handleApprove = async (reviewedResponseId: string, messageId: string) => {
    if (!reviewedResponseId) return;
    
    const success = await approveRevision(reviewedResponseId, 'approved', { messageId });
    if (success) {
      loadHistory();
    }
  };

  const handleReject = async (reviewedResponseId: string, messageId: string) => {
    if (!reviewedResponseId) return;
    
    const success = await approveRevision(reviewedResponseId, 'rejected', { messageId });
    if (success) {
      loadHistory();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  if (historyLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Cronologia Revisioni
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Cronologia Revisioni
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="pending">In Attesa</SelectItem>
                <SelectItem value="approved">Approvate</SelectItem>
                <SelectItem value="rejected">Rifiutate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {revisionHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna revisione trovata</p>
            <p className="text-sm mt-1">
              Le revisioni dei messaggi AI appariranno qui
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {revisionHistory.map((revision, index) => (
                <div key={revision.messageId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(revision.approvalStatus)}>
                        {getStatusIcon(revision.approvalStatus)}
                        <span className="ml-1 capitalize">{revision.approvalStatus}</span>
                      </Badge>
                      
                      {revision.isLearnedResponse && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          Appresa
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {revision.revisionTimestamp && (
                        <span>
                          {formatDistanceToNow(new Date(revision.revisionTimestamp), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                        </span>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(revision.messageId)}
                      >
                        {expandedItems.has(revision.messageId) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Statistiche */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>Utilizzi: {revision.usageCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Efficacia: {(revision.effectiveness * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Contenuto revisionato */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                    <p className="text-sm text-gray-800">{revision.revisedContent}</p>
                  </div>

                  {/* Dettagli estesi */}
                  {expandedItems.has(revision.messageId) && (
                    <div className="space-y-3">
                      <Separator />
                      
                      {/* Contenuto originale */}
                      {revision.originalContent && (
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Risposta AI Originale:</h5>
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <p className="text-sm text-gray-600">{revision.originalContent}</p>
                          </div>
                        </div>
                      )}

                      {/* Motivo revisione */}
                      {revision.revisionReason && (
                        <div>
                          <h5 className="font-medium text-sm text-gray-700 mb-1">Motivo:</h5>
                          <p className="text-sm text-gray-600">{revision.revisionReason}</p>
                        </div>
                      )}

                      {/* Metadati */}
                      {revision.metadata && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {revision.metadata.model && (
                            <div>
                              <span className="font-medium text-gray-700">Modello:</span>
                              <span className="ml-2 text-gray-600">{revision.metadata.model}</span>
                            </div>
                          )}
                          {revision.metadata.processingTime && (
                            <div>
                              <span className="font-medium text-gray-700">Tempo:</span>
                              <span className="ml-2 text-gray-600">{revision.metadata.processingTime}ms</span>
                            </div>
                          )}
                          {revision.metadata.similarityScore && (
                            <div>
                              <span className="font-medium text-gray-700">Similarità:</span>
                              <span className="ml-2 text-gray-600">{(revision.metadata.similarityScore * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Azioni per revisioni in attesa */}
                  {revision.approvalStatus === 'pending' && revision.reviewedResponseId && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(revision.reviewedResponseId!, revision.messageId)}
                        disabled={loading}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(revision.reviewedResponseId!, revision.messageId)}
                        disabled={loading}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Rifiuta
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RevisionHistory;
