import CopySnippet from './CopySnippet';
import ChatbotWidget from '@/frontend/components/chatbot/ChatbotWidget';
import { auth } from '@/frontend/auth';

export const dynamic = 'force-dynamic';

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const snippet = `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-bold font-headline text-foreground">Chatbot Trial</h1>
      <p>Copia e incolla questo snippet nel tuo sito:</p>
      <CopySnippet snippet={snippet} />
      <div className="h-96">
        <ChatbotWidget userId={userId} />
      </div>
    </div>
  );
}
