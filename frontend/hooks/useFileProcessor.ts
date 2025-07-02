'use client';

import { useState, useCallback } from 'react';

export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: Date;
}

export interface FileProcessingResult {
  success: boolean;
  file?: ProcessedFile;
  error?: string;
}

export function useFileProcessor() {
  const [uploadedFiles, setUploadedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Funzione per estrarre testo da diversi formati file
  const extractTextContent = useCallback(async (file: File, userId?: string): Promise<string> => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    try {
      // Per PDF e DOCX, usa il server se possibile
      if ((fileType.includes('application/pdf') || fileName.endsWith('.pdf') || 
           fileType.includes('application/msword') || 
           fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
           fileName.endsWith('.doc') || fileName.endsWith('.docx')) && userId) {
        
        console.log('Processing document on server:', file.name);
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          
          const response = await fetch('/api/process-file', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.json();
          
          if (result.success && result.content && result.content.trim()) {
            return result.content;
          } else {
            // Fallback se il server non può estrarre il testo
            return `[${file.name}]\n\n⚠️ Non è stato possibile estrarre testo da questo documento.\n\nSe è un documento testuale (non una scansione):\n1. Aprilo\n2. Seleziona tutto il testo (Ctrl+A o Cmd+A)\n3. Copialo e incollalo in un nuovo messaggio\n\nAltrimenti posso aiutarti con le mie conoscenze di base sull'argomento.`;
          }
        } catch (serverError) {
          console.error('Server processing failed:', serverError);
          // Fallback al messaggio di istruzioni
          return `[${file.name}]\n\n⚠️ Elaborazione server non disponibile.\n\nPer analizzare questo documento:\n1. Aprilo\n2. Seleziona tutto il testo (Ctrl+A o Cmd+A)\n3. Copialo e incollalo in un nuovo messaggio`;
        }
      }
      
      // Elaborazione locale per altri tipi di file
      if (fileType.includes('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        // File di testo semplice
        return await file.text();
      } 
      else if (fileType.includes('application/json') || fileName.endsWith('.json')) {
        // File JSON
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          return JSON.stringify(json, null, 2);
        } catch {
          return text;
        }
      }
      else if (fileType.includes('text/csv') || fileName.endsWith('.csv')) {
        // File CSV
        const text = await file.text();
        return text;
      }
      else if (fileType.includes('text/html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        // File HTML - rimuoviamo i tag
        const text = await file.text();
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || text;
      }
      else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx') || fileName.endsWith('.py') || fileName.endsWith('.java') || fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.css') || fileName.endsWith('.scss') || fileName.endsWith('.php')) {
        // File di codice
        return await file.text();
      }
      else {
        throw new Error(`Formato file non supportato: ${fileType || 'sconosciuto'}`);
      }
    } catch (error) {
      throw new Error(`Errore durante l'elaborazione del file: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }, []);

  // Validazione file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const supportedTypes = [
      'text/', 'application/json', 'text/csv', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'text/html'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'Il file è troppo grande (max 10MB)' };
    }

    const isSupported = supportedTypes.some(type => 
      file.type.includes(type) || 
      ['.txt', '.md', '.json', '.csv', '.pdf', '.doc', '.docx', '.html', '.htm', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.scss', '.php']
        .some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (!isSupported) {
      return { valid: false, error: 'Formato file non supportato' };
    }

    return { valid: true };
  }, []);

  // Processo un singolo file
  const processFile = useCallback(async (file: File, userId?: string): Promise<FileProcessingResult> => {
    setIsProcessing(true);

    try {
      const validation = validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const content = await extractTextContent(file, userId);
      
      const processedFile: ProcessedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        content,
        uploadedAt: new Date()
      };

      setUploadedFiles(prev => [...prev, processedFile]);

      return { success: true, file: processedFile };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore durante l\'elaborazione del file' 
      };
    } finally {
      setIsProcessing(false);
    }
  }, [extractTextContent, validateFile]);

  // Processo multipli file
  const processFiles = useCallback(async (files: FileList, userId?: string): Promise<FileProcessingResult[]> => {
    const results: FileProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await processFile(files[i], userId);
      results.push(result);
    }

    return results;
  }, [processFile]);

  // Rimuovi un file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Rimuovi tutti i file
  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // Genera context string per l'AI
  const getFilesContext = useCallback((): string => {
    if (uploadedFiles.length === 0) return '';

    const context = uploadedFiles.map(file => {
      const truncatedContent = file.content.length > 3000 
        ? file.content.substring(0, 3000) + '\n\n[...contenuto troncato...]'
        : file.content;

      return `=== FILE: ${file.name} ===
Tipo: ${file.type}
Dimensione: ${(file.size / 1024).toFixed(1)}KB
Caricato: ${file.uploadedAt.toLocaleString('it-IT')}

${truncatedContent}

=== FINE FILE ===`;
    }).join('\n\n');

    return `DOCUMENTI CARICATI DALL'UTENTE:\n\n${context}\n\nRispondi tenendo conto di questi documenti oltre alle tue conoscenze di base.`;
  }, [uploadedFiles]);

  return {
    uploadedFiles,
    isProcessing,
    processFile,
    processFiles,
    removeFile,
    clearFiles,
    getFilesContext,
    supportedFormats: ['TXT', 'MD', 'JSON', 'CSV', 'PDF', 'DOC', 'DOCX', 'HTML', 'JS', 'TS', 'PY', 'e altri file di testo']
  };
}
