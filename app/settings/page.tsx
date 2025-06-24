import SettingsClient from './SettingsClient';
import { getSettings } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsClient initialSettings={settings} />;
}
