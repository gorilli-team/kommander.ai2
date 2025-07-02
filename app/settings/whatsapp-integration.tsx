import { useEffect, useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

export function WhatsAppIntegration() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/start', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setQrCode(data.qrCode || null);
        // Polling per controllare la connessione
        const pollConnection = setInterval(async () => {
          await fetchStatus();
          const newStatus = await fetch('/api/whatsapp/status').then(r => r.json());
          if (newStatus.status?.isConnected) {
            setQrCode(null);
            clearInterval(pollConnection);
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollConnection), 300000);
      } else {
        setError(data.error || 'Errore sconosciuto');
      }
    } catch (error) {
      console.error('Error starting bot:', error);
      setError('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/whatsapp/stop', { method: 'POST' });
      setQrCode(null);
      await fetchStatus();
    } catch (error) {
      console.error('Error stopping bot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status?.isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <div className="font-medium text-green-700 dark:text-green-300">
              ✅ WhatsApp Connected
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Connected as: {status.phoneNumber}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">🎉 Integration Active!</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Your chatbot is now responding to WhatsApp messages</p>
            <p>• Users can send messages to your connected number</p>
            <p>• All conversations are saved and tracked</p>
          </div>
        </div>
        
        <Button 
          onClick={handleStop} 
          disabled={isLoading}
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect WhatsApp'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">📱 How to Connect</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Click 'Connect WhatsApp'</p>
                <p>This will generate a QR code for pairing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Open WhatsApp on your phone</p>
                <p>Go to Menu → Linked Devices → Link a Device</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Scan the QR code</p>
                <p>Point your phone camera at the code</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">You're connected!</p>
                <p>Your chatbot will now respond to messages</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Important Note</p>
                <p className="text-amber-700 dark:text-amber-300">This integration uses your personal WhatsApp account. Make sure to use a dedicated business number if needed.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* QR Code Area */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">🔗 Connection</h3>
          
          {!qrCode && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                Click the button below to generate a QR code
              </p>
              <Button 
                onClick={handleStart} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    Connect WhatsApp
                  </div>
                )}
              </Button>
            </div>
          )}
          
          {qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-lg">
                <QRCodeSVG value={qrCode} size={200} />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Scan with WhatsApp</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">QR code expires in 5 minutes</p>
              </div>
              <Button 
                onClick={handleStop} 
                variant="outline"
                className="text-gray-600 border-gray-300"
              >
                Cancel
              </Button>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">❌</span>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
