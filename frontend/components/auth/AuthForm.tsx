
// frontend/components/auth/AuthForm.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/frontend/components/ui/form';
import { useRouter } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon'; // For the ⌘ icon

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type LoginFormData = z.infer<typeof LoginSchema>;

const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
type RegisterFormData = z.infer<typeof RegisterSchema>;

type FormData = LoginFormData | RegisterFormData;

export default function AuthForm() {
  const [isLoginView, setIsLoginView] = useState(true);
  const router = useRouter();

  const currentSchema = isLoginView ? LoginSchema : RegisterSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isLoginView ? {} : { confirmPassword: '' }),
    },
  });

  React.useEffect(() => {
    form.reset({
      email: '',
      password: '',
      ...(isLoginView ? {} : { confirmPassword: '' }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginView, form.reset]);


  const onSubmit: SubmitHandler<FormData> = (data) => {
    console.log(isLoginView ? 'Login attempt:' : 'Registration attempt:', data);
    // Simulate successful auth and redirect
    // For prototype, you can manually check for arbi@gorilli.io and 5736QWErty if needed
    // if (isLoginView && data.email === 'arbi@gorilli.io' && (data as LoginFormData).password === '5736QWErty') {
    //   router.push('/training');
    // } else if (!isLoginView) {
    //   router.push('/training'); // Simulate registration success
    // } else {
    //   // Handle incorrect login in a real app
    // }
    router.push('/training'); 
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email</Label>
                  <FormControl>
                    <Input id="email" type="email" placeholder="you@example.com" {...field} />
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
                    <Input id="password" type="password" placeholder="••••••••" {...field} />
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
                      <Input id="confirmPassword" type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {isLoginView && (
              <div className="text-sm">
                <Button variant="link" type="button" className="p-0 h-auto font-normal text-primary hover:underline">
                  Forgot your password?
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              {isLoginView ? 'Log In' : 'Sign Up'}
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
          >
            {isLoginView ? 'Sign up for free!' : 'Log in'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
