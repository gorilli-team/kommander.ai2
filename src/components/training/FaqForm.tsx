
"use client";

import type { Faq } from '@/lib/schemas/faq';
import { FaqSchema } from '@/lib/schemas/faq';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createFaq, updateFaq } from '@/app/training/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card not used directly if in modal
import React from 'react';

interface FaqFormProps {
  faq?: Faq; // For editing existing FAQ
  onSuccess?: () => void; // Callback on successful submission
}

export default function FaqForm({ faq, onSuccess }: FaqFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<Faq>({
    resolver: zodResolver(FaqSchema),
    defaultValues: faq || {
      question: '',
      answer: '',
    },
  });

  // Effect to reset form when `faq` prop changes (e.g., when opening modal for a new FAQ after editing one)
  React.useEffect(() => {
    form.reset(faq || { question: '', answer: '' });
  }, [faq, form]);

  const onSubmit = async (values: Faq) => {
    setIsSubmitting(true);
    try {
      let response;
      if (faq?.id) {
        response = await updateFaq(faq.id, values);
      } else {
        response = await createFaq(values);
      }

      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: faq?.id ? 'FAQ updated successfully.' : 'FAQ created successfully.',
        });
        form.reset({ question: '', answer: '' }); // Reset to empty for next "Add New"
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Form is now rendered directly, not inside a Card, as it's meant for a modal
    <div className="w-full pt-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the question" {...field} className="bg-background" />
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
                <FormLabel>Answer</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter the answer" {...field} rows={5} className="bg-background" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (faq?.id ? 'Updating...' : 'Adding...') : (faq?.id ? 'Update FAQ' : 'Add FAQ')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
