
import ChatUI from '@/frontend/components/chatbot/ChatUI';

export default function ChatbotPage() {
  return (
    <div className="container mx-auto py-2 flex flex-col items-center justify-center h-full">
       <div className="w-full text-left mb-6">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>
      </div>
      <ChatUI />
    </div>
  );
}
