
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Faq } from '@/lib/schemas/faq';
import { getFaqs, deleteFaq, type FaqDisplayItem } from '@/app/training/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Edit3, Trash2, RefreshCw, Info, Search, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FaqForm from './FaqForm';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

interface FaqListProps {
  // Props for FaqList, if any, would be defined here.
}

export default function FaqList(props: FaqListProps) {
  const [faqs, setFaqs] = useState<FaqDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedFaqsResult = await getFaqs();
      setFaqs(fetchedFaqsResult);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch FAQs.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, setIsLoading, setFaqs]); 

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      const response = await deleteFaq(id);
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'FAQ deleted successfully.' });
        fetchFaqs(); 
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete FAQ.', variant: 'destructive' });
    }
  };

  const handleEdit = (faqItem: FaqDisplayItem) => {
    const faqForEditing: Faq = {
      ...faqItem,
      id: faqItem.id, 
      createdAt: faqItem.createdAt ? new Date(faqItem.createdAt) : undefined,
      updatedAt: faqItem.updatedAt ? new Date(faqItem.updatedAt) : undefined,
    };
    setEditingFaq(faqForEditing);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingFaq(null);
    fetchFaqs(); 
  };

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    fetchFaqs();
  };

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) {
      return faqs;
    }
    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [faqs, searchTerm]);

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
           <Skeleton className="h-9 w-36" /> {/* Placeholder for Add FAQ button */}
           <div className="flex items-center space-x-2"> {/* Group for right items */}
             <Skeleton className="h-9 w-48" /> {/* Placeholder for search */}
             <Skeleton className="h-9 w-9" /> {/* Placeholder for refresh button */}
           </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-md">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="w-full shadow-lg rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="h-9">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Add New FAQ</DialogTitle>
                <DialogDescription>
                  Fill in the question and answer to add a new FAQ to your knowledge base.
                </DialogDescription>
              </DialogHeader>
              <FaqForm onSuccess={handleAddSuccess} />
            </DialogContent>
          </Dialog>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-8 w-full sm:w-48 md:w-64 bg-background"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchFaqs} disabled={isLoading} aria-label="Refresh FAQs" className="h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-6 pb-6">
          {filteredFaqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-md">
              <Info className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-lg font-medium text-foreground">
                {searchTerm ? "No FAQs Match Your Search" : "No FAQs Yet"}
              </p>
              <p className="text-muted-foreground">
                {searchTerm ? `Try a different search term or clear the search.` : `Click "Add New FAQ" to create your first one.`}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faqItem) => (
                <AccordionItem value={faqItem.id || ''} key={faqItem.id} className="border-b border-border last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-1 py-4 text-base">
                    <div className="flex-1 text-left mr-2"> {/* Added mr-2 for spacing from chevron */}
                      <p className="font-medium text-foreground">{faqItem.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                        {faqItem.answer}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-1 pb-4 pt-2 text-muted-foreground">
                    <p className="whitespace-pre-wrap">{faqItem.answer}</p>
                    <div className="mt-4 flex space-x-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(faqItem)}>
                        <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this FAQ.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(faqItem.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {editingFaq && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setEditingFaq(null); 
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Edit FAQ</DialogTitle>
              <DialogDescription>
                Modify the question or answer for this FAQ.
              </DialogDescription>
            </DialogHeader>
            <FaqForm
              faq={editingFaq}
              onSuccess={handleEditSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

