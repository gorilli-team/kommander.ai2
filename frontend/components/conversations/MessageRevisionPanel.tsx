'use client';

import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Input } from '@/frontend/components/ui/input';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Separator } from '@/frontend/components/ui/separator';
import { AlertCircle, Check, X, Edit3, Brain, Clock, TrendingUp } from 'lucide-react';
import { useRevisions } from '@/frontend/hooks/useRevisions';
import { Alert, AlertDescription } from '@/frontend/components/ui/alert';

interface MessageRevisionPanelProps {
  conversationId: string;
  messageId: string;
  originalContent: string;
  currentContent: string;
  isRevised?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  revisionReason?: string;
  isLearnedResponse?: boolean;
  usageCount?: number;
  effectiveness?: number;
  onRevisionComplete?: () => void;
}

export const MessageRevisionPanel = ({
  conversationId,
  messageId,
  originalContent,
  currentContent,
  isRevised = false,
  approvalStatus = 'pending',
  revisionReason,
  isLearnedResponse = false,
  usageCount = 0,
  effectiveness = 0,
  onRevisionComplete,
}: MessageRevisionPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [revisedContent, setRevisedContent] = useState(currentContent);
  const [reason, setReason] = useState(revisionReason || '');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const { reviseMessage, loading } = useRevisions(conversationId);

  const handleRevise = async () => {
    if (!revisedContent.trim()) return;

    const success = await reviseMessage(messageId, {
      revisedContent: revisedContent.trim(),
      revisionReason: reason.trim() || undefined,
      category: category.trim() || undefined,
      tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : undefined,
      priority,
    });

    if (success) {
      setIsEditing(false);
      onRevisionComplete?.();
    }
  };

  const handleCancel = () => {
    setRevisedContent(currentContent);
    setReason(revisionReason || '');
    setCategory('');
    setTags('');
    setPriority('medium');
    setIsEditing(false);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Revisione Messaggio
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLearnedResponse && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Risposta Appresa
              </Badge>
            )}
            <Badge className={getStatusColor(approvalStatus)}>
              {getStatusIcon(approvalStatus)}
              <span className="ml-1 capitalize">{approvalStatus}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistiche di utilizzo */}
        {(usageCount > 0 || effectiveness > 0) && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>Utilizzi: {usageCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Efficacia: {(effectiveness * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Contenuto originale */}
        {isRevised && originalContent && (
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Risposta AI Originale:</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-sm text-gray-600">{originalContent}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Contenuto attuale/revisionato */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">
            {isRevised ? 'Risposta Revisionata:' : 'Risposta Attuale:'}
          </h4>
          
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={revisedContent}
                onChange={(e) => setRevisedContent(e.target.value)}
                placeholder="Inserisci la risposta corretta..."
                className="min-h-[100px]"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo della revisione
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Es: Informazione errata, miglioramento..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Es: supporto, prodotto, fatturazione..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (separati da virgole)
                  </label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Es: urgente, tecnico, billing..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorità
                  </label>
                  <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bassa</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleRevise}
                  disabled={loading || !revisedContent.trim()}
                  className="flex-1"
                >
                  {loading ? 'Salvando...' : 'Salva Revisione'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-gray-800">{currentContent}</p>
              </div>
              
              {revisionReason && (
                <div className="text-sm text-gray-600">
                  <strong>Motivo revisione:</strong> {revisionReason}
                </div>
              )}

              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isRevised ? 'Modifica Revisione' : 'Revisiona Messaggio'}
              </Button>
            </div>
          )}
        </div>

        {/* Alert informativo */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Le revisioni aiutano l'AI a imparare e migliorare le risposte future. 
            Le risposte approvate verranno utilizzate automaticamente per domande simili.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default MessageRevisionPanel;
