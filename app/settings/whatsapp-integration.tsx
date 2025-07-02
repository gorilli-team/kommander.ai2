import { useEffect, useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import QRCode from 'qrcode.react';

export function WhatsAppIntegration() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/start', { method: 'POST' });
      const data = await response.json();
      setQrCode(data.qrCode || null);
      setStatus(data.status || null);
    } catch (error) {
      console.error('Error starting bot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/whatsapp/stop', { method: 'POST' });
      await fetchStatus();
    } catch (error) {
      console.error('Error stopping bot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">WhatsApp Integration</h2>
      <p className="text-gray-600 mb-4">
        Configure WhatsApp integration to respond to messages directly.
      </p>
      {status?.isConnected ? (
        <div>
          <p className="text-green-600">Connected as {status.phoneNumber}</p>
          <Button onClick={handleStop} disabled={isLoading}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div>
          <Button onClick={handleStart} disabled={isLoading}>
            Start WhatsApp Integration
          </Button>
          {qrCode && (
            <div className="mt-4">
              <QRCode value={qrCode} size={256} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
