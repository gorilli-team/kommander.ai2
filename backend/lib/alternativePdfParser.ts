import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Parser PDF alternativo che usa pdftotext (poppler-utils)
 * Fallback quando pdf-parse fallisce
 */
export async function extractPdfTextAlternative(buffer: Buffer, fileName: string): Promise<string> {
  console.log(`[AlternativePdfParser] Tentativo estrazione alternativa per ${fileName}`);
  
  try {
    // Salva temporaneamente il PDF
    const tempDir = tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
    const tempTxtPath = tempPdfPath.replace('.pdf', '.txt');
    
    fs.writeFileSync(tempPdfPath, buffer);
    
    // Prova con pdftotext se disponibile
    try {
      await execAsync(`pdftotext "${tempPdfPath}" "${tempTxtPath}"`);
      
      if (fs.existsSync(tempTxtPath)) {
        const text = fs.readFileSync(tempTxtPath, 'utf-8');
        
        // Cleanup
        fs.unlinkSync(tempPdfPath);
        fs.unlinkSync(tempTxtPath);
        
        console.log(`[AlternativePdfParser] Successo con pdftotext: ${text.length} caratteri`);
        return text.trim();
      }
    } catch (pdftotextError: any) {
      console.warn(`[AlternativePdfParser] pdftotext non disponibile:`, pdftotextError.message);
    }
    
    // Cleanup se pdftotext fallisce
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
    
    // Fallback: restituisci messaggio informativo
    return `[${fileName}] PDF detected but text extraction failed.
Alternative methods:
1. Install poppler-utils: brew install poppler (macOS)
2. Convert PDF to text manually
3. Upload content as .txt file

File appears to be valid PDF (${buffer.length} bytes) but requires alternative extraction method.`;
    
  } catch (error: any) {
    console.error(`[AlternativePdfParser] Errore durante estrazione alternativa:`, error.message);
    return `[${fileName}] Alternative PDF extraction failed: ${error.message}`;
  }
}

/**
 * Verifica se pdftotext è disponibile nel sistema
 */
export async function checkPdftotextAvailability(): Promise<boolean> {
  try {
    await execAsync('pdftotext -v');
    console.log('[AlternativePdfParser] pdftotext disponibile nel sistema');
    return true;
  } catch (error) {
    console.log('[AlternativePdfParser] pdftotext non disponibile');
    return false;
  }
}

/**
 * Parser PDF semplificato senza dipendenze esterne
 * Estrae metadati di base e suggerisce soluzioni
 */
export function extractPdfMetadata(buffer: Buffer, fileName: string): string {
  console.log(`[AlternativePdfParser] Estrazione metadati di base per ${fileName}`);
  
  try {
    const pdfString = buffer.toString('binary');
    
    // Cerca informazioni di base nel PDF
    let info = `[${fileName}] PDF Analysis:\n`;
    info += `- File size: ${buffer.length} bytes\n`;
    
    // Cerca versione PDF
    const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      info += `- PDF version: ${versionMatch[1]}\n`;
    }
    
    // Conta pagine approssimativa
    const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
    if (pageMatches) {
      info += `- Estimated pages: ${pageMatches.length}\n`;
    }
    
    // Cerca testo embedded
    const textMatches = pdfString.match(/BT[\s\S]*?ET/g);
    if (textMatches && textMatches.length > 0) {
      info += `- Contains text objects: ${textMatches.length}\n`;
      info += `- Likely extractable: Yes\n`;
    } else {
      info += `- Text objects found: None\n`;
      info += `- Likely extractable: No (possibly scanned)\n`;
    }
    
    info += `\nTo use this content:\n`;
    info += `1. Try converting with online tools\n`;
    info += `2. Use OCR if it's a scanned document\n`;
    info += `3. Copy-paste text manually\n`;
    info += `4. Upload as .txt file for immediate use\n`;
    
    return info;
    
  } catch (error: any) {
    return `[${fileName}] Basic PDF analysis failed: ${error.message}`;
  }
}
