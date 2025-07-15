
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
    examples: ["Posso aiutarti con questa richiesta.", "Ecco le informazioni:"]
  },
  casual: {
    style: "Usa un tono amichevole, rilassato e colloquiale. Includi espressioni informali, emoticon quando appropriato, e crea un'atmosfera di conversazione tra amici.",
    greeting: "Ehi! 👋 Dimmi tutto, come posso darti una mano?",
    responseStyle: "Rispondi in modo spontaneo e diretto, come se stessi chiacchierando con un amico. Usa espressioni come 'perfetto!', 'fantastico!', 'no problem', e aggiungi emoji quando appropriato.",
    examples: ["Perfetto! 😊 Posso aiutarti!", "Fantastico! Ecco cosa devi sapere..."]
  },
  formal: {
    style: "Adotta un registro formale e professionale. Utilizza un linguaggio preciso, cortese e rispettoso, evitando contrazioni e mantenendo sempre la massima professionalità.",
    greeting: "Buongiorno, sarò lieto di assisterla. In che modo posso esserle di aiuto?",
    responseStyle: "Struttura le risposte in modo metodico e professionale, utilizzando formule di cortesia e un linguaggio tecnico appropriato quando necessario.",
    examples: ["Sono lieto di fornirle le informazioni richieste.", "La prego di considerare la seguente soluzione:"]
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
  settings?: { name?: string; personality?: string; traits?: string[] }
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
    } else {
      // Fallback nel caso in cui il separatore non sia presente, ma il file sì
      embeddedFileContent = userMessage.substring(userMessage.indexOf('DOCUMENTI CARICATI DALL\'UTENTE:')).trim();
      cleanUserMessage = ''; // L'utente potrebbe non aver scritto un messaggio
      console.log('[buildPromptServer] DEBUG - Fallback, embeddedFileContent length:', embeddedFileContent.length);
    }

    if (!cleanUserMessage) {
      console.log("[buildPromptServer] WARNING - cleanUserMessage is empty. The user may have only uploaded a file without a specific question.");
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
  
  context += "🎭 IMPORTANTE: Ogni tua risposta DEVE riflettere chiaramente la personalità e i caratteri sopra descritti. Gli utenti devono percepire immediatamente la differenza nel tuo modo di comunicare.\n\n";
  context += "🔍 VERIFICA PERSONALITÀ: Prima di rispondere, chiediti: 'Questa risposta riflette davvero la mia personalità ${personality} e i miei caratteri ${settings?.traits?.join(', ') || 'nessuno'}?'\n\n";
  
  
  context += "🚨 REGOLE FONDAMENTALI PER RISPOSTE BASATE SUI DATI:\n";
  context += "- RISPONDI SOLO utilizzando le informazioni presenti nelle FAQ e nei documenti forniti\n";
  context += "- SE NON trovi informazioni sufficienti nei dati forniti, dì chiaramente: 'Non ho informazioni sufficienti nei documenti caricati per rispondere a questa domanda'\n";
  context += "- NON inventare o aggiungere informazioni generiche non presenti nei materiali\n";
  context += "- NON dare consigli generali se non sono basati sui documenti specifici\n";
  context += "- Mantieni sempre il contesto specifico dei materiali forniti\n\n";
  
  context += "ISTRUZIONI PER RISPOSTE APPROFONDITE:\n";
  context += "- Analizza TUTTI i materiali (FAQ, documenti) per risposte complete e dettagliate\n";
  context += "- SEMPRE includere i link REALI ed ESATTI presenti nelle FAQ quando li menzioni (NO placeholder!)\n";
  context += "- Fornire tutorial step-by-step quando appropriato SOLO se presenti nei documenti\n";
  context += "- Usa Markdown avanzato: **grassetto**, *corsivo*, # titoli, liste numerate, `codice`, [testo](URL_REALE)\n";
  context += "- Menziona fonti specifiche e includi SEMPRE i link reali quando disponibili\n";
  context += "- Struttura logica con sezioni, sottosezioni e dettagli rilevanti\n";
  context += "- Se una FAQ contiene un link (http/https), DEVI includerlo ESATTAMENTE come appare\n";
  context += "- NON usare placeholder come [link_FAQ] o [qui] - usa i link reali\n";
  context += "- Aggiungi esempi pratici SOLO se presenti nei documenti forniti\n\n";
  
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
  
if (hasEmbeddedFiles && embeddedFileContent) {
    context += `\n\n🚨 IMPORTANTE: Un file è stato caricato dall'utente.\n`;
    context += `Analizza il seguente contenuto tenendo conto delle richieste specifiche dell'utente. Rispondi basandoti su queste informazioni e ignora altri contenuti a meno che l'utente non chieda diversamente.`;
    context += `\n\nContenuto del file:\n\n"""\n${embeddedFileContent}\n"""\n\n`;

    context += `ISTRUZIONI PER GESTIONE SPECIFICA:\n`;
    context += `- *Priorità*: Questo file deve essere considerato prioritario.\n`;
    context += `- *Risposte basate solo su*: Questo file, a meno che non venga esplicitato diversamente.\n`;
    context += `- *Riassunto e risposte*: Fornisci riassunti chiari e risposte dettagliate inerenti il file su richiesta.\n\n`;

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
    context += "FAQ Rilevanti (includi sempre i link quando presenti nelle risposte):\n";
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
        faqId: faq.id?.toString(),
        hasLinks: faq.answer.includes('http')
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

// Improved relevance calculation with better keyword matching and FAQ/file prioritization
function calculateRelevance(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const contentLower = content.toLowerCase();
  
  let exactMatches = 0;
  let partialMatches = 0;
  let totalScore = 0;
  
  queryWords.forEach(queryWord => {
    // Exact word match (higher score)
    if (contentLower.includes(` ${queryWord} `) || contentLower.startsWith(`${queryWord} `) || contentLower.endsWith(` ${queryWord}`)) {
      exactMatches++;
      totalScore += 1.0;
    }
    // Partial match (lower score)
    else if (contentLower.includes(queryWord)) {
      partialMatches++;
      totalScore += 0.5;
    }
    // Similar word match (even lower score)
    else {
      const contentWords = contentLower.split(/\s+/);
      for (const contentWord of contentWords) {
        if (contentWord.includes(queryWord) || queryWord.includes(contentWord)) {
          totalScore += 0.3;
          break;
        }
      }
    }
  });
  
  // Calculate final relevance score
  const baseScore = Math.min(totalScore / queryWords.length, 1.0);
  
  // Boost score if content contains links (FAQ with resources)
  if (content.includes('http')) {
    return Math.min(baseScore * 1.2, 1.0);
  }
  
  // Ensure minimum relevance for any content that has any matches
  return Math.max(baseScore, exactMatches > 0 || partialMatches > 0 ? 0.1 : 0.0);
}
