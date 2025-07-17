import SettingsClient from './SettingsClient';
import { getSettings } from './actions';
import { generatePageMetadata } from '@/frontend/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata = generatePageMetadata({
  title: 'Settings',
  description: 'Configure your Kommander.ai account settings, manage your AI chatbot preferences, and customize your experience.',
  url: '/settings',
  noIndex: true, // Settings page should not be indexed
});

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsClient initialSettings={settings} />;
}
