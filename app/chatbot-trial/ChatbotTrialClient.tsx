"use client";

import { useMemo } from 'react';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import InfoPanel from './InfoPanel';
import RealChatbotWidget from './RealChatbotWidget';

interface ChatbotTrialClientProps {
  userId: string;
  settings: any;
  baseUrl: string;
}

export default function ChatbotTrialClient({ userId, settings, baseUrl }: ChatbotTrialClientProps) {
  const { currentContext, currentOrganization } = useOrganization();

  const { htmlSnippet, shareUrl } = useMemo(() => {
    let snippet: string;
    let url: string;

    if (currentContext === 'organization' && currentOrganization?.id) {
      snippet = [
        '<div id="kommander-chatbot"></div>',
        `<script src="${baseUrl}/chatbot.js"></script>`,
        `<script>window.initKommanderChatbot({ organizationId: '${currentOrganization.id}' });</script>`
      ].join('\n');
      url = `${baseUrl}/chatbot?org=${currentOrganization.id}`;
    } else {
      snippet = [
        '<div id="kommander-chatbot"></div>',
        `<script src="${baseUrl}/chatbot.js"></script>`,
        `<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`
      ].join('\n');
      url = `${baseUrl}/chatbot?user=${userId}`;
    }

    return { htmlSnippet: snippet, shareUrl: url };
  }, [currentContext, currentOrganization?.id, userId, baseUrl]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      <div className="lg:w-1/2">
        <InfoPanel snippet={htmlSnippet} shareUrl={shareUrl} />
      </div>
      <div className="lg:w-1/2 flex flex-col">
        <RealChatbotWidget userId={userId} settings={settings} />
      </div>
    </div>
  );
}
