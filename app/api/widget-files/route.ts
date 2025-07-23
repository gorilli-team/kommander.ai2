import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { getFileContent } from '@/app/training/actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();

    // ESATTAMENTE la stessa logica di actions.ts linea 87-105
    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({ userId: userId })
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();

    const filesToProcess = allUploadedFilesMeta.slice(0, 3);
    const fileNameMap = new Map();
    filesToProcess.forEach(doc => {
      fileNameMap.set(doc.gridFsFileId.toString(), doc.fileName);
    });

    const extractedTextSnippets = [];

    for (const fileMeta of filesToProcess) {
      const fileBufferResult = await getFileContent(fileMeta.gridFsFileId.toString(), userId);

      if ('error' in fileBufferResult) {
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: `Impossibile recuperare il contenuto: ${fileBufferResult.error}` });
      } else {
        const text = fileBufferResult.toString('utf-8').substring(0, 10000);
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: text });
      }
    }

    return NextResponse.json({ filesMeta: filesToProcess, extractedTextSnippets }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Widget Files endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
