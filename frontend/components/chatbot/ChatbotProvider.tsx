'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Dinamicamente importa il ChatbotWidget solo quando necessario
const ChatbotWidget = dynamic(() => import('./ChatbotWidget'), {
  ssr: false,
  loading: () => null
});

interface ChatbotProviderProps {
  children: React.ReactNode;
}

export default function ChatbotProvider({ children }: ChatbotProviderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Definisce le pagine dove il chatbot deve apparire
  const chatbotPages = ['/chatbot', '/chatbot-trial'];
  
  // Controlla se la pagina corrente è una delle pagine chatbot
  const shouldShowChatbot = chatbotPages.some(page => pathname.startsWith(page));

  return (
    <>
      {children}
      {shouldShowChatbot && session?.user?.id && (
        <ChatbotWidget userId={session.user.id} />
      )}
    </>
  );
}
