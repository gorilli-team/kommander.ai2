
"use client";

import { useState } from 'react';
import { uploadFileAndProcess } from '@/app/training/actions';
import { useToast } from '@/hooks/use-toast';

interface UseFileUploadOptions {
  onUploadComplete?: () => void;
}

export function useFileUpload({ onUploadComplete }: UseFileUploadOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50); // Placeholder for "uploading"
      const response = await uploadFileAndProcess(formData);
      setUploadProgress(100); // Placeholder for "processing complete"
      
      if (response.error) {
        setError(response.error);
        toast({ title: "Upload Error", description: response.error, variant: "destructive" });
      } else if (response.success) {
        setSuccessMessage(response.success);
        toast({ title: "Upload Success", description: response.success });
        if (onUploadComplete) {
          onUploadComplete(); // Call directly on success
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during upload.';
      setError(errorMessage);
      toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset progress after a delay to allow user to see completion
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    successMessage,
  };
}
