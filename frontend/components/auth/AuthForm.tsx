
"use client";

import React, { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, RegisterSchema, type LoginFormData, type RegisterFormData } from '@/frontend/lib/schemas/auth.schemas';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/frontend/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import { signIn } from 'next-auth/react';
import { registerUser } from '@/app/actions/auth.actions';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

type FormData = LoginFormData | RegisterFormData;

export default function AuthForm() {
  const [isLoginView, setIsLoginView] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/training';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentSchema = isLoginView ? LoginSchema : RegisterSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    form.reset({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError(null);
    setSuccess(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginView]);

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      if (isLoginView) {
        const loginData = data as LoginFormData;
        console.log('[AuthForm.tsx] Attempting login with credentials:', { email: loginData.email, passwordPresent: !!loginData.password });
        try {
          const result = await signIn('credentials', {
            redirect: false,
            email: loginData.email,
            password: loginData.password,
          });
          console.log('[AuthForm.tsx] signIn result:', result);
          if (result?.error) {
            if (result.error === "CredentialsSignin") {
               setError('Login failed: Invalid email or password.');
            } else {
              setError(`Login failed: ${result.error}`);
            }
          } else if (result?.ok && !result.error) {
            setSuccess('Login successful! Redirecting...');
            router.push(callbackUrl); 
            router.refresh();
          } else {
             setError('An unknown error occurred during login. Please try again.');
          }
        } catch (clientError: any) {
            console.error('[AuthForm.tsx] Client-side error during signIn:', clientError);
            setError(`Client error: ${clientError.message || 'Failed to process login.'}`);
        }
      } else { 
        const registerData = data as RegisterFormData;
        console.log('[AuthForm.tsx] Attempting registration with data:', {name: registerData.name, email: registerData.email, passwordPresent: !!registerData.password});
        const result = await registerUser(registerData);
        console.log('[AuthForm.tsx] registerUser result:', result);
        if (result.error) {
          let displayError = result.error;
          if (result.details) {
            const fieldErrors = Object.values(result.details).flat().join(' ');
            displayError += ` ${fieldErrors}`;
          }
          setError(displayError);
        } else if (result.success) {
          setSuccess(result.success + " Please log in.");
          setIsLoginView(true);
          form.reset({ name: '', email: '', password: '', confirmPassword: '' }); 
        }
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground mb-1">
          {isLoginView ? 'Welcome back to ' : 'Create an account for '}
          <span className="text-primary"><KommanderIcon /></span> Kommander
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isLoginView ? 'Log in to your account' : 'Sign up to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isLoginView && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="name">Name (Optional)</Label>
                    <FormControl>
                      <Input id="name" placeholder="Your Name" {...field} value={field.value || ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email</Label>
                  <FormControl>
                    <Input id="email" type="email" placeholder="you@example.com" {...field} value={field.value || ''} disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="password">Password</Label>
                  <FormControl>
                    <Input id="password" type="password" placeholder="••••••••" {...field} value={field.value || ''} disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isLoginView && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <FormControl>
                      <Input id="confirmPassword" type="password" placeholder="••••••••" {...field} value={field.value || ''} disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700">
                 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
              </Alert>
            )}
            
            {isLoginView && (
              <div className="text-sm">
                {/* "Forgot password" functionality can be added later */}
                {/* <Button variant="link" type="button" className="p-0 h-auto font-normal text-primary hover:underline" disabled={isPending}>
                  Forgot your password?
                </Button> */}
              </div>
            )}
            {!isLoginView && (
                 <div className="text-xs text-muted-foreground">
                    By signing up, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                 </div>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isPending}>
              {isPending ? 'Processing...' : (isLoginView ? 'Log In' : 'Sign Up')}
            </Button>
          </form>
        </Form>
        <div className="text-sm text-center mt-6">
          {isLoginView ? "Don't have an account yet? " : "Already have an account? "}
          <Button
            variant="link"
            type="button"
            onClick={() => setIsLoginView(!isLoginView)}
            className="p-0 h-auto font-normal text-primary hover:underline"
            disabled={isPending}
          >
            {isLoginView ? 'Sign up for free!' : 'Log in'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
