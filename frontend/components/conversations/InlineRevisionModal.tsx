'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/frontend/components/ui/dialog';
import { Button } from '@/frontend/components/ui/button';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Badge } from '@/frontend/components/ui/badge';
import { Separator } from '@/frontend/components/ui/separator';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { 
  Edit, 
  Save, 
  X, 
  User, 
  Bot, 
  MessageSquare,
  AlertCircle,
  Check
} from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';

interface InlineRevisionModalProps {
  conversationId: string;
  messageText: string;
  userQuestion: string;
  messageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onRevisionComplete?: (newText: string) => void;
}

export const InlineRevisionModal = ({
  conversationId,
  messageText,
  userQuestion,
  messageIndex,
  isOpen,
  onClose,
  onRevisionComplete
}: InlineRevisionModalProps) => {
  const [revisedContent, setRevisedContent] = useState(messageText);
  const [revisionReason, setRevisionReason] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  const handleSave = async () => {
    if (!revisedContent.trim()) {
      toast({
        title: "Errore",
        description: "Il contenuto revisionato non può essere vuoto",
        variant: "destructive",
      });
      return;
    }

    if (!revisionReason.trim()) {
      toast({
        title: "Errore", 
        description: "Il motivo della revisione è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageIndex}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revisedContent,
          revisionReason,
          category,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          priority,
          originalUserQuery: userQuestion,
          originalAIResponse: messageText
        }),
      });

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Revisione salvata con successo",
        });
        onRevisionComplete?.(revisedContent);
        onClose();
        // Reset form
        setRevisedContent(messageText);
        setRevisionReason('');
        setCategory('');
        setTags('');
        setPriority('medium');
      } else {
        throw new Error('Failed to save revision');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare la revisione",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRevisedContent(messageText);
    setRevisionReason('');
    setCategory('');
    setTags('');
    setPriority('medium');
    onClose();
  };

  const categories = [
    'Supporto Tecnico',
    'Informazioni Prodotto',
    'Vendite',
    'Assistenza Clienti',
    'Fatturazione',
    'Generale'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Revisiona Messaggio AI
          </DialogTitle>
          <DialogDescription>
            Modifica e migliora la risposta AI fornendo contenuto revisionato e specificando il motivo della revisione.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-1">
          {/* Context Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-gray-700">Contesto della Conversazione</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 mt-1 text-blue-600" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">Domanda Utente:</span>
                  <p className="text-sm text-gray-800 bg-white p-2 rounded border">
                    {userQuestion}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 mt-1 text-gray-600" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">Risposta AI Originale:</span>
                  <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded border">
                    {messageText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Revision Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="revised-content">Contenuto Revisionato *</Label>
              <Textarea
                id="revised-content"
                value={revisedContent}
                onChange={(e) => setRevisedContent(e.target.value)}
                placeholder="Inserisci la versione migliorata del messaggio..."
                className="min-h-[120px] mt-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priorità</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger className="mt-2">
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

            <div>
              <Label htmlFor="tags">Tag (separati da virgole)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="es. errore, chiarimento, miglioramento"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="reason">Motivo della Revisione *</Label>
              <Textarea
                id="reason"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Spiega perché questa revisione è necessaria..."
                className="mt-2"
              />
            </div>
          </div>

          {/* Preview */}
          {revisedContent !== messageText && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-sm text-blue-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Anteprima Revisione
              </h4>
              <p className="text-sm text-blue-800">{revisedContent}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4" />
              La revisione sarà sottoposta ad approvazione
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={loading || !revisedContent.trim()}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salva Revisione
              </Button>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InlineRevisionModal;
