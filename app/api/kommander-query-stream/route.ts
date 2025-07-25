import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { appendMessages, getConversation } from '@/app/conversations/actions';
import { ObjectId } from 'mongodb';
import { getOpenAI } from '@/backend/lib/openai';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { buildPromptServer, type DocumentSnippet } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { getSettings } from '@/app/settings/actions';
import mammoth from 'mammoth';
import { getSemanticFaqs } from '@/backend/lib/semanticFaqSearch';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[kommander-query-stream] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      rawText = data.text;
      console.log(`[kommander-query-stream] Estrazione testo PDF con pdf-parse completata per ${fileName}. Lunghezza: ${rawText.length}`);

      if (!rawText.trim()) {
        console.warn(
          `[kommander-query-stream] pdf-parse non ha trovato testo in ${fileName}. ` +
          `Il file potrebbe essere una scansione o un documento non testuale.`
        );
        return `Impossibile estrarre il testo dal file ${fileName} in quanto sembra non contenere testo selezionabile.`;
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[kommander-query-stream] Estrazione testo DOCX completata per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[kommander-query-stream] Estrazione testo TXT completata per ${fileName}. Lunghezza: ${rawText.length}`);
    } else {
      console.warn(`[kommander-query-stream] Tipo file non supportato per estrazione testo: ${fileType} per ${fileName}`);
      return `Impossibile estrarre il testo dal file ${fileName} (tipo: ${fileType}) poiché il tipo di file non è supportato per l'estrazione del contenuto.`;
    }
  } catch (error: any) {
    console.error(`[kommander-query-stream] Errore durante l'estrazione del testo da ${fileName} (tipo: ${fileType}):`, error.message);
    let detailedErrorMessage = error.message;
     if (fileType === 'application/pdf') {
        detailedErrorMessage = `Errore durante l'elaborazione del PDF ${fileName} con pdf-parse. Dettagli: ${error.message}`;
    }
    return `Errore durante l'estrazione del testo dal file ${fileName}. Dettagli: ${detailedErrorMessage}`;
  }
  return rawText.trim();
}

async function generateChatResponseStream(
  userMessage: string,
  history: ChatMessage[],
  userId: string,
): Promise<{ stream: ReadableStream; conversationId: string; handledBy: string }> {
  console.log(`[kommander-query-stream] generateChatResponseStream chiamato per userId: ${userId}`);
  
  if (!userMessage.trim()) {
    throw new Error('Il messaggio non può essere vuoto.');
  }

  try {
    const { db } = await connectToDatabase();
    
    // Usa il sistema di ricerca semantica
    const faqs: Faq[] = await getSemanticFaqs(userId, userMessage, 10);

    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({ userId: userId })
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();

    const maxFilesEnv = parseInt(process.env.MAX_PROMPT_FILES || '3', 10);
    const filesToProcess = allUploadedFilesMeta.slice(0, isNaN(maxFilesEnv) ? 3 : maxFilesEnv);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = filesToProcess.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));

    const fileNameMap = new Map<string, string>();
    filesToProcess.forEach(doc => {
        fileNameMap.set(doc.gridFsFileId.toString(), doc.fileName);
    });

    const selectedIds = filesToProcess.map(f => f.gridFsFileId);
    const summariesFromDb = await db.collection('file_summaries')
        .find({ userId: userId, gridFsFileId: { $in: selectedIds } })
        .project({ gridFsFileId: 1, summary: 1 })
        .toArray();

    const summariesForPrompt = summariesFromDb.map(doc => ({
        fileName: fileNameMap.get(doc.gridFsFileId.toString()) || 'Documento',
        summary: doc.summary as string,
    }));

    const extractedTextSnippets: DocumentSnippet[] = [];

    for (const fileMeta of filesToProcess) {
      const fileBufferResult = await getFileContent(fileMeta.gridFsFileId.toString(), userId);

      if ('error' in fileBufferResult) {
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: `Impossibile recuperare il contenuto: ${fileBufferResult.error}` });
      } else {
        let text = await extractTextFromFileBuffer(fileBufferResult, fileMeta.originalFileType, fileMeta.fileName);
        const MAX_TEXT_LENGTH = 10000;
        if (text.length > MAX_TEXT_LENGTH) {
          text = text.substring(0, MAX_TEXT_LENGTH) + "\\n[...contenuto troncato a causa della lunghezza...]";
        }
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: text });
      }
    }

    const userSettings = await getSettings();
    const messages = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined,
    );

    const openai = getOpenAI();
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = JSON.stringify({
                type: 'chunk',
                content: content,
                conversationId: null // Will be set by the caller
              });
              controller.enqueue(`data: ${data}\n\n`);
            }
          }

          // Send completion event
          const completeData = JSON.stringify({
            type: 'complete',
            conversationId: null, // Will be set by the caller
            handledBy: 'bot'
          });
          controller.enqueue(`data: ${completeData}\n\n`);
          
          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({
            type: 'error',
            error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}`
          });
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      }
    });

    return {
      stream,
      conversationId: '', // Will be set by the caller
      handledBy: 'bot'
    };

  } catch (error: any) {
    throw new Error(`Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, message, history, conversationId, site, endUserId } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[kommander-query-stream] POST chiamato per userId: ${userId}, conversationId: ${conversationId}`);

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const convId = conversationId || new ObjectId().toString();
    const existing = conversationId ? await getConversation(userId, convId) : null;
    const handledBy = existing?.handledBy || 'bot';

    if (handledBy === 'agent') {
      await appendMessages(
        userId,
        convId,
        [{ role: 'user', text: message, timestamp: new Date().toISOString() }],
        site,
      );
      
      const stream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({
            type: 'complete',
            conversationId: convId,
            handledBy: 'agent'
          });
          controller.enqueue(`data: ${data}\n\n`);
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Generate streaming response using the same logic as /chatbot page
    const { stream, handledBy: resultHandledBy } = await generateChatResponseStream(message, chatHistory, userId);
    
    // Transform the stream to include conversation ID in each chunk
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let fullResponse = '';
        
        // Add user message first
        await appendMessages(
          userId,
          convId,
          [{ role: 'user', text: message, timestamp: new Date().toISOString() }],
          site
        );
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Parse the chunk and add conversation ID
            const textValue = new TextDecoder().decode(value);
            const lines = textValue.split('\n');
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.replace(/^data: /, ''));
                  if (event.type === 'chunk') {
                    fullResponse += event.content;
                    event.conversationId = convId;
                  } else if (event.type === 'complete') {
                    event.conversationId = convId;
                    event.handledBy = resultHandledBy;
                    
                    // Save the complete response
                    await appendMessages(
                      userId,
                      convId,
                      [{ role: 'assistant', text: fullResponse, timestamp: new Date().toISOString() }],
                      site
                    );
                  }
                  
                  controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
                } catch (parseError) {
                  console.error('Error parsing chunk:', parseError);
                  controller.enqueue(line + '\n');
                }
              } else if (line.trim()) {
                controller.enqueue(line + '\n');
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Stream processing error'
          });
          controller.enqueue(`data: ${errorData}\n\n`);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Stream endpoint error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
