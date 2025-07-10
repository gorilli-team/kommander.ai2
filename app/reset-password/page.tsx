"use client";

import React, { useState, useTransition, useEffect, Suspense } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ResetPasswordSchema,
  type ResetPasswordFormData 
} from '@/frontend/lib/schemas/auth.schemas';
import { resetPassword } from '@/app/actions/auth.actions';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/frontend/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { AlertTriangle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isResetPending, startResetTransition] = useTransition();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { 
      token: token || '', 
      email: email || '', 
      password: '', 
      confirmPassword: '' 
    },
  });

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      form.setValue('token', token);
      form.setValue('email', email);
    }
  }, [token, email, form]);

  const handleResetSubmit: SubmitHandler<ResetPasswordFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startResetTransition(async () => {
      const result = await resetPassword(data);
      if (result.error) {
        let displayError = result.error;
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          const fieldErrors = Object.entries(result.fieldErrors)
            .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
            .join('; ');
          displayError += ` Details: ${fieldErrors}`;
        }
        setError(displayError);
      } else if (result.success) {
        setSuccess(result.success);
        // Reindirizza al login dopo 3 secondi
        setTimeout(() => {
          router.push('/auth');
        }, 3000);
      }
    });
  };

  if (!token || !email) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Invalid Reset Link
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The password reset link is invalid or has expired. Please request a new password reset.
            </AlertDescription>
          </Alert>
          <Link href="/auth">
            <Button className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl font-bold text-foreground mb-1">
          Reset Password for <span className="text-primary"><KommanderIcon /></span> Kommander
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="default" className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleResetSubmit)} className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Resetting password for: <span className="font-medium">{email}</span>
            </div>
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter new password" 
                      {...field} 
                      disabled={isResetPending} 
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Password must contain at least 8 characters with uppercase, lowercase, number, and special character.
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm new password" 
                      {...field} 
                      disabled={isResetPending} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90" 
              disabled={isResetPending}
            >
              {isResetPending ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <Link href="/auth">
            <Button variant="ghost" className="text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
