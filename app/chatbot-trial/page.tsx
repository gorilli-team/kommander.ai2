import ChatbotTrialClient from './ChatbotTrialClient';
import { auth } from "@/frontend/auth";
import { getSettings } from '@/app/settings/actions';

export const dynamic = 'force-dynamic';

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';

  return (
    <ChatbotTrialClient
      userId={userId}
      settings={settings}
      baseUrl={baseUrl}
    />
  );
}
