
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import ChatbotIntegrationInstructions from '@/frontend/components/chatbot/ChatbotIntegrationInstructions';

export default function ChatbotPage() {
  return (
    // Contenitore principale della pagina: flex column, occupa altezza disponibile, spaziatura verticale
    <div className="container mx-auto py-2 flex flex-col h-full space-y-6">
      {/* Sezione Intestazione Pagina */}
      <div className="w-full text-left">
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>
      </div>

      {/* Contenitore delle Colonne: si espande per occupare lo spazio verticale rimanente */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Colonna Sinistra: Istruzioni */}
        {/* ChatbotIntegrationInstructions gestisce il proprio scroll interno e l'altezza */}
        <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 h-full">
          <ChatbotIntegrationInstructions />
        </div>

        {/* Colonna Destra: Interfaccia Chat */}
        {/* ChatUI gestisce il proprio scroll interno e l'altezza */}
        <div className="w-full md:w-2/3 lg:w-3/5 xl:w-2/3 h-full">
          <ChatUI />
        </div>
      </div>
    </div>
  );
}
