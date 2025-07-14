
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getUploadedFiles, deleteDocument, type DocumentDisplayItem } from '@/app/training/actions'; // Keep this path
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
import { formatDate } from '@/frontend/lib/formatDate';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

export default function FileList() {
  const [files, setFiles] = useState<DocumentDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toast } = useToast();
  const { currentContext, currentOrganization } = useOrganization();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const context = {
        type: currentContext,
        organizationId: currentOrganization?.id
      };
      const fetchedFiles = await getUploadedFiles(context);
      setFiles(fetchedFiles);
    } catch (error) {
      toast({ title: 'Errore', description: 'Impossibile caricare i file.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentContext, currentOrganization?.id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    fetchFiles(); 
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      const response = await deleteDocument(id);
      if (response.error) {
        toast({ title: 'Errore', description: response.error, variant: 'destructive' });
      } else {
        toast({ title: 'Successo', description: 'File eliminato con successo.' });
        fetchFiles();
      }
    } catch (error) {
      toast({ title: 'Errore', description: 'Impossibile eliminare il file.', variant: 'destructive' });
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
          <Skeleton className="h-9 w-40" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-9" />
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
              <UploadCloud className="mr-2 h-4 w-4" /> Carica Documenti
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Carica Documenti</DialogTitle>
              <DialogDescription>
                Carica file PDF, DOCX o TXT per essere elaborati e aggiunti alla base di conoscenza.
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
              placeholder="Cerca nomi file..."
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
              {searchTerm ? "Nessun File Corrisponde alla Ricerca" : "Nessun File Caricato Ancora"}
            </p>
            <p className="text-muted-foreground">
              {searchTerm ? "Prova un termine di ricerca diverso o pulisci la ricerca." : 'Clicca "Carica Documenti" per aggiungere il tuo primo file.'}
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
                      Tipo: {file.originalFileType.split('/').pop()?.toUpperCase()} | Caricato: {file.uploadedAt ? formatDate(file.uploadedAt, 'P p') : 'N/A'}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-0 sm:mr-1.5" /> <span className="hidden sm:inline">Elimina</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione non può essere annullata. Questo eliminerà permanentemente il file &quot;{file.fileName}&quot; e i suoi dati associati.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(file.id)}>
                        Elimina
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
