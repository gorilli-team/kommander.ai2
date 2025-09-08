
"use client";

import { useState } from 'react';
import { uploadFileAndProcess } from '@/app/training/actions'; // Keep this path
import { useToast } from '@/frontend/hooks/use-toast';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

interface UseFileUploadOptions {
  onUploadComplete?: () => void;
}

export function useFileUpload({ onUploadComplete }: UseFileUploadOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { currentContext, currentOrganization } = useOrganization();

  const uploadFile = async (file: File, isRetry = false) => {
    setLastFile(file);
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const context = {
      type: currentContext,
      organizationId: currentOrganization?.id
    };

    try {
      // Simulate incremental progress for better UX
      setUploadProgress(25);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setUploadProgress(50);
      const response = await uploadFileAndProcess(formData, context);
      
      setUploadProgress(85);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setUploadProgress(100);
      
      if (response.error) {
        setError(response.error);
        toast({ 
          title: isRetry ? "Retry Failed" : "Upload Error", 
          description: response.error, 
          variant: "destructive",
        });
      } else if (response.success) {
        setSuccessMessage(response.success);
        toast({ 
          title: isRetry ? "Upload Successful (Retry)" : "Upload Success", 
          description: response.success,
          className: "border-green-500 bg-green-50"
        });
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Connection failed. Please check your internet and try again.';
      setError(errorMessage);
      toast({ 
        title: isRetry ? "Retry Failed" : "Upload Failed", 
        description: errorMessage, 
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 3000);
    }
  };

  const retryUpload = async () => {
    if (lastFile && !isUploading) {
      await uploadFile(lastFile, true);
    }
  };

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    successMessage,
    retryUpload,
    canRetry: !!lastFile && !isUploading,
  };
}
