
"use client";

import React from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Lightbulb, ExternalLink, Copy, Share2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';

const ChatbotIntegrationInstructions: React.FC = () => {
  const { toast } = useToast();

  const chatbotId = "2fb74e4c-df2f-45ff-8c70-99d1eda132db"; // Example ID
  const scriptSnippet = `<kepleroai-chat chatbot="${chatbotId}"></kepleroai-chat>\n<script src="https://cdn.keplero.ai/chatbot-loader.js" defer></script>`;
  const iframeLink = `https://console.keplero.ai/chatbot-iframe/${chatbotId}`;

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
        <AlertTitle className="font-semibold">Il tuo Chatbot AI è pronto!</AlertTitle>
        <AlertDescription>
          Il tuo addestramento del Chatbot è completo: usa il link qui sotto per condividerlo sui social media, nelle app di messaggistica o nelle email.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg font-semibold">Alcune risposte non sono corrette?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Il chatbot può rispondere solo utilizzando le informazioni che hai fornito. Se alcune risposte non sono corrette, puoi perfezionare la sua knowledge base.
          </p>
          <a
            href="/training" // Assuming training page is the place to refine
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:underline mt-2"
          >
            Scopri come addestrare il tuo Chatbot <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22v-2M17 20v-4M5 20v-4M2 12H0M7 12H3M22 12h-2M17 12h4M12 7V5M12 2V0M12 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"/><path d="M12 12c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5Z"/></svg> {/* Placeholder icon */}
            <CardTitle className="text-lg font-semibold">Installa Chatbot</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Il chatbot può rispondere solo utilizzando le informazioni che hai fornito. Se alcune risposte non sono corrette, puoi perfezionare la sua knowledge base.
          </p>
          <a
            href="#" // Placeholder link
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:underline text-sm"
          >
            Scopri come <ExternalLink className="ml-1 h-4 w-4" />
          </a>
          <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={scriptSnippet}
              className="flex-1 bg-muted/50 border-dashed h-auto text-xs p-2 font-mono"
              rows={3}
              as="textarea"
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(scriptSnippet, 'Snippet di installazione')}>
              <Copy className="mr-1.5 h-4 w-4" /> Copia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Condividi Chatbot</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Usa questo link per condividere il tuo chatbot con chi vuoi.
          </p>
          <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={iframeLink}
              className="flex-1 bg-muted/50 border-dashed h-10 text-xs p-2 font-mono"
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(iframeLink, 'Link di condivisione')}>
               <Copy className="mr-1.5 h-4 w-4" /> Copia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotIntegrationInstructions;
