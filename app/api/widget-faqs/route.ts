import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

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
    
    // ESATTAMENTE la stessa logica di actions.ts linea 77-85
    const faqsCursor = await db.collection('faqs').find({ userId: userId }).limit(10).toArray();
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        userId: doc.userId,
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));

    return NextResponse.json({ faqs }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Widget FAQs endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
