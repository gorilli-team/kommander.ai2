
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import ChatbotIntegrationInstructions from '@/frontend/components/chatbot/ChatbotIntegrationInstructions';

export default function ChatbotPage() {
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
