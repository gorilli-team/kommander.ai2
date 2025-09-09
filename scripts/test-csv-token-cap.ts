// scripts/test-csv-token-cap.ts
// Usage: npx tsx scripts/test-csv-token-cap.ts "nolok.*\\.csv" gpt-3.5-turbo
// This script finds a CSV in raw_files_meta by regex, downloads it from GridFS,
// counts tokens using @dqbd/tiktoken, and then binary-searches the largest prefix
// that the model accepts without context-length errors.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { encoding_for_model } from '@dqbd/tiktoken';

async function loadCsvBuffer(regex: RegExp): Promise<{ buffer: Buffer; fileName: string }> {
  const { db } = await connectToDatabase();
  const meta = await db.collection('raw_files_meta').findOne({ fileName: { $regex: regex } });
  if (!meta) throw new Error(`No CSV found matching ${regex}`);
  if (meta.originalFileType !== 'text/csv') throw new Error(`Found file is not CSV: ${meta.originalFileType}`);
  const bucket = await getGridFSBucket();
  const fileId: ObjectId = typeof meta.gridFsFileId === 'string' ? new ObjectId(meta.gridFsFileId) : meta.gridFsFileId;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    bucket.openDownloadStream(fileId)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
  return { buffer: Buffer.concat(chunks), fileName: meta.fileName };
}

function countTokensForModel(model: string, text: string): number {
  const enc = encoding_for_model(model as any);
  try {
    const tokens = enc.encode(text);
    return tokens.length;
  } finally {
    enc.free?.();
  }
}

async function canFit(openai: OpenAI, model: string, content: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a token-capacity tester. Reply with OK.' },
        { role: 'user', content },
      ],
      temperature: 0,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function main() {
  const pattern = process.argv[2] || 'nolok.*\\.csv';
  const model = process.argv[3] || 'gpt-3.5-turbo';
  const regex = new RegExp(pattern, 'i');

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { buffer, fileName } = await loadCsvBuffer(regex);
  const text = buffer.toString('utf-8');
  const totalChars = text.length;
  const totalTokens = countTokensForModel(model, text);

  // Binary search largest prefix by characters that API accepts
  let lo = 0;
  let hi = totalChars;
  let best = 0;
  let attempts = 0;
  const maxAttempts = 20;

  while (lo <= hi && attempts < maxAttempts) {
    const mid = Math.floor((lo + hi) / 2);
    const sample = text.slice(0, mid);
    const fit = await canFit(openai, model, sample);
    attempts++;
    if (fit.ok) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const bestText = text.slice(0, best);
  const bestTokens = countTokensForModel(model, bestText);
  const lines = text.split(/\r?\n/);
  const bestLines = bestText.split(/\r?\n/).length;

  const result = {
    model,
    fileName,
    total: { chars: totalChars, tokens: totalTokens, lines: lines.length },
    maxAccepted: { chars: best, tokens: bestTokens, lines: bestLines },
    attempts,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
  process.exit(1);
});

