
"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Lightbulb, Copy, Settings2, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';

const ChatbotIntegrationInstructions: React.FC = () => {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [appUrl, setAppUrl] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (status !== 'loading') {
      setIsLoadingSession(false);
    }
  }, [status]);

  const chatbotId = session?.user?.id;

  const scriptSnippet = `<kommander-dashboard-replica></kommander-dashboard-replica>
<script src="${appUrl}/dashboard-replica-loader.js" data-app-url="${appUrl}" defer></script>`;

  const copyToClipboard = async (textToCopy: string, label: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: `Could not copy ${label}.`,
        variant: 'destructive',
      });
      console.error('Failed to copy: ', err);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="space-y-6 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading integration details...</p>
      </div>
    );
  }
  
  if (!chatbotId && status === 'authenticated') {
     return (
      <div className="space-y-6 h-full flex flex-col items-center justify-center text-center">
        <Info className="h-12 w-12 text-primary mb-2" />
        <p className="font-semibold text-lg">Chatbot ID Missing</p>
        <p className="text-muted-foreground">
          Could not retrieve your unique Chatbot ID from the session. Please try logging out and back in.
          If the issue persists, contact support.
        </p>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
     return (
      <div className="space-y-6 h-full flex flex-col items-center justify-center text-center">
        <Info className="h-12 w-12 text-primary mb-2" />
        <p className="font-semibold text-lg">Please Log In</p>
        <p className="text-muted-foreground">
          You need to be logged in to view the chatbot integration instructions.
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-6 h-full overflow-y-auto pr-1">
      <Alert className="bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
        <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertTitle className="font-semibold">Integrate Your AI Chatbot!</AlertTitle>
        <AlertDescription>
          Use the snippet below to add the Kommander.ai assistant to your website.
          The widget will use your unique Chatbot ID: <strong>{chatbotId || 'LOADING...'}</strong>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Embed Chatbot on Your Site</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy and paste this snippet into the `&lt;body&gt;` of your website.
            The `data-app-url` attribute tells the loader where your Kommander.ai application is hosted.
          </p>
          <div className="flex flex-col space-y-2">
            <Input
              readOnly
              value={scriptSnippet}
              className="flex-1 bg-muted/50 border-dashed h-auto text-xs p-2 font-mono"
              rows={3}
              // @ts-ignore
              as="textarea" 
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(scriptSnippet, 'Installation snippet')} className="self-start">
              <Copy className="mr-1.5 h-4 w-4" /> Copy Snippet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            The widget will automatically use your unique Chatbot ID ({chatbotId}) to load specific FAQs and documents for your users.
            The loader script will also attempt to inherit `--primary` and `--card` CSS variables from your site for theme consistency of the launcher button and widget window, or use default styles if not found.
          </p>
        </CardContent>
      </Card>
      
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Important for Production</AlertTitle>
        <AlertDescription>
          For a production environment, ensure `data-app-url` in the snippet correctly points to the public domain of your Kommander.ai application.
          The Chatbot ID is automatically tied to your logged-in account.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ChatbotIntegrationInstructions;
