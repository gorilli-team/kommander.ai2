
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import ChatbotIntegrationInstructions from '@/frontend/components/chatbot/ChatbotIntegrationInstructions';

export default function ChatbotPage() {
  return (
    <div className="container mx-auto py-2 flex flex-col h-full space-y-6">
      <div className="w-full text-left">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>
      </div>
      <div className="flex flex-1 flex-col md:flex-row gap-6 overflow-hidden">
        <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 h-full md:max-h-[calc(100vh-10rem)]">
          <ChatbotIntegrationInstructions />
        </div>
        <div className="w-full md:w-2/3 lg:w-3/5 xl:w-2/3 h-full md:max-h-[calc(100vh-10rem)]">
          <ChatUI />
        </div>
      </div>
    </div>
  );
}
