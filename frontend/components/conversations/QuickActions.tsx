'use client';

import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  Copy, 
  BarChart3, 
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { cn } from '@/frontend/lib/utils';
import { useToast } from '@/frontend/hooks/use-toast';
import { ConversationMessageDisplay } from './ConversationsClient';

interface QuickActionsProps {
  message: ConversationMessageDisplay;
  messageIndex: number;
  conversationId: string;
  onQuickAction: (action: 'approve' | 'reject' | 'regenerate', messageIndex: number) => void;
  onCopyMessage: (text: string) => void;
  onViewMetrics: (messageIndex: number) => void;
}

export const QuickActions = ({
  message,
  messageIndex,
  conversationId,
  onQuickAction,
  onCopyMessage,
  onViewMetrics
}: QuickActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleQuickAction = async (action: 'approve' | 'reject' | 'regenerate') => {
    setIsLoading(true);
    try {
      await onQuickAction(action, messageIndex);
      
      const actionMessages = {
        approve: 'Messaggio approvato con successo',
        reject: 'Messaggio respinto',
        regenerate: 'Rigenerazione della risposta in corso...'
      };
      
      toast({
        title: 'Azione completata',
        description: actionMessages[action],
        variant: action === 'reject' ? 'destructive' : 'default'
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile completare l\'azione',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndicator = () => {
    if (!message.revisionStatus) return null;
    
    const statusConfig = {
      approved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
      rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
      pending: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    };
    
    const config = statusConfig[message.revisionStatus];
    const StatusIcon = config.icon;
    
    return (
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs', config.bgColor)}>
        <StatusIcon className={cn('h-3 w-3', config.color)} />
        <span className={config.color}>{message.revisionStatus}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Status indicator */}
      {getStatusIndicator()}
      
      {/* Revision count */}
      {message.revisionCount && message.revisionCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {message.revisionCount} revisioni
        </Badge>
      )}
      
      {/* Confidence score */}
      {message.confidence && (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            message.confidence >= 0.8 ? 'border-green-200 text-green-700' :
            message.confidence >= 0.6 ? 'border-yellow-200 text-yellow-700' :
            'border-red-200 text-red-700'
          )}
        >
          {Math.round(message.confidence * 100)}% sicurezza
        </Badge>
      )}
      
      {/* Quick action buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickAction('approve')}
          disabled={isLoading || message.revisionStatus === 'approved'}
          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <ThumbsUp className="h-3 w-3 mr-1" />
          Approva
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickAction('reject')}
          disabled={isLoading || message.revisionStatus === 'rejected'}
          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <ThumbsDown className="h-3 w-3 mr-1" />
          Rifiuta
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickAction('regenerate')}
          disabled={isLoading}
          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} />
          Rigenera
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopyMessage(message.text)}
          className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-3 w-3 mr-1" />
          Copia
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewMetrics(messageIndex)}
          className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50"
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          Metriche
        </Button>
      </div>
      
      {/* Tags */}
      {message.tags && message.tags.length > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {message.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {message.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{message.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickActions;
