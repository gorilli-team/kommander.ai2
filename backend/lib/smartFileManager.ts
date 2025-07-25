import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import mammoth from 'mammoth';

export interface FileMetadata {
  id: string;
  fileName: string;
  originalFileType: string;
  gridFsFileId: string;
  uploadedAt: Date;
  summary?: string;
  contentLength?: number;
  lastUsed?: Date;
}

export interface ProcessedFileContent {
  fileName: string;
  content: string;
  summary?: string;
  relevanceScore?: number;
  processingTime?: number;
}

export interface SmartFileOptions {
  maxFiles?: number;
  includeContent?: boolean;
  includeSummaries?: boolean;
  prioritizeRecent?: boolean;
  semanticMatching?: boolean;
  userQuery?: string;
}

/**
 * Estrae il testo dal buffer del file
 */
async function extractTextFromBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[SmartFileManager] Estrazione testo per ${fileName}, tipo: ${fileType}`);
  
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = data.text.trim();
      
      if (!text) {
        return `[${fileName}] File PDF senza testo selezionabile. Potrebbe essere una scansione.`;
      }
      return text;
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
      
    } else if (fileType === 'text/plain' || fileType === 'text/csv') {
      return buffer.toString('utf-8').trim();
      
    } else if (fileType === 'application/json') {
      const text = buffer.toString('utf-8');
      try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        return text;
      }
      
    } else {
      console.warn(`[SmartFileManager] Tipo file non supportato: ${fileType}`);
      return `[${fileName}] Tipo file non supportato per l'estrazione del testo: ${fileType}`;
    }
  } catch (error: any) {
    console.error(`[SmartFileManager] Errore estrazione testo da ${fileName}:`, error.message);
    return `[${fileName}] Errore durante l'estrazione del testo: ${error.message}`;
  }
}

/**
 * Calcola un punteggio di rilevanza semantica basico
 */
function calculateRelevanceScore(fileContent: string, fileName: string, userQuery?: string): number {
  if (!userQuery) return 0.5; // Punteggio neutro se non c'è query
  
  const queryLower = userQuery.toLowerCase();
  const contentLower = fileContent.toLowerCase();
  const fileNameLower = fileName.toLowerCase();
  
  let score = 0;
  
  // Punteggio base per corrispondenze nel nome file
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    if (fileNameLower.includes(word)) {
      score += 0.3;
    }
    
    // Conta occorrenze nel contenuto
    const regex = new RegExp(word, 'gi');
    const matches = (contentLower.match(regex) || []).length;
    score += Math.min(matches * 0.1, 1.0); // Max 1.0 per parola
  });
  
  // Bonus per file recenti (sarà applicato esternamente)
  return Math.min(score, 5.0); // Max score 5.0
}

/**
 * Recupera e processa i file in modo intelligente
 */
export async function getSmartFiles(
  userId: string, 
  options: SmartFileOptions = {}
): Promise<ProcessedFileContent[]> {
  const startTime = Date.now();
  console.log(`[SmartFileManager] Inizio recupero smart file per user ${userId}`, options);
  
  const {
    maxFiles = 8,
    includeContent = true,
    includeSummaries = true,
    prioritizeRecent = true,
    semanticMatching = true,
    userQuery
  } = options;
  
  try {
    const { db } = await connectToDatabase();
    
    // Recupera metadati file (più di quelli che servono per poter filtrare)
    const queryLimit = Math.max(maxFiles * 2, 20); // Recupera più file per poter scegliere
    const allFiles = await db.collection('raw_files_meta')
      .find({ userId })
      .project({ 
        fileName: 1, 
        originalFileType: 1, 
        gridFsFileId: 1, 
        uploadedAt: 1,
        lastUsed: 1
      })
      .sort({ uploadedAt: -1 })
      .limit(queryLimit)
      .toArray();
    
    console.log(`[SmartFileManager] Trovati ${allFiles.length} file candidati`);
    
    if (allFiles.length === 0) {
      return [];
    }
    
    // Recupera riassunti se richiesti
    let summaries: Map<string, string> = new Map();
    if (includeSummaries) {
      const fileIds = allFiles.map(f => f.gridFsFileId);
      const summaryDocs = await db.collection('file_summaries')
        .find({ userId, gridFsFileId: { $in: fileIds } })
        .project({ gridFsFileId: 1, summary: 1 })
        .toArray();
      
      summaryDocs.forEach(doc => {
        summaries.set(doc.gridFsFileId.toString(), doc.summary);
      });
    }
    
    // Processa i file
    const processedFiles: ProcessedFileContent[] = [];
    const bucket = await getGridFSBucket();
    
    for (const fileMeta of allFiles) {
      const fileStartTime = Date.now();
      
      try {
        let content = '';
        let relevanceScore = 0.5; // Default
        
        if (includeContent) {
          // Scarica il contenuto
          const downloadStream = bucket.openDownloadStream(fileMeta.gridFsFileId);
          const chunks: Buffer[] = [];
          
          await new Promise<void>((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('error', reject);
            downloadStream.on('end', resolve);
          });
          
          const buffer = Buffer.concat(chunks);
          content = await extractTextFromBuffer(buffer, fileMeta.originalFileType, fileMeta.fileName);
          
          // Calcola rilevanza semantica
          if (semanticMatching && userQuery) {
            relevanceScore = calculateRelevanceScore(content, fileMeta.fileName, userQuery);
          }
        }
        
        // Bonus per file recenti
        if (prioritizeRecent) {
          const daysSinceUpload = (Date.now() - fileMeta.uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
          const recencyBonus = Math.max(0, 1 - (daysSinceUpload / 30)); // Bonus decresce in 30 giorni
          relevanceScore += recencyBonus * 0.5;
        }
        
        const fileProcessTime = Date.now() - fileStartTime;
        
        processedFiles.push({
          fileName: fileMeta.fileName,
          content: content.length > 8000 ? content.substring(0, 8000) + '\n[...contenuto troncato...]' : content,
          summary: summaries.get(fileMeta.gridFsFileId.toString()),
          relevanceScore,
          processingTime: fileProcessTime
        });
        
        console.log(`[SmartFileManager] Processato ${fileMeta.fileName} in ${fileProcessTime}ms, score: ${relevanceScore.toFixed(2)}`);
        
      } catch (error: any) {
        console.error(`[SmartFileManager] Errore processando ${fileMeta.fileName}:`, error.message);
        processedFiles.push({
          fileName: fileMeta.fileName,
          content: `Errore nel recupero del contenuto: ${error.message}`,
          summary: summaries.get(fileMeta.gridFsFileId.toString()),
          relevanceScore: 0,
          processingTime: Date.now() - fileStartTime
        });
      }
    }
    
    // Ordina per rilevanza e prendi i migliori
    const sortedFiles = processedFiles
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, maxFiles);
    
    const totalTime = Date.now() - startTime;
    console.log(`[SmartFileManager] Completato in ${totalTime}ms. Restituiti ${sortedFiles.length}/${processedFiles.length} file`);
    
    // Aggiorna lastUsed per i file selezionati
    const selectedFileNames = sortedFiles.map(f => f.fileName);
    await db.collection('raw_files_meta').updateMany(
      { userId, fileName: { $in: selectedFileNames } },
      { $set: { lastUsed: new Date() } }
    );
    
    return sortedFiles;
    
  } catch (error: any) {
    console.error('[SmartFileManager] Errore nel recupero smart file:', error.message);
    return [];
  }
}

/**
 * Genera un prompt context intelligente dai file
 */
export function buildFileContext(files: ProcessedFileContent[]): string {
  if (files.length === 0) {
    return '';
  }
  
  let context = 'DOCUMENTI DELL\'UTENTE:\n';
  
  files.forEach((file, index) => {
    context += `\n--- DOCUMENTO ${index + 1}: ${file.fileName} ---\n`;
    
    if (file.summary) {
      context += `Riassunto: ${file.summary}\n\n`;
    }
    
    if (file.content && !file.content.startsWith('Errore') && !file.content.startsWith('[')) {
      context += `Contenuto:\n${file.content}\n`;
    } else if (file.content) {
      context += `Nota: ${file.content}\n`;
    }
    
    context += `--- FINE DOCUMENTO ${index + 1} ---\n`;
  });
  
  context += '\nUsa queste informazioni per fornire risposte accurate e specifiche.\n';
  
  return context;
}

/**
 * Versione semplificata per compatibilità con il codice esistente
 */
export async function getRelevantFiles(
  userId: string, 
  userQuery: string, 
  maxFiles: number = 8
): Promise<{ fileName: string; content: string; summary?: string }[]> {
  const smartFiles = await getSmartFiles(userId, {
    maxFiles,
    includeContent: true,
    includeSummaries: true,
    semanticMatching: true,
    userQuery
  });
  
  return smartFiles.map(f => ({
    fileName: f.fileName,
    content: f.content,
    summary: f.summary
  }));
}
