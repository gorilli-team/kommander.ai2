
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  LoginSchema, 
  RegisterDetailsSchema, 
  OtpSchema,
  type LoginFormData, 
  type RegisterDetailsFormData,
  type OtpFormData
} from '@/frontend/lib/schemas/auth.schemas';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel as RHFLabel } from '@/frontend/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import { signIn } from 'next-auth/react';
import { initiateRegistration, verifyOtpAndCompleteRegistration } from '@/app/actions/auth.actions';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react';

type AuthView = 'login' | 'registerDetails' | 'verifyOtp';

export default function AuthForm() {
  const [view, setView] = useState<AuthView>('login');
  const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/training';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isLoginPending, startLoginTransition] = useTransition();
  const [isRegisterDetailsPending, startRegisterDetailsTransition] = useTransition();
  const [isOtpPending, startOtpTransition] = useTransition();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerDetailsForm = useForm<RegisterDetailsFormData>({
    resolver: zodResolver(RegisterDetailsSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { otp: '' },
  });
  
  useEffect(() => {
    setError(null);
    setSuccess(null);
    // Resettare i form qui è ancora utile per pulire i valori
    // se l'utente naviga avanti e indietro senza che la `key` cambi
    // (ad esempio, se la key fosse basata su qualcos'altro)
    // e per resettare gli errori di validazione specifici del form.
    loginForm.reset();
    registerDetailsForm.reset(); 
    otpForm.reset();

    if (view !== 'verifyOtp') {
        setRegistrationEmail(null);
    }
  }, [view, loginForm, registerDetailsForm, otpForm]);


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
          } else if (result.error.includes("Email not verified")) {
             errorMessage = "Email not verified. Please check your email for the verification OTP/link or try registering again if the OTP expired.";
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

  const handleRegisterDetailsSubmit: SubmitHandler<RegisterDetailsFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startRegisterDetailsTransition(async () => {
      const result = await initiateRegistration(data);
      if (result.error) {
        let displayError = result.error;
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
            const fieldErrors = Object.entries(result.fieldErrors)
            .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
            .join('; ');
          displayError += ` Details: ${fieldErrors}`;
        }
        setError(displayError);
      } else if (result.success && result.email) {
        setSuccess(result.success);
        setRegistrationEmail(result.email);
        setView('verifyOtp');
      }
    });
  };
  
  const handleOtpSubmit: SubmitHandler<OtpFormData> = (data) => {
    setError(null);
    setSuccess(null);
    if (!registrationEmail) {
      setError("An error occurred. Please try the registration process again.");
      setView('registerDetails');
      return;
    }
    startOtpTransition(async () => {
      const result = await verifyOtpAndCompleteRegistration(registrationEmail, data.otp);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(result.success);
        setView('login'); 
        loginForm.setValue('email', registrationEmail); 
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

    if (view === 'registerDetails') {
      return (
        <Form {...registerDetailsForm} key="register-details-form">
          <form onSubmit={registerDetailsForm.handleSubmit(handleRegisterDetailsSubmit)} className="space-y-4">
            <FormField
              control={registerDetailsForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Name (Optional)</RHFLabel>
                  <FormControl><Input placeholder="Your Name" {...field} value={field.value || ''} disabled={isRegisterDetailsPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerDetailsForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Email</RHFLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isRegisterDetailsPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerDetailsForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Password</RHFLabel>
                  <FormControl><Input type="password" placeholder="•••••••• (min. 8 characters)" {...field} disabled={isRegisterDetailsPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerDetailsForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Confirm Password</RHFLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isRegisterDetailsPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-xs text-muted-foreground">
               By signing up, you agree to our Terms of Service and Privacy Policy.
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isRegisterDetailsPending}>
              {isRegisterDetailsPending ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        </Form>
      );
    }

    if (view === 'verifyOtp') {
      return (
        <Form {...otpForm} key="otp-form">
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
                An OTP has been sent to <strong>{registrationEmail}</strong>. Please enter it below.
            </div>
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Verification Code (OTP)</RHFLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter 6-digit OTP" 
                      {...field} 
                      disabled={isOtpPending}
                      maxLength={6}
                      className="text-center tracking-[0.3em]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isOtpPending}>
              {isOtpPending ? 'Verifying...' : 'Verify & Create Account'}
            </Button>
             <Button
                variant="link"
                type="button"
                onClick={() => {
                  const currentEmail = registrationEmail;
                  setView('registerDetails'); 
                  setRegistrationEmail(null); 
                  // otpForm.reset(); // Il reset viene gestito dall'useEffect o dal remount
                  if (currentEmail) {
                    // Ripopola l'email nel form dei dettagli se l'utente torna indietro
                    registerDetailsForm.setValue('email', currentEmail);
                  }
                }}
                className="w-full p-0 h-auto font-normal text-primary hover:underline"
                disabled={isOtpPending || isRegisterDetailsPending}
              >
                Entered wrong email or need new OTP? Go Back
              </Button>
          </form>
        </Form>
      );
    }
    return null;
  };

  const getTitle = () => {
    if (view === 'login') return 'Welcome back to ';
    if (view === 'registerDetails') return 'Create an account for ';
    if (view === 'verifyOtp') return 'Verify your email for ';
    return '';
  };

  const getDescription = () => {
    if (view === 'login') return 'Log in to your account';
    if (view === 'registerDetails') return 'Enter your details to get started';
    if (view === 'verifyOtp') return 'Check your inbox for the 6-digit code';
    return '';
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
         {view === 'verifyOtp' && <MailCheck className="h-12 w-12 text-primary mx-auto mb-2" />}
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
        {renderForm()}
        <div className="text-sm text-center mt-6">
          {view === 'login' && (
            <>
              Don&apos;t have an account yet?{' '}
              <Button variant="link" type="button" onClick={() => setView('registerDetails')} className="p-0 h-auto font-normal text-primary hover:underline" disabled={isLoginPending}>
                Sign up for free!
              </Button>
            </>
          )}
          {view === 'registerDetails' && (
            <>
              Already have an account?{' '}
              <Button variant="link" type="button" onClick={() => setView('login')} className="p-0 h-auto font-normal text-primary hover:underline" disabled={isRegisterDetailsPending}>
                Log in
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
    
