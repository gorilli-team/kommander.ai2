'use client';

import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle2, Paperclip } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { Alert, AlertDescription } from '@/frontend/components/ui/alert';
import { cn } from '@/frontend/lib/utils';
import { useFileProcessor, ProcessedFile, FileProcessingResult } from '@/frontend/hooks/useFileProcessor';

interface FileUploaderProps {
  onFilesProcessed?: (files: ProcessedFile[]) => void;
  className?: string;
  userId?: string;
}

export function FileUploader({ onFilesProcessed, className, userId }: FileUploaderProps) {
  const { 
    uploadedFiles, 
    isProcessing, 
    processFiles, 
    removeFile, 
    clearFiles,
    supportedFormats 
  } = useFileProcessor();
  
  const [results, setResults] = useState<FileProcessingResult[]>([]);

  // Gestisce la selezione tramite input
  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const results = await processFiles(files, userId);
      setResults(results);
      // Chiamiamo la callback dopo che i file sono stati processati
      setTimeout(() => {
        onFilesProcessed?.(uploadedFiles);
      }, 100); // Piccolo delay per assicurarsi che lo stato sia aggiornato
    }
    // Reset input
    e.target.value = '';
  }, [processFiles, uploadedFiles, onFilesProcessed]);


  const handleRemoveFile = useCallback((fileId: string) => {
    removeFile(fileId);
    onFilesProcessed?.(uploadedFiles.filter(f => f.id !== fileId));
  }, [removeFile, uploadedFiles, onFilesProcessed]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Area di Upload */}
      <div
        className={cn(
          "relative border rounded-lg p-3 transition-colors cursor-pointer bg-muted/30 hover:bg-muted/50",
          isProcessing && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,.html,.htm,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.css,.scss,.php"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-2 bg-muted rounded-full">
            {isProcessing ? (
              <Upload className="w-5 h-5 animate-pulse text-muted-foreground" />
            ) : (
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isProcessing ? 'Elaborazione in corso...' : 'Clicca per caricare file'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Formati supportati: {supportedFormats.slice(0, 4).join(', ')} e altri
            </p>
            <p className="text-xs text-muted-foreground">
              Max 10MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Lista file caricati */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">File caricati ({uploadedFiles.length})</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFiles}
              className="text-xs h-6 px-2"
            >
              Rimuovi tutti
            </Button>
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <File className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-muted-foreground">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleTimeString('it-IT')}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file.id)}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risultati ultimo upload */}
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((result, index) => (
            <Alert 
              key={index}
              variant={result.success ? "default" : "destructive"}
              className="py-2"
            >
              {result.success ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <AlertDescription className="text-xs">
                {result.success 
                  ? `✓ ${result.file?.name} caricato con successo`
                  : `✗ ${result.error}`
                }
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Informazioni sui file */}
      {uploadedFiles.length > 0 && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
          </Badge>
          <span>•</span>
          <span>
            I file sono elaborati localmente e non vengono inviati ai server
          </span>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
