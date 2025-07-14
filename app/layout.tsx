
import type { Metadata } from 'next';
import './globals.css'; 
import { Inter } from 'next/font/google';
import AppLayout from '@/frontend/components/layout/AppLayout';
import ThemeProvider from '@/frontend/components/layout/ThemeProvider';
import { Toaster } from "@/frontend/components/ui/toaster"; 
import { SessionProvider } from 'next-auth/react';
import CookieConsent from '@/frontend/components/privacy/CookieConsent';
import { OrganizationProvider } from '@/frontend/contexts/OrganizationContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Kommander.ai Proto',
  description: 'Kommander.ai Web App Prototype',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
        <script defer src="https://cloud.umami.is/script.js" data-website-id="dec59458-1e42-40cd-95b9-a758719d1dcf"></script>
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <SessionProvider> {/* SessionProvider MUST wrap the core content for NextAuth client features */}
          <ThemeProvider>
            <OrganizationProvider>
              <AppLayout>{children}</AppLayout>
              <Toaster />
              <CookieConsent />
            </OrganizationProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
