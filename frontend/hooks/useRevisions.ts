import { useState, useCallback } from 'react';
import { useToast } from '@/frontend/hooks/use-toast';

interface RevisionData {
  revisedContent: string;
  revisionReason?: string;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

interface RevisionStatus {
  messageId: string;
  isRevised: boolean;
  revisedBy?: string;
  revisionTimestamp?: string;
  revisionReason?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  originalContent?: string;
  currentContent: string;
  isLearnedResponse: boolean;
  reviewedResponseId?: string;
  usageCount: number;
  effectiveness: number;
}

interface RevisionHistory {
  messageId: string;
  originalContent?: string;
  revisedContent: string;
  revisionReason?: string;
  revisedBy?: string;
  revisionTimestamp?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isLearnedResponse: boolean;
  reviewedResponseId?: string;
  usageCount: number;
  effectiveness: number;
  metadata?: {
    processingTime?: number;
    model?: string;
    similarityScore?: number;
    matchedQuestionId?: string;
    revisionQuality?: number;
  };
}

export const useRevisions = (conversationId: string) => {
  const [loading, setLoading] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<RevisionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();

  // Revisiona un messaggio
  const reviseMessage = useCallback(async (
    messageId: string,
    revisionData: RevisionData
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(revisionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la revisione');
      }

      toast({
        title: 'Revisione completata',
        description: 'Il messaggio è stato revisionato con successo.',
        variant: 'default',
      });

      return true;
    } catch (error) {
      console.error('Error revising message:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la revisione',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast]);

  // Ottieni lo stato di revisione di un messaggio
  const getRevisionStatus = useCallback(async (messageId: string): Promise<RevisionStatus | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/revise`);
      
      if (!response.ok) {
        throw new Error('Errore durante il recupero dello stato di revisione');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting revision status:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile recuperare lo stato di revisione',
        variant: 'destructive',
      });
      return null;
    }
  }, [conversationId, toast]);

  // Ottieni cronologia revisioni
  const getRevisionHistory = useCallback(async (
    options: {
      status?: 'pending' | 'approved' | 'rejected';
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<void> => {
    setHistoryLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.skip) params.append('skip', options.skip.toString());

      const response = await fetch(`/api/conversations/${conversationId}/revisions?${params}`);
      
      if (!response.ok) {
        throw new Error('Errore durante il recupero della cronologia');
      }

      const data = await response.json();
      setRevisionHistory(data.revisions || []);
    } catch (error) {
      console.error('Error getting revision history:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile recuperare la cronologia delle revisioni',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [conversationId, toast]);

  // Approva o rifiuta una revisione
  const approveRevision = useCallback(async (
    reviewedResponseId: string,
    status: 'approved' | 'rejected',
    options: {
      reason?: string;
      messageId?: string;
    } = {}
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/revisions/${reviewedResponseId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          reason: options.reason,
          conversationId,
          messageId: options.messageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'approvazione');
      }

      toast({
        title: status === 'approved' ? 'Revisione approvata' : 'Revisione rifiutata',
        description: `La revisione è stata ${status === 'approved' ? 'approvata' : 'rifiutata'} con successo.`,
        variant: 'default',
      });

      // Aggiorna la cronologia
      await getRevisionHistory();

      return true;
    } catch (error) {
      console.error('Error approving revision:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante l\'approvazione',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast, getRevisionHistory]);

  return {
    // Actions
    reviseMessage,
    getRevisionStatus,
    getRevisionHistory,
    approveRevision,
    
    // State
    loading,
    revisionHistory,
    historyLoading,
  };
};

export default useRevisions;
