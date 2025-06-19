import ConversationsClient from '@/frontend/components/conversations/ConversationsClient';
import { getConversations } from './actions';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const conversations = await getConversations();
  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold mb-2 text-foreground">Conversazioni</h1>
        <p className="text-muted-foreground">Review and manage your past chatbot interactions.</p>
      </div>
      <ConversationsClient conversations={conversations} />
    </div>
  );
}
