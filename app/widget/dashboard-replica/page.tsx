
import DashboardLookalikeWidget from '@/frontend/components/widget/DashboardLookalikeWidget';

export default function DashboardReplicaPage() {
  return (
    // This div ensures the widget component takes full height and width within the iframe page
    <div style={{ height: '100%', width: '100%' }}>
      <DashboardLookalikeWidget />
    </div>
  );
}
