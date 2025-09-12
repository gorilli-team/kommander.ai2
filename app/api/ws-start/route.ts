import { NextResponse } from 'next/server';
import { getWsHub } from '@/backend/lib/wsHub';

export async function GET() {
  try {
    getWsHub().start();
    return NextResponse.json({ ok: true, started: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'fail' }, { status: 500 });
  }
}

