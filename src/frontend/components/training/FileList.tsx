
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getUploadedFiles, deleteDocument, type DocumentDisplayItem } from '@/app/training/actions';
import FileUploader from '@/frontend/components/training/FileUploader';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardHeader } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/frontend/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/frontend/components/ui/dialog';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import { useToast } from '@/frontend/hooks/use-toast';
import { UploadCloud, Search, RefreshCw, FileText, Trash2, Info } from 'lucide-react';
import { formatDate } from '@/frontend/lib/formatDate'; // Assuming you have a formatDate utility

export default function FileList() {
  const [files, setFiles] = useState<DocumentDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedFiles = await getUploadedFiles();
      setFiles(fetchedFiles);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch files.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    fetchFiles(); // Refresh file list after upload
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      const response = await deleteDocument(id);
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'File deleted successfully.' });
        fetchFiles();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete file.', variant: 'destructive' });
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm) {
      return files;
    }
    return files.filter(file =>
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
          <Skeleton className="h-9 w-40" /> {/* Placeholder for Upload button */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-48" /> {/* Placeholder for search */}
            <Skeleton className="h-9 w-9" /> {/* Placeholder for refresh button */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-md flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="h-9">
              <UploadCloud className="mr-2 h-4 w-4" /> Upload Documents
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Upload Documents</DialogTitle>
              <DialogDescription>
                Upload PDF, DOCX, or TXT files to be processed and added to the knowledge base.
              </DialogDescription>
            </DialogHeader>
            <FileUploader onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search file names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-8 w-full sm:w-48 md:w-64 bg-background"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchFiles} disabled={isLoading} aria-label="Refresh files" className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-6 pb-6">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-md">
            <Info className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-foreground">
              {searchTerm ? "No Files Match Your Search" : "No Files Uploaded Yet"}
            </p>
            <p className="text-muted-foreground">
              {searchTerm ? "Try a different search term or clear the search." : 'Click "Upload Documents" to add your first file.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <div key={file.id} className="border border-border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3">
                  <FileText className="w-7 h-7 text-primary flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate" title={file.fileName}>{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Type: {file.originalFileType.split('/').pop()?.toUpperCase()} | Uploaded: {file.uploadedAt ? formatDate(file.uploadedAt, 'P p') : 'N/A'}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-0 sm:mr-1.5" /> <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the file &quot;{file.fileName}&quot; and its associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(file.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
