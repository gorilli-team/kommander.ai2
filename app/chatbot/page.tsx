
import ChatUI from '@/frontend/components/chatbot/ChatUI';

export default function ChatbotPage() {
  return (
    // Contenitore principale della pagina:
    // - flex flex-col: layout verticale.
    // - h-full: tenta di occupare l'intera altezza fornita dal genitore (<main> in AppLayout).
    // - space-y-4: spaziatura verticale tra l'header e il contenitore delle colonne.
    // - overflow-hidden: per assicurare che questa pagina non causi scroll indesiderati.
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Sezione Intestazione Pagina */}
      <div className="w-full text-left px-1 flex-shrink-0"> {/* px-1 per un minimo padding orizzontale, flex-shrink-0 per non comprimerla */}
        <h1 className="text-3xl font-headline font-bold text-foreground">Chatbot Trial</h1>
        <p className="text-muted-foreground">
          Interact with the Kommander.ai assistant. It uses the knowledge from FAQs and uploaded documents.
        </p>
        {/* Istruzioni per l'embed del widget */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm space-y-2">
          <p>
            Per inserire il widget di chat su qualsiasi sito, copia e incolla questo snippet nell'HTML della tua pagina:
          </p>
          <pre className="whitespace-pre-wrap bg-background p-2 rounded border border-border">
{`<div id="kommander-chatbot"></div>
<script src="https://cdn.kommander.ai/chatbot.js"></script>
<script>window.initKommanderChatbot({ userId: 'YOUR_USER_ID' });</script>`}
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            L'endpoint <code>/api/kommander-query</code> risponde con gli header
            CORS necessari, quindi il widget può essere incluso da qualsiasi
            dominio.
          </p>
        </div>
      </div>

      {/* Contenitore delle Colonne:
          - flex-1: cruciale, fa sì che questo div occupi TUTTO lo spazio verticale rimanente nel genitore (ChatbotPage div).
          - flex flex-col md:flex-row: stack verticale su mobile, row su desktop.
          - gap-6: spazio tra le colonne.
          - overflow-hidden: importante! Previene che questo contenitore venga espanso dal contenuto dei suoi figli.
          - min-h-0: Aggiunto per aiutare con il dimensionamento flex in alcuni casi limite.
                           I figli (le colonne) devono gestire il proprio overflow.
      */}
      <div className="flex-1 overflow-hidden">
        {/* ChatUI deve avere al suo interno h-full e la sua area di scroll deve usare flex-1 */}
        <ChatUI />
      </div>
    </div>
  );
}
