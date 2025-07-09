import ChatUI from '@/frontend/components/chatbot/ChatUI';
import { auth } from '@/frontend/auth';
import { getSettings } from '@/app/settings/actions';

export const dynamic = 'force-dynamic';

export default async function ChatbotPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';
  
  const snippet = `<div id="kommander-chatbot"></div>
<script src="${baseUrl}/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`;

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Sezione Intestazione Pagina */}
      <div className="w-full text-left px-1 flex-shrink-0">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>

          {/* Istruzioni per l&apos;embed del widget */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm space-y-2">
          <p>
            Per inserire il widget di chat su qualsiasi sito, copia e incolla questo snippet nell&apos;HTML della tua pagina:
          </p>
          <pre className="whitespace-pre-wrap bg-background p-2 rounded border border-border">
            {snippet}
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            L&apos;endpoint <code>/api/kommander-query</code> risponde con gli header
            CORS necessari, quindi il widget può essere incluso da qualsiasi
            dominio.
          </p>
        </div>
      </div>

      {/* Contenitore della chat */}
      <div className="flex-1 overflow-hidden">
        <ChatUI accentColor={settings?.color} title={`${settings?.name || 'Kommander.ai'} Chat`} />
      </div>
    </div>
  );
}