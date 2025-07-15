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
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="md:w-2/5">
        <InfoPanel snippet={htmlSnippet} shareUrl={shareUrl} />
      </div>
      <div className="md:w-3/5 relative">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 h-[600px] relative overflow-hidden">
          <div className="absolute inset-0 opacity-50"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🌐 Anteprima Widget Live
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Questo è esattamente come apparirà il tuo chatbot sui siti web. 
              Ogni modifica alle impostazioni si riflette automaticamente qui.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              💡 Il widget è completamente funzionale e connesso al tuo backend
            </div>
            {currentContext === 'organization' && currentOrganization && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                📋 Snippet per organizzazione: {currentOrganization.name}
              </div>
            )}
          </div>
          
          <RealChatbotWidget userId={userId} />
        </div>
      </div>
    </div>
  );
}
