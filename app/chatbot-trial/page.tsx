import { Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import CopySnippet, { CopyInput } from "./CopySnippet";
import InfoPanel from './InfoPanel';
import ChatPreview from './ChatPreview';
import { auth } from "@/frontend/auth";

export const dynamic = 'force-dynamic';

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const snippet = `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`;
  const shareUrl = `${baseUrl}/chatbot?user=${userId}`;

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="md:w-2/5">
        <InfoPanel snippet={snippet} shareUrl={shareUrl} />
      </div>
      <div className="md:w-3/5 h-96">
        <ChatPreview />
      </div>
    </div>
  );
}