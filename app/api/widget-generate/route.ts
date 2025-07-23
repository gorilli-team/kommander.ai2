import { NextResponse } from 'next/server';
import { getOpenAI } from '@/backend/lib/openai';
import { buildPromptServer } from '@/backend/lib/buildPromptServer';
import { getSettings } from '@/app/settings/actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { userMessage, faqs, filesMeta, extractedTextSnippets, history, userId } = await request.json();

    if (!userMessage || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ESATTAMENTE la stessa logica di actions.ts linea 134-159
    const userSettings = await getSettings();
    const messages = buildPromptServer(
      userMessage,
      faqs || [],
      filesMeta || [],
      extractedTextSnippets || [],
      history || [],
      [], // summariesForPrompt - implementeremo dopo se necessario
      userSettings || undefined,
    );

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      return NextResponse.json(
        { error: 'AI non ha restituito una risposta.' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ response: assistantResponse.trim() }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Widget Generate endpoint error:', error);
    return NextResponse.json(
      { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
