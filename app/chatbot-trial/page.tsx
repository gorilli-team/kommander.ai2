import ChatbotTrialClient from './ChatbotTrialClient';
import { auth } from "@/frontend/auth";
import { getSettings } from '@/app/settings/actions';
import { generatePageMetadata } from '@/frontend/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata = generatePageMetadata({
  title: 'Try Our AI Chatbot - Live Demo',
  description: 'Experience Kommander.ai chatbot in action! Try our interactive demo to see how our AI-powered customer support can transform your business.',
  url: '/chatbot-trial',
  noIndex: false,
});

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';

  return (
    <div className="h-full">
      <ChatbotTrialClient
        userId={userId}
        settings={settings}
        baseUrl={baseUrl}
      />
    </div>
  );
}
