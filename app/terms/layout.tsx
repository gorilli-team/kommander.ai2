import { generatePageMetadata } from '@/frontend/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description: 'Read our Terms of Service to understand the legal agreement between you and Kommander.ai. Learn about user responsibilities, prohibited activities, and payment terms.',
  url: '/terms',
  noIndex: false,
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
