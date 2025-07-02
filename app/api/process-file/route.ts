import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File e userId sono richiesti' }, 
        { status: 400 }
      );
    }

    // Conversione file in buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Estrazione testo usando il sistema esistente
    let extractedText = '';
    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileType.startsWith('text/')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Formato file non supportato' },
        { status: 400 }
      );
    }

    // Ritorna il contenuto estratto
    return NextResponse.json({
      success: true,
      content: extractedText,
      fileName: file.name,
      fileType: file.type,
      size: file.size
    });

  } catch (error: any) {
    console.error('Errore processing file:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'elaborazione del file' },
      { status: 500 }
    );
  }
}
