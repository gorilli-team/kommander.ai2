// File: app/api/widget-generate-complete/route.js
// Questo endpoint replica ESATTAMENTE la logica di generateChatResponse per il widget

import { generateChatResponse } from '@/app/chatbot/actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { userMessage, history, userId, uploadedFiles } = await request.json();
    
    console.log('[API] widget-generate-complete: Starting for userId:', userId);
    console.log('[API] uploadedFiles count:', uploadedFiles?.length || 0);
    
    // Converti uploadedFiles del widget in formato compatibile con il server
    let messageWithFiles = userMessage;
    if (uploadedFiles && uploadedFiles.length > 0) {
      const filesContext = uploadedFiles.map(file => {
        const truncatedContent = file.content.length > 3000 
          ? file.content.substring(0, 3000) + '\n\n[...contenuto troncato...]'
          : file.content;
        
        return `=== FILE: ${file.name} ===
Tipo: ${file.type}
Dimensione: ${(file.size / 1024).toFixed(1)}KB
Caricato: ${file.uploadedAt}

${truncatedContent}

=== FINE FILE ===`;
      }).join('\n\n');
      
      messageWithFiles = `DOCUMENTI CARICATI DALL'UTENTE:\n\n${filesContext}\n\nRispondi tenendo conto di questi documenti oltre alle tue conoscenze di base.\n\n--- MESSAGGIO UTENTE ---\n${userMessage}`;
      
      console.log('[API] Added files context, total length:', messageWithFiles.length);
    }
    
    // Chiama la funzione server esistente con la STESSA logica
    const result = await generateChatResponse(messageWithFiles, history, userId);
    
    console.log('[API] generateChatResponse result:', result.response ? 'success' : 'error');
    
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('[API] Error in widget-generate-complete:', error);
    return new Response(JSON.stringify({ 
      error: `Errore del server: ${error.message}` 
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
