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

  // Function to extract text from different file formats
  const extractTextContent = useCallback(async (file: File, userId?: string): Promise<string> => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    try {
      // For PDF and DOCX, use the server if possible
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
            // Fallback if the server cannot extract text
            return `[${file.name}]\n\n⚠️ Unable to extract text from this document.\n\nIf it's a textual document (not a scan):\n1. Open it\n2. Select all text (Ctrl+A or Cmd+A)\n3. Copy and paste it into a new message\n\nOtherwise I can help you with my basic knowledge on the topic.`;
          }
        } catch (serverError) {
          console.error('Server processing failed:', serverError);
          // Fallback to instruction message
          return `[${file.name}]\n\n⚠️ Server processing not available.\n\nTo analyze this document:\n1. Open it\n2. Select all text (Ctrl+A or Cmd+A)\n3. Copy and paste it into a new message`;
        }
      }
      
      // Local processing for other file types
      if (fileType.includes('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        // Plain text files
        return await file.text();
      } 
      else if (fileType.includes('application/json') || fileName.endsWith('.json')) {
        // JSON files
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          return JSON.stringify(json, null, 2);
        } catch {
          return text;
        }
      }
      else if (fileType.includes('text/csv') || fileName.endsWith('.csv')) {
        // CSV files
        const text = await file.text();
        return text;
      }
      else if (fileType.includes('text/html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        // HTML files - remove tags
        const text = await file.text();
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || text;
      }
      else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx') || fileName.endsWith('.py') || fileName.endsWith('.java') || fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.css') || fileName.endsWith('.scss') || fileName.endsWith('.php')) {
        // Code files
        return await file.text();
      }
      else {
        throw new Error(`Unsupported file format: ${fileType || 'unknown'}`);
      }
    } catch (error) {
      throw new Error(`Error during file processing: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }, []);

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const supportedTypes = [
      'text/', 'application/json', 'text/csv', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'text/html'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File is too large (max 10MB)' };
    }

    const isSupported = supportedTypes.some(type => 
      file.type.includes(type) || 
      ['.txt', '.md', '.json', '.csv', '.pdf', '.doc', '.docx', '.html', '.htm', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.scss', '.php']
        .some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (!isSupported) {
      return { valid: false, error: 'Unsupported file format' };
    }

    return { valid: true };
  }, []);

  // Process a single file
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
        error: error instanceof Error ? error.message : 'Error during file processing'
      };
    } finally {
      setIsProcessing(false);
    }
  }, [extractTextContent, validateFile]);

  // Process multiple files
  const processFiles = useCallback(async (files: FileList, userId?: string): Promise<FileProcessingResult[]> => {
    const results: FileProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await processFile(files[i], userId);
      results.push(result);
    }

    return results;
  }, [processFile]);

  // Remove a file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Remove all files
  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // Generate context string for AI
  const getFilesContext = useCallback((): string => {
    if (uploadedFiles.length === 0) return '';

    const context = uploadedFiles.map(file => {
      const truncatedContent = file.content.length > 3000 
        ? file.content.substring(0, 3000) + '\n\n[...content truncated...]'
        : file.content;

      return `=== FILE: ${file.name} ===
Type: ${file.type}
Size: ${(file.size / 1024).toFixed(1)}KB
Uploaded: ${file.uploadedAt.toLocaleString('en-US')}

${truncatedContent}

=== END FILE ===
    }).join('\n\n');

    return `DOCUMENTS UPLOADED BY USER:

${context}

Respond taking into account these documents in addition to your basic knowledge.`;
  }, [uploadedFiles]);

  return {
    uploadedFiles,
    isProcessing,
    processFile,
    processFiles,
    removeFile,
    clearFiles,
    getFilesContext,
    supportedFormats: ['TXT', 'MD', 'JSON', 'CSV', 'PDF', 'DOC', 'DOCX', 'HTML', 'JS', 'TS', 'PY', 'and other text files']
  };
}
