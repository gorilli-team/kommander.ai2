// scripts/ingest-csv-from-meta.ts
// Usage: npx tsx scripts/ingest-csv-from-meta.ts "<fileNameRegex>"
// Example: npx tsx scripts/ingest-csv-from-meta.ts "nolok.*\.csv"

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ingestCsvDataset } from '@/backend/lib/csvResolver';

async function main() {
  const pattern = process.argv[2] || '.*\\.csv';
  const regex = new RegExp(pattern, 'i');

  const { db } = await connectToDatabase();

  const meta = await db.collection('raw_files_meta').findOne({ fileName: { $regex: regex } });
  if (!meta) {
    console.error(`[ingest-csv-from-meta] No raw_files_meta found matching ${regex}`);
    process.exit(1);
  }
  if (meta.originalFileType !== 'text/csv') {
    console.error(`[ingest-csv-from-meta] Found file is not CSV: ${meta.originalFileType}`);
    process.exit(1);
  }

  const bucket = await getGridFSBucket();
  const gridId: ObjectId = typeof meta.gridFsFileId === 'string' ? new ObjectId(meta.gridFsFileId) : meta.gridFsFileId;

  // Download file into buffer
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    bucket.openDownloadStream(gridId)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
  const buffer = Buffer.concat(chunks);

  const userId: string = meta.userId || 'unknown';
  const { datasetId, rowCount, headers } = await ingestCsvDataset({
    buffer,
    fileName: meta.fileName,
    userId,
    gridFsFileId: gridId,
  });

  await db.collection('raw_files_meta').updateOne({ _id: meta._id }, { $set: { csvDatasetId: datasetId } });

  console.log(JSON.stringify({ ok: true, datasetId: datasetId.toString(), rowCount, headers, fileName: meta.fileName }, null, 2));
}

main().catch((err) => {
  console.error('[ingest-csv-from-meta] Failed:', err?.message || err);
  process.exit(1);
});

