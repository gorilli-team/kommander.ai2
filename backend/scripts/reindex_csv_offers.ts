// Reindex all CSV files stored in GridFS into the 'offers' collection
// Usage:
//   npm run reindex:csv
// or
//   npx tsx backend/scripts/reindex_csv_offers.ts

import { ObjectId } from 'mongodb';
import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb';
import { ingestCsvOffers } from '@/backend/lib/csvOffers';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function main() {
  console.log('[reindex_csv_offers] Starting reindex...');
  const { db } = await connectToDatabase();
  const bucket = await getGridFSBucket();

  // Find all CSV meta docs
  const cursor = db.collection('raw_files_meta')
    .find({ originalFileType: 'text/csv' })
    .project({ _id: 1, userId: 1, organizationId: 1, gridFsFileId: 1, fileName: 1, uploadedAt: 1 });

  let processed = 0;
  let totalInserted = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;
    const gridId: ObjectId = doc.gridFsFileId;

    try {
      const stream = bucket.openDownloadStream(gridId);
      const buffer = await streamToBuffer(stream);

      const result = await ingestCsvOffers({
        userId: doc.userId,
        organizationId: doc.organizationId,
        gridFsFileId: gridId,
        fileName: doc.fileName,
        fileBuffer: buffer,
      });

      processed += 1;
      totalInserted += result.inserted;
      console.log(`[reindex_csv_offers] Reindexed file ${doc.fileName} (${gridId}) -> ${result.inserted} offers`);
    } catch (e: any) {
      console.error(`[reindex_csv_offers] ERROR processing file ${doc?.fileName} (${gridId}):`, e?.message || e);
    }
  }

  console.log(`[reindex_csv_offers] Done. Files processed: ${processed}, Offers inserted: ${totalInserted}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[reindex_csv_offers] Fatal error:', err);
  process.exit(1);
});