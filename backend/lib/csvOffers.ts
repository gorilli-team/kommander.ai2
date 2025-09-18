import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import { parse as parseCsv } from 'csv-parse/sync';

export interface IngestCsvOptions {
  userId?: string; // personal context
  organizationId?: string; // organization context
  gridFsFileId: ObjectId;
  fileName: string;
  fileBuffer: Buffer;
}

export interface OfferDocument {
  userId?: string;
  organizationId?: string;
  source: {
    gridFsFileId: ObjectId;
    fileName: string;
    rowIndex: number;
    rowHash: string;
    uploadedAt?: Date;
  };
  // Normalized fields
  brand?: string;
  brandLower?: string;
  model?: string;
  modelLower?: string;
  version?: string;
  vehicleType?: string;
  fuel?: string;
  transmission?: string;
  color?: string;
  interior?: string;
  engineSize?: string;
  powerHp?: number | null;
  rentalDurationMonths?: number | null;
  kilometersIncluded?: number | null;
  upfrontAmount?: number | null;
  monthlyFee?: number | null;
  includedServices?: string[];
  availability?: { count?: number | null; date?: string | null; note?: string | null };
  validUntil?: string | Date | null;
  notes?: string;
  // Keep raw to avoid data loss
  raw?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

function detectDelimiter(headerLine: string): string {
  const comma = (headerLine.match(/,/g) || []).length;
  const semicolon = (headerLine.match(/;/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (semicolon > comma && semicolon > tab) return ';';
  if (tab > comma && tab > semicolon) return '\t';
  return ',';
}

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase();
  const map: Record<string, string> = {
    'marca': 'brand',
    'brand': 'brand',
    'modello': 'model',
    'model': 'model',
    'versione': 'version',
    'tipo veicolo': 'vehicleType',
    'tipologia': 'vehicleType',
    'alimentazione': 'fuel',
    'trasmissione': 'transmission',
    'cambio': 'transmission',
    'colore': 'color',
    'interni': 'interior',
    'cilindrata': 'engineSize',
    'potenza': 'power',
    'cv': 'power',
    'durata': 'duration',
    'durata del noleggio': 'duration',
    'chilometraggio incluso': 'kmIncluded',
    'km': 'kmIncluded',
    'chilometraggio': 'kmIncluded',
    'anticipo': 'upfront',
    'canone mensile': 'monthlyFee',
    'canone': 'monthlyFee',
    'servizi inclusi': 'includedServices',
    'altro': 'notes',
    'note': 'notes',
    'disponibilità': 'availability',
    'data disponibilità': 'availabilityDate',
    'offerta valida fino': 'validUntil',
    'valida fino': 'validUntil',
    'prezzo': 'monthlyFee',
  };
  return map[key] || key;
}

function parseItalianCurrency(s: any): number | null {
  if (s == null) return null;
  const str = String(s).trim();
  if (!str) return null;
  // remove currency symbols and spaces
  let cleaned = str.replace(/\s/g, '')
    .replace(/[€eur]/gi, '')
    .replace(/\./g, '') // thousands sep
    .replace(/,/g, '.'); // decimal sep
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseIntegerFromString(s: any): number | null {
  if (s == null) return null;
  const str = String(s).toLowerCase();
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const val = parseInt(digits, 10);
  return isNaN(val) ? null : val;
}

function parseDurationMonths(s: any): number | null {
  if (s == null) return null;
  const str = String(s).toLowerCase();
  // e.g. "36 mesi", "24m", "48"
  const n = parseIntegerFromString(str);
  return n ?? null;
}

function splitServices(s: any): string[] {
  if (!s) return [];
  const text = String(s);
  return text.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
}

function extractAvailabilityCount(s: any): number | null {
  if (!s) return null;
  const str = String(s).toLowerCase();
  const n = parseIntegerFromString(str);
  return n ?? null;
}

function computeRowHash(obj: Record<string, any>): string {
  const json = JSON.stringify(obj);
  return createHash('sha1').update(json).digest('hex');
}

export async function ingestCsvOffers(opts: IngestCsvOptions): Promise<{ inserted: number }>{
  const { userId, organizationId, gridFsFileId, fileName, fileBuffer } = opts;
  const text = fileBuffer.toString('utf-8');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delimiter = detectDelimiter(firstLine);

  // Parse CSV into records (objects) using header row, tolerant mode
  const records = parseCsv(text, {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    bom: true,
    delimiter,
    relax_column_count: true,
    trim: true
  }) as Record<string, any>[];

  const now = new Date();
  const offers: OfferDocument[] = records.map((row, idx) => {
    const brand = row['brand']?.toString().trim();
    const model = row['model']?.toString().trim();
    const version = row['version']?.toString().trim();

    const vehicleType = row['vehicleType']?.toString().trim();
    const fuel = row['fuel']?.toString().trim();
    const transmission = row['transmission']?.toString().trim();
    const color = row['color']?.toString().trim();
    const interior = row['interior']?.toString().trim();
    const engineSize = row['engineSize']?.toString().trim();

    const powerHp = row['power'] != null ? parseIntegerFromString(row['power']) : null;
    const rentalDurationMonths = parseDurationMonths(row['duration']);
    const kilometersIncluded = row['kmIncluded'] != null ? parseIntegerFromString(row['kmIncluded']) : null;
    const upfrontAmount = parseItalianCurrency(row['upfront']);
    const monthlyFee = parseItalianCurrency(row['monthlyFee']);

    const includedServices = splitServices(row['includedServices']);

    const availabilityNote = row['availability']?.toString().trim();
    const availabilityCount = extractAvailabilityCount(availabilityNote);
    const availabilityDate = row['availabilityDate']?.toString().trim() || null;

    const validUntil = row['validUntil']?.toString().trim() || null;
    const notes = row['notes']?.toString().trim();

    const normalizedForHash = {
      brand, model, version, vehicleType, fuel, transmission, color, interior, engineSize,
      powerHp, rentalDurationMonths, kilometersIncluded, upfrontAmount, monthlyFee,
      includedServices, availabilityNote, availabilityCount, availabilityDate, validUntil, notes
    };

    return {
      ...(userId ? { userId } : {}),
      ...(organizationId ? { organizationId } : {}),
      source: {
        gridFsFileId,
        fileName,
        rowIndex: idx,
        rowHash: computeRowHash(normalizedForHash),
        uploadedAt: now,
      },
      brand,
      brandLower: brand?.toLowerCase(),
      model,
      modelLower: model?.toLowerCase(),
      version,
      vehicleType,
      fuel,
      transmission,
      color,
      interior,
      engineSize,
      powerHp,
      rentalDurationMonths,
      kilometersIncluded,
      upfrontAmount,
      monthlyFee,
      includedServices,
      availability: {
        count: availabilityCount,
        date: availabilityDate,
        note: availabilityNote || null,
      },
      validUntil,
      notes,
      raw: row,
      createdAt: now,
      updatedAt: now,
    } as OfferDocument;
  });

  const { db } = await connectToDatabase();
  const col = db.collection<OfferDocument>('offers');

  // Ensure indexes (idempotent)
  try {
    await col.createIndexes([
      { key: { userId: 1, organizationId: 1 } , name: 'scope_idx' },
      { key: { brandLower: 1, modelLower: 1 }, name: 'brand_model_idx' },
      { key: { 'source.gridFsFileId': 1 }, name: 'source_file_idx' },
      { key: { monthlyFee: 1 }, name: 'monthly_fee_idx' },
      { key: { rentalDurationMonths: 1 }, name: 'duration_idx' },
    ]);
    // Text index (one per collection). This is coarse but useful.
    // If already exists with different spec, Mongo will throw; ignore safely in catch.
    await col.createIndex(
      { brand: 'text', model: 'text', version: 'text', vehicleType: 'text', fuel: 'text', notes: 'text' },
      { name: 'offers_text_idx', default_language: 'italian' as any }
    );
  } catch (e) {
    // no-op: indexes may already exist
    console.warn('[csvOffers] Index creation warning:', (e as any).message);
  }

  // Remove previous offers imported from the same file to avoid duplicates
  await col.deleteMany({ 'source.gridFsFileId': gridFsFileId });

  // Insert all offers
  const inserted = offers.length ? (await col.insertMany(offers)).insertedCount : 0;
  console.log(`[csvOffers] File ${fileName}: parsed ${records.length} rows, inserted ${inserted} offers.`);
  return { inserted };
}