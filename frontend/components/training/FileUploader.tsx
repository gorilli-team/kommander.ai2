
"use client";

import React, { useState, useCallback } from 'react';
import { useFileUpload } from '@/frontend/hooks/useFileUpload';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Progress } from '@/frontend/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Badge } from '@/frontend/components/ui/badge';
import { UploadCloud, FileText, XCircle, FileImage, File, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete?: () => void;
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
}

export default function FileUploader({ 
  onUploadComplete, 
  maxFileSize = 5,
  acceptedFormats = ['.pdf', '.docx', '.txt', '.csv']
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { uploadFile, uploadProgress, isUploading, error, successMessage, retryUpload } = useFileUpload({ onUploadComplete });

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return `File type not supported. Accepted formats: ${acceptedFormats.join(', ')}`;
    }

    return null;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileText className="w-6 h-6 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <FileText className="w-6 h-6 text-orange-500" />;
      case 'txt':
        return <FileText className="w-6 h-6 text-gray-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="w-6 h-6 text-purple-500" />;
      default:
        return <File className="w-6 h-6 text-gray-400" />;
    }
  };

  const processFile = (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      setValidationError(validation);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    
    // Generate preview based on file type
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsText(file);
    } else {
      const fileSize = (file.size / 1024 / 1024).toFixed(2);
      setFilePreview(`${file.name} (${fileSize} MB)\nReady for processing on server.`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
      setValidationError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedFile) {
      await uploadFile(selectedFile);
    }
  };
  
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      processFile(file);
      event.dataTransfer.clearData();
    }
  }, [maxFileSize, acceptedFormats]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setValidationError(null);
  };

  return (
    <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-1">
          <div 
            className={`flex flex-col items-center justify-center w-full p-4 sm:p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
              dragActive 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : validationError 
                ? 'border-destructive bg-destructive/5'
                : 'border-border hover:border-primary hover:bg-primary/5'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onClick={() => document.getElementById('file-input-modal')?.click()}
          >
            <UploadCloud className={`w-10 h-10 sm:w-12 sm:h-12 mb-3 transition-colors ${
              dragActive ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <p className="mb-2 text-sm text-center text-muted-foreground">
              <span className="font-semibold text-primary">Clicca per caricare</span> o trascina e rilascia
            </p>
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {acceptedFormats.map((format) => (
                <Badge key={format} variant="outline" className="text-xs">
                  {format.toUpperCase()}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Dimensione massima file: {maxFileSize}MB</p>
            <Input
              id="file-input-modal"
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 border rounded-md bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
                  <XCircle className="w-5 h-5 text-destructive" />
                </Button>
              </div>
              {filePreview && filePreview.startsWith('Preview for') && (
                 <p className="mt-2 text-xs text-muted-foreground p-2 bg-background rounded">{filePreview}</p>
              )}
              {filePreview && !filePreview.startsWith('Preview for') && (
                <div className="mt-2 text-xs text-muted-foreground p-2 bg-background rounded max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{filePreview.substring(0, 200)}{filePreview.length > 200 ? '...' : ''}</pre>
                </div>
              )}
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <p className="text-sm text-primary">Elaborazione: {selectedFile?.name}</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Errore Caricamento</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && !isUploading && (
            <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
               <AlertTitle className="text-green-800">Successo</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!selectedFile || isUploading} className="w-full sm:w-auto">
            {isUploading ? 'Elaborazione...' : 'Carica ed Elabora File'}
          </Button>
        </form>
    </div>
  );
}
