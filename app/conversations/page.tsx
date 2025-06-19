import ConversationsClient from '@/frontend/components/conversations/ConversationsClient';
import { getConversations } from './actions';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const conversations = await getConversations();
  return <ConversationsClient conversations={conversations} />;
}
