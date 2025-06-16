
"use client";
import React, { useEffect } from 'react';
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import ChatbotIntegrationInstructions from '@/frontend/components/chatbot/ChatbotIntegrationInstructions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/frontend/components/ui/skeleton';


export default function ChatbotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/chatbot');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-2 flex flex-col h-full">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          <div className="lg:w-1/2 xl:w-2/5">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:w-1/2 xl:w-3/5 flex flex-col">
            <Skeleton className="h-[calc(100vh-10rem)] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto py-2">Redirecting to login...</div>;
  }

  return (
    <div className="container mx-auto py-2 flex flex-col h-full">
      <div className="w-full text-left mb-6">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant and learn how to integrate it.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        <div className="lg:w-1/2 xl:w-2/5">
          <ChatbotIntegrationInstructions />
        </div>
        <div className="lg:w-1/2 xl:w-3/5 flex flex-col">
          <ChatUI />
        </div>
      </div>
    </div>
  );
}
