'use client'

import ChatbotWidget from '@/frontend/components/chatbot/ChatbotWidget';
import { useSearchParams } from 'next/navigation';

export default function WidgetFullPage() {
  const params = useSearchParams();
  const userId = params.get('user') || '';
  return (
    <div className="relative h-screen w-screen bg-background">
      <ChatbotWidget userId={userId} defaultOpen />
    </div>
  );
}
