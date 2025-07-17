import { generatePageMetadata } from '@/frontend/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Sign In',
  description: 'Sign in to your Kommander.ai account to access your AI-powered customer support dashboard and manage your chatbot configurations.',
  url: '/login',
  noIndex: false,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
