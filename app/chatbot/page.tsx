
import ChatUI from '@/frontend/components/chatbot/ChatUI';
import ChatbotIntegrationInstructions from '@/frontend/components/chatbot/ChatbotIntegrationInstructions';

export default function ChatbotPage() {
  return (
    // Contenitore principale della pagina:
    // - flex flex-col: layout verticale.
    // - h-full: tenta di occupare l'intera altezza fornita dal genitore (<main> in AppLayout).
    // - space-y-4: spaziatura verticale tra l'header e il contenitore delle colonne.
    // - overflow-hidden: per assicurare che questa pagina non causi scroll indesiderati se il contenuto interno è gestito male.
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Sezione Intestazione Pagina */}
      <div className="w-full text-left px-1 flex-shrink-0"> {/* px-1 per un minimo padding orizzontale, flex-shrink-0 per non comprimerla */}
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>
      </div>

      {/* Contenitore delle Colonne:
          - flex-1: cruciale, fa sì che questo div occupi TUTTO lo spazio verticale rimanente nel genitore (ChatbotPage div).
          - flex flex-col md:flex-row: stack verticale su mobile, row su desktop.
          - gap-6: spazio tra le colonne.
          - overflow-hidden: importante! Previene che questo contenitore venga espanso dal contenuto dei suoi figli.
                           I figli (le colonne) devono gestire il proprio overflow.
      */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Colonna Sinistra: Istruzioni
            - h-full: fa sì che questa colonna prenda l'intera altezza del suo genitore (il Contenitore delle Colonne).
                      Questo è possibile perché il genitore ha una dimensione definita da flex-1.
            - Le classi di larghezza (w-full md:w-1/3...) definiscono la sua porzione orizzontale.
        */}
        <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 h-full">
          {/* ChatbotIntegrationInstructions deve avere al suo interno h-full e overflow-y-auto */}
          <ChatbotIntegrationInstructions />
        </div>

        {/* Colonna Destra: Interfaccia Chat
            - h-full: stessa logica della colonna sinistra.
        */}
        <div className="w-full md:w-2/3 lg:w-3/5 xl:w-2/3 h-full">
          {/* ChatUI deve avere al suo interno h-full e la sua area di scroll deve usare flex-1 */}
          <ChatUI />
        </div>
      </div>
    </div>
  );
}
