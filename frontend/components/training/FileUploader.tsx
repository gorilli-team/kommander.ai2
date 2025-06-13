
"use client";

import React, { useState, useCallback } from 'react';
import { useFileUpload } from '@/frontend/hooks/useFileUpload';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Progress } from '@/frontend/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { UploadCloud, FileText, XCircle } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete?: () => void;
}

export default function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const { uploadFile, uploadProgress, isUploading, error, successMessage } = useFileUpload({ onUploadComplete });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsText(file);
      } else {
        setFilePreview(`Preview for ${file.type} not available here. It will be processed on the server.`);
      }
    } else {
      setSelectedFile(null);
      setFilePreview(null);
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
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      setSelectedFile(file);
       if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsText(file);
      } else {
        setFilePreview(`Preview for ${file.type} (e.g., ${file.name}) not available here. It will be processed on the server.`);
      }
      event.dataTransfer.clearData();
    }
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          <div 
            className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary transition-colors"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => document.getElementById('file-input-modal')?.click()}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT (MAX. 5MB)</p>
            <Input
              id="file-input-modal"
              type="file"
              accept=".pdf,.docx,.txt"
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
              <p className="text-sm text-primary">Processing: {selectedFile?.name}</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && !isUploading && (
            <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
               <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!selectedFile || isUploading} className="w-full sm:w-auto">
            {isUploading ? 'Processing...' : 'Upload and Process File'}
          </Button>
        </form>
    </div>
  );
}
