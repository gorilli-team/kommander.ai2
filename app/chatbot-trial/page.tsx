import { Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import CopySnippet, { CopyInput } from "./CopySnippet";
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
      <div className="space-y-6 md:w-2/5">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <CheckCircle className="text-green-600" />
          <span>Il tuo Chatbot AI è pronto!</span>
        </h1>
        <p className="text-muted-foreground">
          Il tuo addestramento del Chatbot è completo: usa il link qui sotto per
          condividerlo sui social media, nelle app di messaggistica o nelle email.
        </p>
        <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
          <AlertTriangle className="w-5 h-5 mt-1" />
          <p className="text-sm">
            Il chatbot può rispondere solo utilizzando le informazioni che hai fornito. Se alcune risposte non sono corrette, puoi perfezionare la sua knowledge base.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Installa Chatbot</h2>
          <CopySnippet snippet={snippet} />
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Condividi Chatbot</h2>
          <CopyInput value={shareUrl} />
        </div>
      </div>
      <div className="md:w-3/5 h-96">
        <div className="border rounded-lg shadow-md flex flex-col h-full">
          <div className="bg-[#1E3A8A] text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
            <span className="font-semibold">Kommander.ai – Trial</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white border-none">Online</Badge>
              <span className="text-sm">20 Giu 2025</span>
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col">
            <div className="bg-muted rounded-lg p-3 text-sm max-w-xs animate-in fade-in slide-in-from-bottom">
              Ciao! Sono Kommander.ai, come posso aiutarti oggi?
            </div>
            <div className="mt-auto pt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Scrivi qui…"
                  className="pr-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Send className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
