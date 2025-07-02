
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
}

interface FileSummaryForPrompt {
  fileName: string;
  summary: string;
}

export interface DocumentSnippet {
  fileName: string;
  snippet: string;
  relevance?: number;
  pageNumber?: number;
  section?: string;
}

export interface SourceReference {
  type: 'faq' | 'document';
  title: string;
  relevance: number;
  content?: string;
  metadata?: {
    fileName?: string;
    pageNumber?: number;
    section?: string;
    faqId?: string;
  };
}

// Definizioni dettagliate delle personalità
const personalityDefinitions = {
  neutral: {
    style: "Mantieni un tono equilibrato, professionale ma accessibile. Usa un linguaggio chiaro e diretto senza essere troppo formale o troppo casual.",
    greeting: "Ciao! Come posso aiutarti oggi?",
    responseStyle: "Fornisci risposte precise e ben strutturate, utilizzando un linguaggio neutro e professionale.",
    examples: [
      "Posso aiutarti con questa richiesta.",
      "Ecco le informazioni che hai richiesto:",
      "La soluzione migliore in questo caso è:"
    ]
  },
  casual: {
    style: "Usa un tono amichevole, rilassato e colloquiale. Includi espressioni informali, emoticon quando appropriato, e crea un'atmosfera di conversazione tra amici.",
    greeting: "Ehi! 👋 Dimmi tutto, come posso darti una mano?",
    responseStyle: "Rispondi in modo spontaneo e diretto, come se stessi chiacchierando con un amico. Usa espressioni come 'perfetto!', 'fantastico!', 'no problem', e aggiungi emoji quando appropriato.",
    examples: [
      "Perfetto! 😊 Posso sicuramente aiutarti con questo!",
      "Fantastico! Allora, ecco quello che devi sapere...",
      "No problem! 👍 Ti spiego tutto passo passo:",
      "Ehilà! Questa è facile, guarda un po'..."
    ]
  },
  formal: {
    style: "Adotta un registro formale e professionale. Utilizza un linguaggio preciso, cortese e rispettoso, evitando contrazioni e mantenendo sempre la massima professionalità.",
    greeting: "Buongiorno, sarò lieto di assisterla. In che modo posso esserle di aiuto?",
    responseStyle: "Struttura le risposte in modo metodico e professionale, utilizzando formule di cortesia e un linguaggio tecnico appropriato quando necessario.",
    examples: [
      "Sono lieto di fornirle le informazioni richieste.",
      "La prego di considerare la seguente soluzione:",
      "In base alla sua richiesta, posso confermarle che:",
      "Permettemi di illustrarle la procedura corretta:"
    ]
  }
};

// Definizioni dettagliate dei caratteri
const traitDefinitions = {
  avventuroso: "Mostra entusiasmo per le sfide e le novità. Incoraggia l'utente a esplorare soluzioni creative e innovative. Usa espressioni come 'Proviamo qualcosa di nuovo!' o 'Questa è un'opportunità interessante!'",
  fiducioso: "Esprimi sicurezza nelle tue risposte e ispira fiducia nell'utente. Usa affermazioni decisive e rassicuranti come 'Certamente posso aiutarti' o 'Sono sicuro che troveremo la soluzione'",
  convincente: "Presenta gli argomenti in modo persuasivo e ben strutturato. Usa esempi concreti, benefici chiari e call-to-action quando appropriato",
  energetico: "Mantieni un tono vivace ed entusiastico. Usa punti esclamativi, espressioni dinamiche e trasmetti positività in ogni risposta",
  amichevole: "Crea un'atmosfera calorosa e accogliente. Mostra empatia, usa un linguaggio inclusivo e fai sentire l'utente a proprio agio",
  divertente: "Includi elementi di leggerezza, battute appropriate e un tocco di umorismo nelle risposte, mantenendo sempre la professionalità",
  ironico: "Usa un sottile sarcasmo costruttivo e osservazioni acute, sempre in modo rispettoso e mai offensivo",
  professionista: "Mantieni sempre il massimo livello di competenza tecnica, precisione e attenzione ai dettagli in ogni risposta"
};

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  extractedTextSnippets: DocumentSnippet[] = [],
  history: ChatMessage[] = [],
  fileSummaries: FileSummaryForPrompt[] = [],
  settings?: { name?: string; personality?: string; traits?: string[] },
  personalityContext?: string
): { messages: ChatMessage[]; sources: SourceReference[] } {
  
  // Controlla se ci sono file embedded nel messaggio utente
  const hasEmbeddedFiles = userMessage.includes('DOCUMENTI CARICATI DALL\'UTENTE:');
  let cleanUserMessage = userMessage;
  let embeddedFileContent = '';
  
  console.log('[buildPromptServer] DEBUG - userMessage preview:', userMessage.substring(0, 200));
  console.log('[buildPromptServer] DEBUG - hasEmbeddedFiles:', hasEmbeddedFiles);
  
  if (hasEmbeddedFiles) {
    const parts = userMessage.split('--- MESSAGGIO UTENTE ---');
    console.log('[buildPromptServer] DEBUG - split parts length:', parts.length);
    if (parts.length === 2) {
      embeddedFileContent = parts[0].trim();
      cleanUserMessage = parts[1].trim();
      console.log('[buildPromptServer] DEBUG - embeddedFileContent length:', embeddedFileContent.length);
      console.log('[buildPromptServer] DEBUG - cleanUserMessage:', cleanUserMessage);
    }
  }
  
  const botName = settings?.name || 'Kommander.ai';
  
  // Costruzione del contesto personalizzato basato su personalità e caratteri
  let context = `Sei ${botName}, un assistente AI specializzato.\n\n`;
  
  // Applica la personalità selezionata
  const personality = settings?.personality as keyof typeof personalityDefinitions || 'neutral';
  const personalityDef = personalityDefinitions[personality];
  
  context += `PERSONALITÀ E STILE COMUNICATIVO:\n${personalityDef.style}\n\n`;
  context += `ESEMPIO DI SALUTO: "${personalityDef.greeting}"\n\n`;
  context += `STILE DI RISPOSTA: ${personalityDef.responseStyle}\n\n`;
  context += `ESEMPI DI FRASI DA USARE:\n`;
  personalityDef.examples.forEach(example => {
    context += `- "${example}"\n`;
  });
  context += "\n";
  
  // Applica i caratteri selezionati
  if (settings?.traits && settings.traits.length > 0) {
    context += `CARATTERISTICHE COMPORTAMENTALI:\n`;
    settings.traits.forEach(trait => {
      const traitKey = trait as keyof typeof traitDefinitions;
      if (traitDefinitions[traitKey]) {
        context += `• ${trait.toUpperCase()}: ${traitDefinitions[traitKey]}\n`;
      }
    });
    context += "\n";
  }
  
  context += "IMPORTANTE: Ogni tua risposta DEVE riflettere chiaramente la personalità e i caratteri sopra descritti. Gli utenti devono percepire immediatamente la differenza nel tuo modo di comunicare.\n\n";
  
  // Aggiungere il contesto di personalità se presente
  if (personalityContext) {
    context += `CONTESTO DI PERSONALITÀ:\n${personalityContext}\n\n`;
  }
  
  context += "ISTRUZIONI PER LA FORMATTAZIONE DELLA RISPOSTA:\n";
  context += "1. ANALIZZA TUTTI I MATERIALI: Consulta attentamente tutte le FAQ, documenti caricati e contenuti disponibili\n";
  context += "2. RISPOSTA APPROFONDITA: Fornisci risposte complete e dettagliate, non limitarti a informazioni superficiali\n";
  context += "3. FORMATTAZIONE MARKDOWN: Usa la formattazione Markdown per rendere la risposta più leggibile:\n";
  context += "   - **testo in grassetto** per concetti importanti\n";
  context += "   - *testo in corsivo* per enfasi\n";
  context += "   - # Titoli e ## Sottotitoli per organizzare i contenuti\n";
  context += "   - Lista puntata (-) o numerata (1.) per informazioni strutturate\n";
  context += "   - `codice` per termini tecnici\n";
  context += "   - [Link Description](URL) per creare link cliccabili\n";
  context += "   - > Citazioni per evidenziare contenuti importanti\n";
  context += "4. STRUTTURA CHIARA: Organizza la risposta con sezioni logiche e sottosezioni\n";
  context += "5. FONTI E RIFERIMENTI: Menziona esplicitamente da quali documenti o FAQ provengono le informazioni\n";
  context += "6. LINK REALI: Se menzioni siti web, servizi, o risorse online, includi sempre i link effettivi e cliccabili\n";
  context += "7. COMPLETEZZA: Non limitarti a una risposta breve, approfondisci tutti gli aspetti rilevanti\n";
  context += "8. RICERCA ESAUSTIVA: Prima di rispondere, analizza TUTTO il materiale disponibile:\n";
  context += "   - Leggi attentamente TUTTE le FAQ fornite\n";
  context += "   - Consulta TUTTI i documenti caricati dall'utente\n";
  context += "   - Non ignorare nessuna fonte di informazione\n";
  context += "   - Se trovi informazioni contraddittorie, menzionalo\n";
  context += "9. QUALITÀ DELLA RISPOSTA: Ogni risposta deve essere:\n";
  context += "   - Dettagliata e informativa\n";
  context += "   - Ben strutturata con sezioni logiche\n";
  context += "   - Ricca di esempi concreti quando possibile\n";
  context += "   - Completa di tutti i dettagli rilevanti\n";
  context += "   - Con riferimenti specifici alle fonti utilizzate\n\n";
  
  // Aggiungi istruzioni specifiche basate sulla personalità
  if (personality === 'casual') {
    context += "RICORDA: Usa emoji, espressioni colloquiali, contrazioni (es. 'non è' → 'non è un problema'), e un tono amichevole come se stessi parlando con un amico. Evita formalità eccessive.\n\n";
  } else if (personality === 'formal') {
    context += "RICORDA: Usa sempre 'Lei/Sua' quando ti rivolgi all'utente, evita contrazioni, mantieni un registro elevato e professionale. Usa formule di cortesia come 'La ringrazio' o 'Mi permetto di suggerire'.\n\n";
  } else {
    context += "RICORDA: Mantieni un equilibrio tra professionalità e accessibilità. Usa un linguaggio chiaro ma non troppo informale.\n\n";
  }
  
  // Aggiungi promemoria sui caratteri
  if (settings?.traits && settings.traits.length > 0) {
    context += "CARATTERI DA ESPRIMERE IN QUESTA RISPOSTA:\n";
    settings.traits.forEach(trait => {
      switch(trait) {
        case 'energetico':
          context += "• Usa punti esclamativi e un tono entusiastico\n";
          break;
        case 'divertente':
          context += "• Includi un tocco di umorismo o leggerezza appropriata\n";
          break;
        case 'fiducioso':
          context += "• Mostra sicurezza e determinazione nelle tue affermazioni\n";
          break;
        case 'amichevole':
          context += "• Crea un'atmosfera calorosa e accogliente\n";
          break;
        case 'convincente':
          context += "• Presenta argomenti in modo persuasivo con esempi concreti\n";
          break;
        case 'avventuroso':
          context += "• Mostra entusiasmo per le sfide e soluzioni innovative\n";
          break;
        case 'ironico':
          context += "• Usa osservazioni acute e un sottile umorismo intelligente\n";
          break;
        case 'professionista':
          context += "• Mantieni precisione tecnica e attenzione ai dettagli\n";
          break;
      }
    });
    context += "\n";
  }
  
  // PRIORITÀ ASSOLUTA: File caricati dall'utente
  if (hasEmbeddedFiles && embeddedFileContent) {
    context += `\n\n🚨🚨🚨 ATTENZIONE! L'UTENTE HA CARICATO UN FILE! 🚨🚨🚨\n\n`;
    context += `QUESTO È IL CONTENUTO DEL FILE CARICATO DALL'UTENTE:\n\n`;
    context += `${embeddedFileContent}\n\n`;
    context += `🎯 ISTRUZIONI PRIORITARIE:\n`;
    context += `- L'utente vuole che analizzi QUESTO file caricato\n`;
    context += `- Se chiede un riassunto → riassumi SOLO questo contenuto\n`;
    context += `- Se fa domande → rispondi basandoti SOLO su questo contenuto\n`;
    context += `- NON usare informazioni da altri file nel database\n`;
    context += `- IGNORA completamente altri documenti\n`;
    context += `- CONCENTRATI ESCLUSIVAMENTE sul file appena caricato\n\n`;
    
    // Rimuovi le altre informazioni dal database per evitare confusione
    return {
      messages: [
        { role: 'system', content: context.trim() },
        ...history,
        { role: 'user', content: cleanUserMessage }
      ],
      sources: []
    };
  }
  
  context += "Usa le seguenti informazioni per rispondere alla query dell'utente:\n\n";

  if (faqs.length > 0) {
    context += "FAQ Rilevanti:\n";
    faqs.forEach(faq => {
      context += `- D: ${faq.question}\n  R: ${faq.answer}\n`;
    });
    context += "\n";
  }

  // Sempre mostra i file del database (funzionamento normale)
  if (uploadedFilesInfo.length > 0) {
    context += "L'utente ha caricato i seguenti file a cui puoi fare riferimento per nome, se pertinente:\n";
    uploadedFilesInfo.forEach(file => {
      context += `- Nome File: "${file.fileName}", Tipo: ${file.originalFileType}\n`;
    });
    context += "\n";

    if (fileSummaries.length > 0) {
      context += "Riassunti dei file caricati:\n";
      fileSummaries.forEach(fs => {
        context += `- ${fs.fileName}: ${fs.summary}\n`;
      });
      context += "\n";
    }

    extractedTextSnippets.forEach(snippet => {
      if (snippet.snippet.startsWith("Errore durante l'estrazione") || snippet.snippet.startsWith("Impossibile estrarre il testo") || snippet.snippet.startsWith("Impossibile recuperare il contenuto")) {
        context += `Nota: Si è verificato un problema durante il tentativo di leggere il contenuto del file ${snippet.fileName}: "${snippet.snippet}". Non puoi visualizzare il suo contenuto testuale, ma sii consapevole della sua esistenza.\n\n`;
      } else {
        context += `Contenuto dal file "${snippet.fileName}":\n"""\n${snippet.snippet}\n"""\n\n`;
      }
    });

    if (uploadedFilesInfo.length > 0 && extractedTextSnippets.length === 0) {
      const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente";
      context += `Nota: Non è stato possibile estrarre o non è stato trovato alcun contenuto testuale nel file (${recentFileName}), ma sii consapevole che esiste.\n\n`;
    }
  }


  if (context === "Sei Kommander.ai, un assistente AI utile. Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n") {
    context = "Sei Kommander.ai, un assistente AI utile. Rispondi alla query dell'utente.\n\n"
  }
  
  // Track sources used in the response
  const sources: SourceReference[] = [];
  
  // Add FAQ sources
  faqs.forEach(faq => {
    sources.push({
      type: 'faq',
      title: faq.question,
      relevance: calculateRelevance(userMessage, faq.question + ' ' + faq.answer),
      content: faq.answer,
      metadata: {
        faqId: faq.id?.toString()
      }
    });
  });
  
  // Add document sources
  extractedTextSnippets.forEach(snippet => {
    sources.push({
      type: 'document',
      title: snippet.fileName,
      relevance: snippet.relevance || calculateRelevance(userMessage, snippet.snippet),
      content: snippet.snippet.substring(0, 200) + (snippet.snippet.length > 200 ? '...' : ''),
      metadata: {
        fileName: snippet.fileName,
        pageNumber: snippet.pageNumber,
        section: snippet.section
      }
    });
  });
  
  // Sort sources by relevance
  sources.sort((a, b) => b.relevance - a.relevance);
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: cleanUserMessage });

  return { messages, sources };
}

// Simple relevance calculation based on keyword matching
function calculateRelevance(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let matches = 0;
  queryWords.forEach(queryWord => {
    if (contentWords.some(contentWord => contentWord.includes(queryWord) || queryWord.includes(contentWord))) {
      matches++;
    }
  });
  
  return Math.min(matches / queryWords.length, 1.0);
}
