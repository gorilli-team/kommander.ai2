
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  LoginSchema, 
  InitialRegisterSchema,
  OtpSchema,
  ForgotPasswordSchema,
  type LoginFormData, 
  type InitialRegisterFormData,
  type OtpFormData,
  type ForgotPasswordFormData
} from '@/frontend/lib/schemas/auth.schemas';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel as RHFLabel } from '@/frontend/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import { signIn } from 'next-auth/react';
import { initiateRegistration, verifyOtpAndCompleteRegistration, resendOtp, requestPasswordReset } from '@/app/actions/auth.actions';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Separator } from '@/frontend/components/ui/separator';
import { AlertTriangle, CheckCircle2, UserPlus, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { Icons } from '@/frontend/components/ui/icons';

type AuthView = 'login' | 'register' | 'otp-verification' | 'forgot-password';

interface PendingRegistration {
  email: string;
  name?: string;
}

export default function AuthForm() {
  const [view, setView] = useState<AuthView>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for invitation token and construct appropriate callback URL
  const inviteToken = searchParams.get('token');
  const providedCallbackUrl = searchParams.get('callbackUrl');
  
  // If there's an invitation token, make sure it's preserved in the callback URL
  let callbackUrl = providedCallbackUrl || '/training';
  if (inviteToken && !callbackUrl.includes('/invite')) {
    callbackUrl = `/invite?token=${inviteToken}`;
  }
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

  const [isLoginPending, startLoginTransition] = useTransition();
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isOtpPending, startOtpTransition] = useTransition();
  const [isResendPending, startResendTransition] = useTransition();
  const [isForgotPasswordPending, startForgotPasswordTransition] = useTransition();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<InitialRegisterFormData>({
    resolver: zodResolver(InitialRegisterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { email: '', otp: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
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

  const handleRegisterSubmit: SubmitHandler<InitialRegisterFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startRegisterTransition(async () => {
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
      } else if (result.success) {
        setSuccess(result.success);
        setPendingRegistration({ email: data.email, name: data.name });
        otpForm.setValue('email', data.email);
        setView('otp-verification');
      }
    });
  };

  const handleOtpSubmit: SubmitHandler<OtpFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startOtpTransition(async () => {
      const result = await verifyOtpAndCompleteRegistration(data);
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
        setPendingRegistration(null);
        setView('login');
        loginForm.setValue('email', data.email);
        loginForm.setValue('password', '');
      }
    });
  };

  const handleResendOtp = () => {
    if (!pendingRegistration?.email) return;
    
    setError(null);
    setSuccess(null);
    startResendTransition(async () => {
      const result = await resendOtp(pendingRegistration.email);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(result.success);
      }
    });
  };

  const handleForgotPasswordSubmit: SubmitHandler<ForgotPasswordFormData> = (data) => {
    setError(null);
    setSuccess(null);
    startForgotPasswordTransition(async () => {
      const result = await requestPasswordReset(data);
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
        // Dopo il successo, torna al login
        setTimeout(() => {
          setView('login');
          forgotPasswordForm.reset();
        }, 3000);
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
            <div className="flex items-center justify-between">
              <Button 
                type="button" 
                variant="link" 
                onClick={() => setView('forgot-password')}
                className="p-0 h-auto text-sm text-primary hover:underline"
                disabled={isLoginPending}
              >
                Forgot password?
              </Button>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoginPending}>
              {isLoginPending ? 'Processing...' : 'Log In'}
            </Button>
          </form>
        </Form>
      );
    }

    if (view === 'register') {
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
               By signing up, you agree to our{' '}
               <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
               {' '}and{' '}
               <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isRegisterPending}>
              {isRegisterPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      );
    }

    if (view === 'otp-verification') {
      return (
        <Form {...otpForm} key="otp-form">
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to
                <br />
                <span className="font-medium">{pendingRegistration?.email}</span>
              </p>
            </div>
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Verification Code</RHFLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="000000" 
                      {...field} 
                      disabled={isOtpPending}
                      className="text-center text-lg font-mono tracking-wider"
                      maxLength={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isOtpPending}>
              {isOtpPending ? 'Verifying...' : 'Verify Email'}
            </Button>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleResendOtp}
                disabled={isResendPending}
                className="w-full"
              >
                {isResendPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Resending...</>
                ) : (
                  <>Resend Code</>
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setView('register');
                  setPendingRegistration(null);
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Registration
              </Button>
            </div>
          </form>
        </Form>
      );
    }

    if (view === 'forgot-password') {
      return (
        <Form {...forgotPasswordForm} key="forgot-password-form">
          <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4">
            <FormField
              control={forgotPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RHFLabel>Email</RHFLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isForgotPasswordPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isForgotPasswordPending}>
              {isForgotPasswordPending ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setView('login')}
              className="w-full"
              disabled={isForgotPasswordPending}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
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
    if (view === 'forgot-password') return 'Reset your password for ';
    return '';
  };

  const getDescription = () => {
    if (view === 'login') return 'Log in to your account';
    if (view === 'register') return 'Enter your details to get started';
    if (view === 'forgot-password') return 'Enter your email to receive a reset link';
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
          {/* Google temporarily disabled - configure GOOGLE_CLIENT_ID first */}
          {/* <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => signIn('google', { callbackUrl })}
            disabled={isLoginPending || isRegisterPending}
          >
            <Icons.google className="h-5 w-5" />
            Continue with Google
          </Button> */}
          
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
