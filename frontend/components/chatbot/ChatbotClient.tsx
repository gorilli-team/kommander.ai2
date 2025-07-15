"use client";

import React, { useState, useMemo } from 'react';
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import { Button } from '@/frontend/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';

interface ChatbotClientProps {
  userId: string;
  settings: any;
  baseUrl: string;
}

export default function ChatbotClient({ userId, settings, baseUrl }: ChatbotClientProps) {
  const { currentContext, currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    if (currentContext === 'organization' && currentOrganization?.id) {
      return `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ organizationId: '${currentOrganization.id}' });</script>`;
    } else {
      return `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`;
    }
  }, [currentContext, currentOrganization?.id, userId, baseUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Embed snippet copied to clipboard',
        className: 'border-green-500 bg-green-50'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const contextInfo = useMemo(() => {
    if (currentContext === 'organization' && currentOrganization) {
      return {
        title: `${currentOrganization.name} Team Chat`,
        description: `This snippet will use the knowledge base and settings for the ${currentOrganization.name} organization.`
      };
    } else {
      return {
        title: 'Personal Chat',
        description: 'This snippet will use your personal knowledge base and settings.'
      };
    }
  }, [currentContext, currentOrganization]);

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Header Section */}
      <div className="w-full text-left px-1 flex-shrink-0">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>

        {/* Dynamic Embed Instructions */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              Embed snippet for: <span className="text-primary">{contextInfo.title}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {contextInfo.description}
          </p>
          <pre className="whitespace-pre-wrap bg-background p-3 rounded border border-border text-xs font-mono">
            {snippet}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            The endpoint <code>/api/kommander-query</code> responds with the necessary
            CORS headers, so the widget can be included from any domain.
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <ChatUI
          accentColor={settings?.color}
          title={contextInfo.title}
          organizationId={currentContext === 'organization' ? currentOrganization?.id : undefined}
        />
      </div>
    </div>
  );
}
