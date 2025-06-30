import ConversationsClient from '@/frontend/components/conversations/ConversationsClient';
import { getConversations } from './actions';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const conversations = await getConversations();

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-7xl">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-800/50">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-400 bg-clip-text text-transparent">
          Centro Conversazioni
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Gestisci e analizza tutte le interazioni con il tuo assistente AI.
          <br className="hidden sm:block" />
          <span className="text-base">Monitora le performance, esporta i dati e ottimizza l'esperienza utente.</span>
        </p>
      </div>
      <ConversationsClient conversations={conversations} />
    </div>
  );
}