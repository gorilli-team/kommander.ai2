import ChatbotClient from '@/frontend/components/chatbot/ChatbotClient';
import { auth } from '@/frontend/auth';
import { getSettings } from '@/app/settings/actions';

export const dynamic = 'force-dynamic';

export default async function ChatbotPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';

  return (
    <ChatbotClient
      userId={userId}
      settings={settings}
      baseUrl={baseUrl}
    />
  );
}
