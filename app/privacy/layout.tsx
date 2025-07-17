import { generatePageMetadata } from '@/frontend/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Privacy Policy',
  description: 'Learn about how Kommander.ai collects, uses, and safeguards your personal information. Our privacy policy ensures transparency and compliance with data protection regulations.',
  url: '/privacy',
  noIndex: false,
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
