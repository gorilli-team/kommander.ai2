
import type { Metadata } from 'next';
import '../globals.css'; // Using the main globals.css for styling consistency for now
import { Inter } from 'next/font/google';
import { Toaster } from "@/frontend/components/ui/toaster"; // Keep toaster for potential errors

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Kommander.ai Widget',
  description: 'Kommander.ai Chat Widget',
};

export default function WidgetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Minimal head for widget context */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      {/*
        Ensure body is transparent and takes full height for iframe content.
        Overflow hidden prevents scrollbars on the iframe body itself.
      */}
      <body className={`${inter.variable} font-body antialiased bg-transparent overflow-hidden h-full`}>
        {/* Widget content does not use AppLayout, it's self-contained for iframe */}
        {children}
        <Toaster /> {/* Toaster might still be useful for system messages within the widget context if needed */}
      </body>
    </html>
  );
}
