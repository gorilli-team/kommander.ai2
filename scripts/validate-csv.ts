// scripts/validate-csv.ts
// Usage: npx tsx scripts/validate-csv.ts
// This script looks up a CSV file whose name matches /nolok.*\.csv/i in raw_files_meta,
// downloads it from GridFS, and verifies that the smart file pipeline returns the full content (no truncation).

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ObjectId, GridFSBucket } from 'mongodb';
import { connectToDatabase } from '../backend/lib/mongodb';
import { getSmartFiles } from '../backend/lib/smartFileManager';

async function readGridFsFile(bucket: GridFSBucket, id: ObjectId): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    bucket
      .openDownloadStream(id)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve());
  });
  return Buffer.concat(chunks);
}

(async () => {
  try {
    const { db } = await connectToDatabase();

    // Find CSV file by name pattern (case-insensitive)
    const meta = await db.collection('raw_files_meta').findOne({
      fileName: { $regex: 'nolok.*\\.csv', $options: 'i' },
    });

    if (!meta) {
      console.log(JSON.stringify({ ok: false, message: 'CSV file not found matching /nolok.*\\.csv/i in raw_files_meta.' }, null, 2));
      process.exit(1);
    }

    const fileName: string = meta.fileName;
    const originalFileType: string = meta.originalFileType || '';
    const userId: string | undefined = meta.userId || meta.ownerId || undefined;
    const gridFsFileId: ObjectId = typeof meta.gridFsFileId === 'string' ? new ObjectId(meta.gridFsFileId) : meta.gridFsFileId;

    const bucket = new GridFSBucket(db, { bucketName: 'file_uploads' });

    const originalBuffer = await readGridFsFile(bucket, gridFsFileId);
    const originalText = originalBuffer.toString('utf-8');
    const originalLines = originalText.split(/\r?\n/);
    const firstLine = originalLines[0] || '';
    const lastLine = (originalText.trim().split(/\r?\n/).slice(-1)[0]) || '';

    // Pull smart files for this user and bias relevance towards the target filename
    const smartFiles = await getSmartFiles(userId || '', {
      maxFiles: 50,
      includeContent: true,
      includeSummaries: false,
      semanticMatching: true,
      userQuery: 'nolok',
    });

    const processed = smartFiles.find((f) => f.fileName === fileName);

    if (!processed) {
      console.log(JSON.stringify({
        ok: false,
        message: 'Target CSV not included in smart files selection (try increasing maxFiles or different query).',
        fileName,
        userId: userId || null,
      }, null, 2));
      process.exit(2);
    }

    const processedText = processed.content;
    const processedLines = processedText.split(/\r?\n/);

    const includesFirst = processedText.startsWith(firstLine) || processedText.includes('\n' + firstLine + '\n');
    const includesLast = lastLine.length === 0 ? true : processedText.includes(lastLine);

    const result = {
      ok: includesLast,
      fileName,
      original: {
        bytes: originalBuffer.length,
        lines: originalLines.length,
        sampleHead: originalLines.slice(0, 3),
        sampleTail: originalLines.slice(-3),
      },
      processed: {
        bytes: processedText.length,
        lines: processedLines.length,
        sampleHead: processedLines.slice(0, 3),
        sampleTail: processedLines.slice(-3),
      },
      checks: {
        includesFirstLine: includesFirst,
        includesLastLine: includesLast,
        truncatedMarkerFound: processedText.includes('[...contenuto troncato...]'),
      },
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(includesLast ? 0 : 3);
  } catch (err: any) {
    console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
    process.exit(1);
  }
})();

