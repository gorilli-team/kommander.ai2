
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Lightbulb, ExternalLink, Copy, Share2, AlertTriangle, Settings2 } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';

const ChatbotIntegrationInstructions: React.FC = () => {
  const { toast } = useToast();
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    // Assicurati che questo venga eseguito solo nel client
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  // Sostituisci con un ID cliente reale o un modo per ottenerlo dinamicamente
  const exampleChatbotId = "CLIENTE_ID_UNIVOCO_DA_SOSTITUIRE"; 
  
  const scriptSnippet = `<kommanderai-chat chatbot-id="${exampleChatbotId}" data-app-url="${appUrl}"></kommanderai-chat>
<script src="${appUrl}/chatbot-loader.js" defer></script>`;
  
  const iframeLink = `${appUrl}/widget/chat/${exampleChatbotId}`; // Link diretto per testare/condividere l'iframe

  const copyToClipboard = async (textToCopy: string, label: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: 'Copiato!',
        description: `${label} copiato negli appunti.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: `Impossibile copiare ${label}.`,
        variant: 'destructive',
      });
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      <Alert className="bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
        <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertTitle className="font-semibold">Integra il tuo Chatbot AI!</AlertTitle>
        <AlertDescription>
          Usa lo snippet qui sotto per aggiungere il chatbot al tuo sito web. Assicurati di sostituire <strong>${exampleChatbotId}</strong> con l'ID univoco del tuo chatbot/cliente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Installa Chatbot sul tuo Sito</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copia e incolla questo snippet nel tag `&lt;body&gt;` del tuo sito web. 
            Il `data-app-url` dovrebbe puntare al dominio dove la tua app Kommander.ai è ospitata.
            Sostituisci <strong>${exampleChatbotId}</strong> con l'ID del tuo cliente.
          </p>
          <div className="flex flex-col space-y-2">
            <Input
              readOnly
              value={scriptSnippet}
              className="flex-1 bg-muted/50 border-dashed h-auto text-xs p-2 font-mono"
              rows={3}
              // @ts-ignore
              as="textarea" // Cast necessario se Input non supporta nativamente 'as' con 'rows'
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(scriptSnippet, 'Snippet di installazione')} className="self-start">
              <Copy className="mr-1.5 h-4 w-4" /> Copia Snippet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Nota: il `chatbot-id` è fondamentale per caricare le FAQ e i documenti specifici del cliente.
            Il `data-app-url` dice allo script loader dove si trova la tua applicazione principale per caricare l'iframe. Se omesso, userà l'origine corrente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Link Diretto al Chatbot (per iframe/test)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Puoi usare questo link per testare direttamente l'interfaccia del chatbot in un iframe o per condividerla.
            Ricorda di sostituire <strong>${exampleChatbotId}</strong>.
          </p>
          <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={iframeLink}
              className="flex-1 bg-muted/50 border-dashed h-10 text-xs p-2 font-mono"
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(iframeLink, 'Link diretto al chatbot')}>
               <Copy className="mr-1.5 h-4 w-4" /> Copia Link
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Importante per la Produzione</AlertTitle>
        <AlertDescription>
          Per un ambiente di produzione, assicurati che `data-app-url` nello snippet punti al dominio pubblico della tua applicazione Kommander.ai. 
          Inoltre, considera meccanismi di autenticazione/autorizzazione più robusti per l'accesso ai dati del chatbot (es. token API per cliente) per prevenire accessi non autorizzati.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ChatbotIntegrationInstructions;
