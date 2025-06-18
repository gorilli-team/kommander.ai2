
(() => {
  console.log("Kommander.ai Widget Loader Initialized");

  const WIDGET_WIDTH = '370px';
  const WIDGET_HEIGHT = '550px'; // Adjusted for a typical chat window
  const BUTTON_SIZE = '60px';
  const ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="32px" height="32px">
      <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.444.252.95.424 1.476.542a6.749 6.749 0 0 0 5.88-2.884 6.752 6.752 0 0 0-1.483-9.367A6.718 6.718 0 0 0 9.75 3.002a6.75 6.75 0 0 0-4.946 18.642ZM21 13.5A8.25 8.25 0 1 1 4.5 13.5a8.25 8.25 0 0 1 16.5 0Z" clip-rule="evenodd" />
      <path d="M12.012 7.178a.75.75 0 0 1 .75.75v2.556l1.138-.378A.75.75 0 0 1 15 10.83v1.538a.75.75 0 0 1-1.115.695L12 12.06v2.19a.75.75 0 0 1-1.5 0V7.928a.75.75 0 0 1 .762-.75Zm-3.204-.01A.75.75 0 0 0 8.25 7.93v6.321a.75.75 0 0 0 1.245.597L11.25 13.2v2.051a.75.75 0 0 0 1.5 0V9.362a.75.75 0 0 0-.762-.75.73.73 0 0 0-.054.002A.75.75 0 0 0 11.25 9.362v1.58L9.727 11.46a.75.75 0 0 0-1.227-.613L8.25 11.094V7.928a.75.75 0 0 0-.75-.75Z" />
    </svg>
  `; // Kommander icon (approximated ⌘ with a chat bubble context)

  let iframeContainer = null;
  let iframe = null;
  let widgetButton = null;
  let closeButton = null;
  let isWidgetOpen = false;
  let appBaseUrl = '';

  function getAppBaseUrl() {
    const loaderScript = document.querySelector('script[src*="dashboard-replica-loader.js"]');
    if (loaderScript) {
      const src = loaderScript.src;
      // Assuming loader is at https://YOUR_APP_URL/dashboard-replica-loader.js
      return src.substring(0, src.lastIndexOf('/')); 
    }
    // Fallback or error if URL can't be determined
    console.warn("Kommander.ai: Could not determine app base URL from loader script path. Widget may not load correctly.");
    return window.location.origin; // Fallback to current origin, might be incorrect for cross-domain
  }
  
  function getThemeColor(variableName, fallbackColor) {
    if (typeof window !== 'undefined') {
      const color = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
      return color || fallbackColor;
    }
    return fallbackColor;
  }

  function createWidgetButton() {
    widgetButton = document.createElement('button');
    widgetButton.id = 'kommander-widget-button';
    widgetButton.innerHTML = ICON_SVG;
    widgetButton.style.position = 'fixed';
    widgetButton.style.bottom = '20px';
    widgetButton.style.right = '20px';
    widgetButton.style.width = BUTTON_SIZE;
    widgetButton.style.height = BUTTON_SIZE;
    widgetButton.style.backgroundColor = getThemeColor('--primary', '#1a56db'); // Use theme primary or fallback
    widgetButton.style.color = 'white';
    widgetButton.style.border = 'none';
    widgetButton.style.borderRadius = '50%';
    widgetButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    widgetButton.style.cursor = 'pointer';
    widgetButton.style.display = 'flex';
    widgetButton.style.alignItems = 'center';
    widgetButton.style.justifyContent = 'center';
    widgetButton.style.zIndex = '99998';
    widgetButton.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    widgetButton.setAttribute('aria-label', 'Open Kommander.ai Chat');
    widgetButton.onclick = toggleWidget;
    document.body.appendChild(widgetButton);
  }

  function createIframeContainer() {
    iframeContainer = document.createElement('div');
    iframeContainer.id = 'kommander-widget-container';
    iframeContainer.style.position = 'fixed';
    iframeContainer.style.bottom = '20px'; // Align with button or slightly above
    iframeContainer.style.right = '20px';
    iframeContainer.style.width = WIDGET_WIDTH;
    iframeContainer.style.height = WIDGET_HEIGHT;
    iframeContainer.style.backgroundColor = getThemeColor('--card', '#ffffff'); // Theme card or fallback white
    iframeContainer.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    iframeContainer.style.borderRadius = '12px'; // Rounded corners for the window
    iframeContainer.style.zIndex = '99999';
    iframeContainer.style.display = 'none';
    iframeContainer.style.flexDirection = 'column';
    iframeContainer.style.overflow = 'hidden'; // Important for iframe to respect border-radius
    iframeContainer.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
    iframeContainer.style.transform = 'translateY(20px) scale(0.95)';
    iframeContainer.style.opacity = '0';
    
    appBaseUrl = getAppBaseUrl();
    const widgetSrc = `${appBaseUrl}/widget/dashboard-replica`;

    iframe = document.createElement('iframe');
    iframe.id = 'kommander-widget-iframe';
    iframe.src = widgetSrc;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    iframeContainer.appendChild(iframe);
    document.body.appendChild(iframeContainer);

    createCloseButton();
  }

  function createCloseButton() {
    closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // Simple 'X'
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '8px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.lineHeight = '1';
    closeButton.style.padding = '4px 8px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = getThemeColor('--muted-foreground', '#666'); // Theme muted or fallback gray
    closeButton.style.zIndex = '100000'; // Above iframe content
    closeButton.setAttribute('aria-label', 'Close Chat');
    closeButton.onclick = toggleWidget;
    iframeContainer.appendChild(closeButton); // Append to container to be part of the "window"
  }

  function toggleWidget() {
    isWidgetOpen = !isWidgetOpen;
    if (isWidgetOpen) {
      iframeContainer.style.display = 'flex';
      widgetButton.style.opacity = '0';
      widgetButton.style.transform = 'scale(0.8)';
      widgetButton.style.pointerEvents = 'none';
      // Animate in
      setTimeout(() => {
        iframeContainer.style.opacity = '1';
        iframeContainer.style.transform = 'translateY(0) scale(1)';
      }, 10);
    } else {
      iframeContainer.style.opacity = '0';
      iframeContainer.style.transform = 'translateY(20px) scale(0.95)';
      widgetButton.style.opacity = '1';
      widgetButton.style.transform = 'scale(1)';
      widgetButton.style.pointerEvents = 'auto';
      setTimeout(() => {
        iframeContainer.style.display = 'none';
      }, 300); // Match transition duration
    }
  }

  function init() {
    if (document.readyState === 'complete') {
      createWidgetButton();
      createIframeContainer();
    } else {
      window.addEventListener('load', () => {
        createWidgetButton();
        createIframeContainer();
      });
    }
  }

  init();
})();
