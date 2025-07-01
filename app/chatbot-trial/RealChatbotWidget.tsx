'use client';

import { useEffect, useState } from 'react';

// Extend the Window interface to include our custom chatbot function
declare global {
  interface Window {
    initKommanderChatbot: (options: { userId: string }) => void;
  }
}

interface RealChatbotWidgetProps {
  userId: string;
}

export default function RealChatbotWidget({ userId }: RealChatbotWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const baseUrl = window.location.origin;
    
    // Check if already loaded
    if (document.getElementById('chatbot-js') || document.getElementById('chatbot-css')) {
      return;
    }
    
    // Load the real chatbot widget's CSS first
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${baseUrl}/chatbot.css`;
    link.id = 'chatbot-css';
    document.head.appendChild(link);
    
    // Load the real chatbot widget's JS
    const script = document.createElement('script');
    script.src = `${baseUrl}/chatbot.js`;
    script.id = 'chatbot-js';
    script.async = true;
    document.body.appendChild(script);
    
    // Initialize the chatbot once the script is loaded
    script.onload = () => {
      if (window.initKommanderChatbot) {
        setTimeout(() => {
          window.initKommanderChatbot({ userId });
          setIsLoaded(true);
        }, 100);
      }
    };

    // Clean up on component unmount
    return () => {
      // Don't remove scripts/styles to avoid breaking other instances
      // Just clean up the chatbot container if it exists
      const container = document.getElementById('kommander-chatbot');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [userId]);

  return (
    <div className="relative">
      {!isLoaded && (
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-gray-500">Caricamento widget...</div>
        </div>
      )}
    </div>
  );
}
