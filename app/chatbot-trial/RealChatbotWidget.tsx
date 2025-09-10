'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import { usePathname } from 'next/navigation';

// Extend the Window interface to include globals
declare global {
  interface Window {
    React: any;
    ReactDOM: any;
    initKommanderChatbot: (options: { userId?: string; organizationId?: string; trialMode?: boolean; forceReset?: boolean; preloadSettings?: any }) => void;
  }
}

interface RealChatbotWidgetProps {
  userId: string;
  settings?: any;
}

export default function RealChatbotWidget({ userId, settings }: RealChatbotWidgetProps) {
  const { currentContext, currentOrganization } = useOrganization();
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  
  // Cleanup function to remove all chatbot elements
  const performCleanup = () => {
    console.log('[RealChatbotWidget] Performing cleanup...');
    
    // Remove CSS files
    document.getElementById('chatbot-css-trial')?.remove();
    document.getElementById('chatbot-trial-styles')?.remove();
    document.getElementById('kommander-style')?.remove();
    
    // Clean up resize listener
    if ((window as any).chatbotTrialCleanup) {
      (window as any).chatbotTrialCleanup();
      delete (window as any).chatbotTrialCleanup;
    }
    
    // Remove all chatbot-related elements from DOM
    const elementsToRemove = [
      '#trial-chatbot-widget',
      '#kommander-chatbot', 
      '.kommander-window',
      '.kommander-button',
      '.trial-chatbot-widget'
    ];
    
    elementsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        console.log('[RealChatbotWidget] Removing element:', selector);
        el.remove();
      });
    });
    
    // Clean up container specifically
    const container = document.getElementById('trial-chatbot-widget');
    if (container) {
      container.innerHTML = '';
      container.remove();
    }
    
    // Remove any dynamically created chatbot scripts
    const scripts = document.querySelectorAll('script[src*="chatbot.js"], script[src*="react.production.min.js"], script[src*="react-dom.production.min.js"]');
    scripts.forEach(script => {
      if (script.getAttribute('data-chatbot-widget')) {
        script.remove();
      }
    });
    
    // Clean up global variables
    if (window.initKommanderChatbot) {
      delete window.initKommanderChatbot;
    }
    
    // Reset CSS custom properties
    if (document.documentElement.style.getPropertyValue('--kommander-primary-color')) {
      document.documentElement.style.removeProperty('--kommander-primary-color');
      document.documentElement.style.removeProperty('--kommander-secondary-color');
      document.documentElement.style.removeProperty('--kommander-header-text-color');
    }
    
    console.log('[RealChatbotWidget] Cleanup completed');
  };
  
  // Effect to clean up when leaving the chatbot-trial page
  useEffect(() => {
    if (pathname && !pathname.startsWith('/chatbot-trial')) {
      performCleanup();
    }
  }, [pathname]);

  // Initialize the chatbot once on component mount
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kommander.ai';
    const wsEnabled = process.env.NEXT_PUBLIC_WIDGET_WS === '1' || process.env.NEXT_PUBLIC_WIDGET_WS === 'true';
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT ? parseInt(process.env.NEXT_PUBLIC_WS_PORT, 10) : undefined;
    
    // Load the chatbot CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${baseUrl}/chatbot.css`;
    link.id = 'chatbot-css-trial';
    document.head.appendChild(link);
    
    // Apply settings immediately if available
    if (settings?.color) {
      document.documentElement.style.setProperty('--kommander-primary-color', settings.color);
      document.documentElement.style.setProperty('--kommander-secondary-color', settings.color);
      // Calculate contrasting text color
      const getContrastTextColor = (hexColor) => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
      };
      document.documentElement.style.setProperty('--kommander-header-text-color', getContrastTextColor(settings.color));
    }
    
    // Custom styles to make the widget fit inline and always open
    const customStyles = document.createElement('style');
    customStyles.id = 'chatbot-trial-styles';
    customStyles.textContent = `
      .trial-chatbot-widget {
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 70vh !important;
        width: 100% !important;
        resize: none !important;
        overflow: hidden !important;
      }
      
      /* Override ALL possible CSS rules with maximum specificity */
      .trial-chatbot-widget .kommander-window,
      .trial-chatbot-widget .kommander-window[style] {
        position: relative !important;
        inset: auto !important;
        bottom: auto !important;
        right: auto !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 70vh !important;
        max-width: none !important;
        max-height: none !important;
        border-radius: 12px !important;
        transform: none !important;
        opacity: 1 !important;
        animation: none !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        border: 1px solid rgba(0, 0, 0, 0.05) !important;
        padding: 0 !important;
        margin: 0 !important;
        z-index: auto !important;
        overflow: hidden !important;
      }
      
      /* Override ALL media queries */
      @media (min-width: 640px) {
        .trial-chatbot-widget .kommander-window,
        .trial-chatbot-widget .kommander-window[style] {
          inset: auto !important;
          bottom: auto !important;
          right: auto !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 70vh !important;
          border-radius: 12px !important;
          padding: 0 !important;
          margin: 0 !important;
          position: relative !important;
        }
      }
      
      @media (max-width: 639px) {
        .trial-chatbot-widget {
          min-height: 60vh !important;
        }
        .trial-chatbot-widget .kommander-window,
        .trial-chatbot-widget .kommander-window[style] {
          width: 100% !important;
          height: 100% !important;
          min-height: 60vh !important;
          inset: auto !important;
          position: relative !important;
          border-radius: 12px !important;
          padding: 0 !important;
        }
      }
      
      .trial-chatbot-widget .kommander-messages {
        flex: 1 !important;
        overflow-y: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        padding: 16px !important;
      }
      
      .trial-chatbot-widget .kommander-button {
        display: none !important;
      }
      
      .trial-chatbot-widget .kommander-close {
        display: none !important;
      }
      
      /* Input area styling */
      .trial-chatbot-widget .kommander-input-container {
        padding: 16px !important;
        border-top: 1px solid var(--kommander-border-color) !important;
        background: var(--kommander-bg-light) !important;
        position: relative !important;
        bottom: auto !important;
        flex-shrink: 0 !important;
      }
      
      /* Welcome message animation */
      .trial-chatbot-widget .kommander-welcome-message {
        animation: slideInUp 0.6s ease-out;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(customStyles);
    
    // Initialize the widget with custom modifications
    const initTrialWidget = async () => {
      // Load React if not available
      if (!window.React) {
        const reactScript = document.createElement('script');
        reactScript.src = `${baseUrl}/react.production.min.js`;
        reactScript.setAttribute('data-chatbot-widget', 'true');
        document.head.appendChild(reactScript);
        await new Promise(resolve => reactScript.onload = resolve);
      }
      
      if (!window.ReactDOM) {
        const reactDOMScript = document.createElement('script');
        reactDOMScript.src = `${baseUrl}/react-dom.production.min.js`;
        reactDOMScript.setAttribute('data-chatbot-widget', 'true');
        document.head.appendChild(reactDOMScript);
        await new Promise(resolve => reactDOMScript.onload = resolve);
      }
      
      // Load the original chatbot script
      const script = document.createElement('script');
      script.src = `${baseUrl}/chatbot.js`;
      script.setAttribute('data-chatbot-widget', 'true');
      document.body.appendChild(script);
      
      script.onload = () => {
        setTimeout(() => {
          const container = document.getElementById('trial-chatbot-widget');
          if (container) {
            // Add the trial class for custom styling
            container.className = 'trial-chatbot-widget';
            
            console.log('[Dashboard] Initializing chatbot widget for context:', currentContext, currentOrganization?.id || userId);
            
            // Initialize the chatbot in the container with trialMode and preloaded settings
            if (window.initKommanderChatbot) {
              const initOptions = {
                trialMode: true,
                forceReset: true, // Force new conversation
                preloadSettings: { ...(settings || {}), ...(wsEnabled ? { ws: true } : {}), ...(wsPort ? { wsPort } : {}) }
              };
              
              if (currentContext === 'organization' && currentOrganization?.id) {
                window.initKommanderChatbot({ organizationId: currentOrganization.id, ...initOptions });
              } else {
                window.initKommanderChatbot({ userId, ...initOptions });
              }
              
              // Widget should be automatically open due to trialMode
              setTimeout(() => {
                setIsLoaded(true);
                
                // Force dynamic resize handling
                const forceResize = () => {
                  const chatbotWindow = container.querySelector('.kommander-window');
                  if (chatbotWindow) {
                    // Force reset all inline styles that might override CSS
                    (chatbotWindow as HTMLElement).style.cssText = '';
                    // Force responsive styles
                    (chatbotWindow as HTMLElement).style.setProperty('width', '100%', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('height', '100%', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('position', 'relative', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('inset', 'auto', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('max-width', 'none', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('max-height', 'none', 'important');
                    (chatbotWindow as HTMLElement).style.setProperty('overflow', 'hidden', 'important');
                  }
                  
                  // Also ensure container doesn't cause scroll issues
                  container.style.setProperty('height', '100%', 'important');
                  container.style.setProperty('width', '100%', 'important');
                  container.style.setProperty('overflow', 'hidden', 'important');
                };
                
                // Force resize immediately
                forceResize();
                
                // Add resize listener for dynamic resizing
                window.addEventListener('resize', forceResize);
                
                // Store cleanup function
                (window as any).chatbotTrialCleanup = () => {
                  window.removeEventListener('resize', forceResize);
                };
              }, 100); // Faster loading
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
      console.log('[RealChatbotWidget] Cleaning up chatbot...');
      
      // Remove CSS files
      document.getElementById('chatbot-css-trial')?.remove();
      document.getElementById('chatbot-trial-styles')?.remove();
      document.getElementById('kommander-style')?.remove();
      
      // Clean up resize listener
      if ((window as any).chatbotTrialCleanup) {
        (window as any).chatbotTrialCleanup();
        delete (window as any).chatbotTrialCleanup;
      }
      
      // Remove all chatbot-related elements from DOM
      const elementsToRemove = [
        '#trial-chatbot-widget',
        '#kommander-chatbot', 
        '.kommander-window',
        '.kommander-button',
        '.trial-chatbot-widget'
      ];
      
      elementsToRemove.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          console.log('[RealChatbotWidget] Removing element:', selector);
          el.remove();
        });
      });
      
      // Clean up container specifically
      const container = document.getElementById('trial-chatbot-widget');
      if (container) {
        container.innerHTML = '';
        container.remove();
      }
      
      // Remove any dynamically created chatbot scripts
      const scripts = document.querySelectorAll('script[src*="chatbot.js"], script[src*="react.production.min.js"], script[src*="react-dom.production.min.js"]');
      scripts.forEach(script => {
        // Only remove if it was added by our widget
        if (script.getAttribute('data-chatbot-widget')) {
          script.remove();
        }
      });
      
      // Clean up global variables
      if (window.initKommanderChatbot) {
        delete window.initKommanderChatbot;
      }
      
      // Reset CSS custom properties
      if (document.documentElement.style.getPropertyValue('--kommander-primary-color')) {
        document.documentElement.style.removeProperty('--kommander-primary-color');
        document.documentElement.style.removeProperty('--kommander-secondary-color');
        document.documentElement.style.removeProperty('--kommander-header-text-color');
      }
      
      console.log('[RealChatbotWidget] Cleanup completed');
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
        const initOptions = {
          trialMode: true,
          forceReset: true, // Force new conversation
          preloadSettings: { ...(settings || {}), ...(wsEnabled ? { ws: true } : {}), ...(wsPort ? { wsPort } : {}) }
        };
        
        if (currentContext === 'organization' && currentOrganization?.id) {
          window.initKommanderChatbot({ organizationId: currentOrganization.id, ...initOptions });
        } else {
          window.initKommanderChatbot({ userId, ...initOptions });
        }
        
        // Widget should be automatically open due to trialMode
        setTimeout(() => {
          // No need to force open, trialMode handles it
        }, 300);
      }
    }
  }, [currentContext, currentOrganization?.id, userId, isLoaded]);

  return (
    <div className="w-full h-full flex flex-col">
      <div id="trial-chatbot-widget" className="flex-1 min-h-0" />
    </div>
  );
}
