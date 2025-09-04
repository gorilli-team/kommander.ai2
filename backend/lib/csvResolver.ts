import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId, BulkWriteOperation } from 'mongodb';
import { parse } from 'csv-parse/sync';

export interface CsvDatasetDocument {
  _id?: ObjectId;
  userId: string;
  fileName: string;
  alias?: string; // optional friendly name (e.g., "offerte_nolok")
  gridFsFileId?: ObjectId;
  headers: string[];
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CsvRowDocument {
  _id?: ObjectId;
  datasetId: ObjectId;
  rowIndex: number; // 1-based index for data rows (header excluded)
  data: Record<string, any>;
  createdAt: Date;
}

function detectDelimiter(text: string): string {
  // Simple heuristic: prefer ';' if frequent, otherwise ','
  const sample = text.slice(0, 5000);
  const semi = (sample.match(/;/g) || []).length;
  const comma = (sample.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

export async function ensureCsvIndexes() {
  const { db } = await connectToDatabase();
  await db.collection<CsvDatasetDocument>('csv_datasets').createIndex({ userId: 1, fileName: 1 });
  await db.collection<CsvRowDocument>('csv_rows').createIndex({ datasetId: 1, rowIndex: 1 }, { unique: true });
}

export async function ingestCsvDataset(params: {
  buffer: Buffer;
  fileName: string;
  userId: string;
  alias?: string;
  gridFsFileId?: ObjectId;
}): Promise<{ datasetId: ObjectId; headers: string[]; rowCount: number }>
{
  const { db } = await connectToDatabase();
  await ensureCsvIndexes();

  const text = params.buffer.toString('utf-8');
  const delimiter = detectDelimiter(text);

  const records = parse(text, {
    bom: true,
    skip_empty_lines: true,
    delimiter,
    columns: true, // first row as header
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, any>[];

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const now = new Date();

  const dataset: CsvDatasetDocument = {
    userId: params.userId,
    fileName: params.fileName,
    alias: params.alias,
    gridFsFileId: params.gridFsFileId,
    headers,
    rowCount: records.length,
    createdAt: now,
    updatedAt: now,
  };

  const datasetInsert = await db.collection<CsvDatasetDocument>('csv_datasets').insertOne(dataset);
  const datasetId = datasetInsert.insertedId;

  if (records.length > 0) {
    const ops: BulkWriteOperation<CsvRowDocument>[] = records.map((row, idx) => ({
      insertOne: {
        document: {
          datasetId,
          rowIndex: idx + 1, // 1-based
          data: row,
          createdAt: now,
        },
      },
    }));

    // Bulk in chunks to avoid exceeding document size for huge CSVs
    const CHUNK = 1000;
    for (let i = 0; i < ops.length; i += CHUNK) {
      await db.collection<CsvRowDocument>('csv_rows').bulkWrite(ops.slice(i, i + CHUNK), { ordered: false });
    }
  }

  return { datasetId, headers, rowCount: records.length };
}

export async function getDatasetByFileName(userId: string, fileName: string): Promise<CsvDatasetDocument | null> {
  const { db } = await connectToDatabase();
  return db.collection<CsvDatasetDocument>('csv_datasets').findOne({ userId, fileName });
}

export async function countRows(datasetId: ObjectId): Promise<number> {
  const { db } = await connectToDatabase();
  const ds = await db.collection<CsvDatasetDocument>('csv_datasets').findOne({ _id: datasetId });
  if (ds) return ds.rowCount;
  return db.collection<CsvRowDocument>('csv_rows').countDocuments({ datasetId });
}

export async function getRow(datasetId: ObjectId, rowIndex: number): Promise<Record<string, any> | null> {
  const { db } = await connectToDatabase();
  const row = await db.collection<CsvRowDocument>('csv_rows').findOne({ datasetId, rowIndex });
  return row ? row.data : null;
}

