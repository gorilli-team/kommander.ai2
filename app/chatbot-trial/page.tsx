import InfoPanel from './InfoPanel';
import RealChatbotWidget from './RealChatbotWidget';
import { auth } from "@/frontend/auth";
import { getSettings } from '@/app/settings/actions';

export const dynamic = 'force-dynamic';

export default async function ChatbotTrialPage() {
  const session = await auth();
  const userId = session?.user?.id || '';
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';
  
  const htmlSnippet = [
    '<div id="kommander-chatbot"></div>',
    `<script src="${baseUrl}/chatbot.js"></script>`,
    `<script>window.initKommanderChatbot({ userId: '${userId}' });</script>`
  ].join('\n');
  
  const shareUrl = `${baseUrl}/chatbot?user=${userId}`;

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="md:w-2/5">
        <InfoPanel snippet={htmlSnippet} shareUrl={shareUrl} />
      </div>
      <div className="md:w-3/5 relative">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 h-[600px] relative overflow-hidden">
          <div className="absolute inset-0 opacity-50"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🌐 Anteprima Widget Live
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Questo è esattamente come apparirà il tuo chatbot sui siti web. 
              Ogni modifica alle impostazioni si riflette automaticamente qui.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              💡 Il widget è completamente funzionale e connesso al tuo backend
            </div>
          </div>
          
          <RealChatbotWidget userId={userId} />
        </div>
      </div>
    </div>
  );
}
