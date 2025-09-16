import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ id: session.user.id, email: session.user.email, name: session.user.name });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name } = await request.json();
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  const { db } = await connectToDatabase();
  await db.collection('users').updateOne({ _id: new ObjectId(session.user.id) }, { $set: { name: name.trim() } });
  return NextResponse.json({ success: true });
}
