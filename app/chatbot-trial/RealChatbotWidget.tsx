'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

// Extend the Window interface to include globals
declare global {
  interface Window {
    React: any;
    ReactDOM: any;
    initKommanderChatbot: (options: { userId?: string; organizationId?: string; trialMode?: boolean }) => void;
  }
}

interface RealChatbotWidgetProps {
  userId: string;
}

export default function RealChatbotWidget({ userId }: RealChatbotWidgetProps) {
  const { currentContext, currentOrganization } = useOrganization();
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize the chatbot once on component mount
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';
    
    // Load the chatbot CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${baseUrl}/chatbot.css`;
    link.id = 'chatbot-css-trial';
    document.head.appendChild(link);
    
    // Custom styles to make the widget fit inline and always open
    const customStyles = document.createElement('style');
    customStyles.id = 'chatbot-trial-styles';
    customStyles.textContent = `
      .trial-chatbot-widget .kommander-window {
        position: relative !important;
        inset: auto !important;
        bottom: auto !important;
        right: auto !important;
        width: 100% !important;
        height: 625px !important; /* Aumentato del 25%: 500px -> 625px */
        border-radius: 12px !important;
        transform: none !important;
        opacity: 1 !important;
        animation: none !important;
        display: block !important;
      }
      
      .trial-chatbot-widget .kommander-button {
        display: none !important;
      }
      
      .trial-chatbot-widget .kommander-close {
        display: none !important;
      }
    `;
    document.head.appendChild(customStyles);
    
    // Initialize the widget with custom modifications
    const initTrialWidget = async () => {
      // Load React if not available
      if (!window.React) {
        const reactScript = document.createElement('script');
        reactScript.src = `${baseUrl}/react.production.min.js`;
        document.head.appendChild(reactScript);
        await new Promise(resolve => reactScript.onload = resolve);
      }
      
      if (!window.ReactDOM) {
        const reactDOMScript = document.createElement('script');
        reactDOMScript.src = `${baseUrl}/react-dom.production.min.js`;
        document.head.appendChild(reactDOMScript);
        await new Promise(resolve => reactDOMScript.onload = resolve);
      }
      
      // Load the original chatbot script
      const script = document.createElement('script');
      script.src = `${baseUrl}/chatbot.js`;
      document.body.appendChild(script);
      
      script.onload = () => {
        setTimeout(() => {
          const container = document.getElementById('trial-chatbot-widget');
          if (container) {
            // Add the trial class for custom styling
            container.className = 'trial-chatbot-widget';
            
            console.log('[Dashboard] Initializing chatbot widget for context:', currentContext, currentOrganization?.id || userId);
            
            // Initialize the chatbot in the container with trialMode
            if (window.initKommanderChatbot) {
              if (currentContext === 'organization' && currentOrganization?.id) {
                window.initKommanderChatbot({ organizationId: currentOrganization.id, trialMode: true });
              } else {
                window.initKommanderChatbot({ userId, trialMode: true });
              }
              
              // Widget should be automatically open due to trialMode
              setTimeout(() => {
                setIsLoaded(true);
              }, 300);
            } else {
              console.error('[Dashboard] window.initKommanderChatbot not found');
            }
          }
        }, 100);
      };
    };
    
    initTrialWidget();

    // Clean up on component unmount
    return () => {
      document.getElementById('chatbot-css-trial')?.remove();
      document.getElementById('chatbot-trial-styles')?.remove();
      const container = document.getElementById('trial-chatbot-widget');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [userId]); // Only reinitialize if userId changes, not on context changes

  // Update the chatbot context when context changes
  useEffect(() => {
    if (isLoaded && window.initKommanderChatbot) {
      console.log('[Dashboard] Context changed, updating chatbot context:', currentContext, currentOrganization?.id || userId);
      
      // Clear the existing chatbot container
      const container = document.getElementById('trial-chatbot-widget');
      if (container) {
        container.innerHTML = '';
        container.className = 'trial-chatbot-widget';
        
        // Reinitialize with new context and trialMode
        if (currentContext === 'organization' && currentOrganization?.id) {
          window.initKommanderChatbot({ organizationId: currentOrganization.id, trialMode: true });
        } else {
          window.initKommanderChatbot({ userId, trialMode: true });
        }
        
        // Widget should be automatically open due to trialMode
        setTimeout(() => {
          // No need to force open, trialMode handles it
        }, 300);
      }
    }
  }, [currentContext, currentOrganization?.id, userId, isLoaded]);

  return (
    <div className="w-full">
      {!isLoaded && (
        <div className="flex items-center justify-center h-96 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-500">Caricamento widget reale...</div>
          </div>
        </div>
      )}
      <div id="trial-chatbot-widget" className={`${isLoaded ? 'block' : 'hidden'}`} />
    </div>
  );
}
