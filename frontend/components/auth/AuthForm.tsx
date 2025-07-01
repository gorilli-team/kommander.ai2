
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  LoginSchema, 
  RegisterSchema, // Usiamo RegisterSchema
  type LoginFormData, 
  type RegisterFormData // Usiamo RegisterFormData
} from '@/frontend/lib/schemas/auth.schemas';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
// Label non è più usato direttamente, RHFLabel si
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel as RHFLabel } from '@/frontend/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import { signIn } from 'next-auth/react';
import { registerUser } from '@/app/actions/auth.actions'; // Chiamiamo registerUser
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Separator } from '@/frontend/components/ui/separator';
import { AlertTriangle, CheckCircle2, UserPlus, Chrome, Github } from 'lucide-react'; // UserPlus per l'icona di registrazione
import { Icons } from '@/frontend/components/ui/icons';

type AuthView = 'login' | 'register'; // Viste semplificate

export default function AuthForm() {
  const [view, setView] = useState<AuthView>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/training';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isLoginPending, startLoginTransition] = useTransition();
  const [isRegisterPending, startRegisterTransition] = useTransition();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({ // Usiamo RegisterFormData
    resolver: zodResolver(RegisterSchema), // Usiamo RegisterSchema
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  
  useEffect(() => {
    setError(null);
    setSuccess(null);
    loginForm.reset();
    registerForm.reset(); 
  }, [view, loginForm, registerForm]);


  const handleLoginSubmit: SubmitHandler<LoginFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startLoginTransition(async () => {
      try {
        const result = await signIn('credentials', {
          redirect: false, 
          email: data.email,
          password: data.password,
        });

        if (result?.error) {
          let errorMessage = 'Login failed. Please check your credentials.';
          if (result.error === "CredentialsSignin") {
             errorMessage = 'Invalid email or password.';
          } else if (result.error.includes("Email not verified")) { // Questo potrebbe non accadere più se emailVerified è true di default
             errorMessage = "Email not verified. Please verify your email first.";
          } else {
             errorMessage = `Login error: ${result.error}.`;
          }
          setError(errorMessage);
        } else if (result?.ok && !result.error) {
          setSuccess('Login successful! Redirecting...');
          router.push(callbackUrl); 
          router.refresh(); 
        } else {
           setError('An unknown error occurred during login.');
        }
      } catch (clientError: any) {
          setError(`Client exception: ${clientError.message || 'Failed to process login request.'}`);
      }
    });
  };

  const handleRegisterSubmit: SubmitHandler<RegisterFormData> = (data) => { // Usiamo RegisterFormData
    setError(null);
    setSuccess(null);
    startRegisterTransition(async () => {
      const result = await registerUser(data); // Chiamiamo registerUser
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
        setView('login'); // Reindirizza al login dopo la registrazione
        loginForm.setValue('email', data.email); // Precompila l'email nel form di login
        loginForm.setValue('password', '');
      }
    });
  };
  

  const renderForm = () => {
    if (view === 'login') {
      return (
        <Form {...loginForm} key="login-form">
          <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Email</RHFLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isLoginPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Password</RHFLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isLoginPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoginPending}>
              {isLoginPending ? 'Processing...' : 'Log In'}
            </Button>
          </form>
        </Form>
      );
    }

    if (view === 'register') { // Vista per la registrazione diretta
      return (
        <Form {...registerForm} key="register-form">
          <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
            <FormField
              control={registerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Name (Optional)</RHFLabel>
                  <FormControl><Input placeholder="Your Name" {...field} value={field.value || ''} disabled={isRegisterPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Email</RHFLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isRegisterPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Password</RHFLabel>
                  <FormControl><Input type="password" placeholder="•••••••• (min. 8 characters)" {...field} disabled={isRegisterPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Confirm Password</RHFLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isRegisterPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-xs text-muted-foreground">
               By signing up, you agree to our Terms of Service and Privacy Policy.
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isRegisterPending}>
              {isRegisterPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      );
    }
    return null;
  };

  const getTitle = () => {
    if (view === 'login') return 'Welcome back to ';
    if (view === 'register') return 'Create an account for ';
    return '';
  };

  const getDescription = () => {
    if (view === 'login') return 'Log in to your account';
    if (view === 'register') return 'Enter your details to get started';
    return '';
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
         {view === 'register' && <UserPlus className="h-12 w-12 text-primary mx-auto mb-2" />}
        <CardTitle className="text-2xl font-bold text-foreground mb-1">
          {getTitle()}
          <span className="text-primary"><KommanderIcon /></span> Kommander
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {getDescription()}
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
        {/* OAuth Providers Section */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => signIn('google', { callbackUrl })}
            disabled={isLoginPending || isRegisterPending}
          >
            <Icons.google className="h-5 w-5" />
            Continue with Google
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => signIn('github', { callbackUrl })}
            disabled={isLoginPending || isRegisterPending}
          >
            <Icons.github className="h-5 w-5" />
            Continue with GitHub
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => signIn('microsoft-entra-id', { callbackUrl })}
            disabled={isLoginPending || isRegisterPending}
          >
            <Icons.microsoft className="h-5 w-5" />
            Continue with Microsoft
          </Button>
        </div>

        {/* Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {renderForm()}
        <div className="text-sm text-center mt-6">
          {view === 'login' && (
            <>
              Don&apos;t have an account yet?{' '}
              <Button variant="link" type="button" onClick={() => setView('register')} className="p-0 h-auto font-normal text-primary hover:underline" disabled={isLoginPending}>
                Sign up for free!
              </Button>
            </>
          )}
          {view === 'register' && (
            <>
              Already have an account?{' '}
              <Button variant="link" type="button" onClick={() => setView('login')} className="p-0 h-auto font-normal text-primary hover:underline" disabled={isRegisterPending}>
                Log in
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
