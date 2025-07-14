
"use client";

import type { Faq } from '@/backend/schemas/faq';
import { FaqSchema } from '@/backend/schemas/faq';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/frontend/components/ui/form';
import { createFaq, updateFaq } from '@/app/training/actions'; // Keep this path
import { useToast } from '@/frontend/hooks/use-toast';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import React from 'react';

type FaqInput = Omit<Faq, 'userId'>;

interface FaqFormProps {
  faq?: FaqInput;
  onSuccess?: () => void;
}

export default function FaqForm({ faq, onSuccess }: FaqFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { currentContext, currentOrganization } = useOrganization();

  const ClientFaqSchema = React.useMemo(() => FaqSchema.omit({ userId: true }), []);

  const form = useForm<FaqInput>({
    resolver: zodResolver(ClientFaqSchema),
    defaultValues: faq || {
      question: '',
      answer: '',
    },
  });

  React.useEffect(() => {
    form.reset(faq || { question: '', answer: '' });
  }, [faq, form]);

  const onSubmit = async (values: FaqInput) => {
    setIsSubmitting(true);
    try {
      const context = {
        type: currentContext,
        organizationId: currentOrganization?.id
      };
      
      let response;
      if (faq?.id) {
        response = await updateFaq(faq.id, values);
      } else {
        response = await createFaq(values, context);
      }

      if (response.error) {
        toast({
          title: 'Errore',
          description: response.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Successo',
          description: faq?.id ? 'FAQ aggiornata con successo.' : 'FAQ creata con successo.',
        });
        form.reset({ question: '', answer: '' }); 
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore inaspettato.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pt-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domanda</FormLabel>
                <FormControl>
                  <Input placeholder="Inserisci la domanda" {...field} className="bg-background" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risposta</FormLabel>
                <FormControl>
                  <Textarea placeholder="Inserisci la risposta" {...field} rows={5} className="bg-background" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (faq?.id ? 'Aggiornamento...' : 'Aggiunta...') : (faq?.id ? 'Aggiorna FAQ' : 'Aggiungi FAQ')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
