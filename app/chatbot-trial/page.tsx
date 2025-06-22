import InfoPanel from './InfoPanel';
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import { Badge } from "@/frontend/components/ui/badge";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { auth } from "@/frontend/auth";

export const dynamic = 'force-dynamic';

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kommanderai.vercel.app';
  const snippet = `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`;
  const shareUrl = `${baseUrl}/widget?user=${userId}`;

  const currentDate = format(new Date(), 'dd MMM yyyy', { locale: it });

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start mt-16">
      <div className="md:w-2/5">
        <InfoPanel snippet={snippet} shareUrl={shareUrl} />
      </div>
      <div className="md:w-3/5 h-[80vh]">
        <ChatUI
          containerClassName="h-full"
          headerClassName="bg-[#1E3A8A] text-white px-4 py-3 rounded-t-lg"
          headerExtras={(
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white border-none">Online</Badge>
              <span className="text-sm">{currentDate}</span>
            </div>
          )}
          title="Kommander.ai – Trial"
        />
      </div>
    </div>
  );
}