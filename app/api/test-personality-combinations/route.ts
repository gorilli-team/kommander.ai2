import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const personalities = ['neutral', 'casual', 'formal'];
const traits = ['energetico', 'divertente', 'fiducioso', 'amichevole', 'convincente', 'avventuroso', 'ironico', 'professionista'];

// Test message che include richiesta di link
const testMessage = "Ciao! Mi puoi spiegare come funziona questo servizio e se ci sono dei tutorial o guide che posso seguire?";

export async function POST(request: Request) {
  try {
    const { userId, specificPersonality, specificTraits } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const chatHistory: ChatMessage[] = [];
    const results: any[] = [];

    // Se specificato, testa solo una combinazione
    if (specificPersonality && specificTraits) {
      const result = await generateChatResponse(testMessage, chatHistory, userId);
      return NextResponse.json(
        { 
          testMessage,
          personality: specificPersonality,
          traits: specificTraits,
          response: result.response,
          error: result.error,
          sources: result.sources
        },
        { headers: corsHeaders }
      );
    }

    // Altrimenti, testa tutte le combinazioni principali
    for (const personality of personalities) {
      for (let i = 0; i < traits.length; i++) {
        const trait = traits[i];
        
        // Simula le impostazioni utente per questo test
        const mockSettings = {
          name: 'Kommander.ai',
          personality: personality,
          traits: [trait]
        };

        // Qui dovremmo aggiornare temporaneamente le impostazioni dell'utente
        // Per ora, passiamo direttamente le impostazioni al generateChatResponse
        const result = await generateChatResponse(testMessage, chatHistory, userId);
        
        results.push({
          combination: `${personality} + ${trait}`,
          personality,
          trait,
          response: result.response,
          error: result.error,
          hasLinks: result.response ? result.response.includes('http') : false,
          wordCount: result.response ? result.response.split(' ').length : 0,
          sources: result.sources?.length || 0
        });
        
        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json(
      { 
        testMessage,
        totalCombinations: results.length,
        results: results.slice(0, 10), // Primi 10 risultati per evitare response troppo grandi
        summary: {
          avgWordCount: results.reduce((acc, r) => acc + r.wordCount, 0) / results.length,
          responsesWithLinks: results.filter(r => r.hasLinks).length,
          errors: results.filter(r => r.error).length
        }
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
