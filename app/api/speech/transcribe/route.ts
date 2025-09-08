import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import OpenAI from 'openai';
import fs from 'fs';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json({ error: 'Unsupported audio format' }, { status: 400 });
    }

    // Validate file size (max 25MB - OpenAI limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ error: 'Audio file too large. Maximum size is 25MB.' }, { status: 400 });
    }

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Create temporary file
    const tempDir = '/tmp';
    const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      // Write buffer to temporary file
      await writeFile(tempFilePath, audioBuffer);

      // Create a readable stream for OpenAI
      const audioStream = fs.createReadStream(tempFilePath);

      // Transcribe audio using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        language: "en", // You can make this dynamic or auto-detect
        response_format: "json",
        temperature: 0.2, // Lower temperature for more consistent output
      });

      // Clean up temporary file
      await unlink(tempFilePath);

      // Return transcription result
      return NextResponse.json({
        text: (transcription as any).text,
      });

    } catch (transcriptionError) {
      // Clean up temporary file on error
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temporary file:', unlinkError);
      }

      console.error('OpenAI transcription error:', transcriptionError);
      
      if (transcriptionError instanceof Error) {
        if (transcriptionError.message.includes('rate limit')) {
          return NextResponse.json({ 
            error: 'Too many transcription requests. Please try again later.' 
          }, { status: 429 });
        }
        
        if (transcriptionError.message.includes('quota')) {
          return NextResponse.json({ 
            error: 'Transcription quota exceeded. Please contact support.' 
          }, { status: 402 });
        }
      }

      return NextResponse.json({ 
        error: 'Failed to transcribe audio. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Speech transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to check transcription status or capabilities
export async function GET() {
  try {
    return NextResponse.json({
      supported_formats: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav'],
      max_file_size: '25MB',
      model: 'whisper-1',
      supported_languages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh'
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get transcription info' },
      { status: 500 }
    );
  }
}
