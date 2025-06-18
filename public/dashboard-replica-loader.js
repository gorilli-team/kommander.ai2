
(function () {
  const APP_URL = document.currentScript?.getAttribute('data-app-url') || window.location.origin;
  const WIDGET_ENDPOINT = '/widget/dashboard-replica';
  const WIDGET_WIDTH = '370px';
  const WIDGET_HEIGHT = '550px'; // Adjusted height for better proportion

  function getCssVariable(variableName, fallbackValue) {
    if (typeof window !== 'undefined') {
      const value = getComputedStyle(document.documentElement).getPropertyValue(variableName)?.trim();
      return value || fallbackValue;
    }
    return fallbackValue;
  }

  function initializeWidget() {
    const widgetHost = document.querySelector('kommander-dashboard-replica');
    if (!widgetHost) {
      // console.warn('Kommander Dashboard Replica: Host element <kommander-dashboard-replica> not found.');
      return;
    }

    // --- Create Toggle Button ---
    const toggleButton = document.createElement('button');
    toggleButton.setAttribute('aria-label', 'Toggle Kommander.ai Chat');
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '20px';
    toggleButton.style.right = '20px';
    toggleButton.style.width = '60px';
    toggleButton.style.height = '60px';
    toggleButton.style.borderRadius = '50%';
    toggleButton.style.backgroundColor = getCssVariable('--primary', '#1a56db'); // Use primary color from host or fallback
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.display = 'flex';
    toggleButton.style.alignItems = 'center';
    toggleButton.style.justifyContent = 'center';
    toggleButton.style.zIndex = '99998';
    toggleButton.style.transition = 'transform 0.2s ease-out, opacity 0.3s ease-in-out';
    toggleButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `; // Using a generic Kommander-like icon (e.g., command symbol or abstract shape)
    // Replace with your ⌘ icon if feasible as SVG string, or use a placeholder
    toggleButton.innerHTML = '<span style="font-size: 28px; line-height: 1;">⌘</span>';


    // --- Create Iframe Container (the "window") ---
    const iframeContainer = document.createElement('div');
    iframeContainer.style.position = 'fixed';
    iframeContainer.style.bottom = '90px'; // Position above the toggle button
    iframeContainer.style.right = '20px';
    iframeContainer.style.width = WIDGET_WIDTH;
    iframeContainer.style.height = WIDGET_HEIGHT;
    iframeContainer.style.border = `1px solid ${getCssVariable('--border', '#e5e7eb')}`;
    iframeContainer.style.borderRadius = '12px'; // Rounded corners for the window
    iframeContainer.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    iframeContainer.style.backgroundColor = getCssVariable('--card', 'white'); // Background for the window itself
    iframeContainer.style.display = 'none'; // Initially hidden
    iframeContainer.style.flexDirection = 'column';
    iframeContainer.style.overflow = 'hidden'; // Clip iframe if it overflows
    iframeContainer.style.zIndex = '99999';
    iframeContainer.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
    iframeContainer.style.opacity = '0';
    iframeContainer.style.transform = 'translateY(20px)';


    // --- Create Iframe ---
    const iframe = document.createElement('iframe');
    iframe.src = `${APP_URL}${WIDGET_ENDPOINT}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allowTransparency', 'true');


    // --- Create Close Button for Iframe Container ---
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // 'X' character
    closeButton.setAttribute('aria-label', 'Close Chat');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'rgba(0,0,0,0.1)';
    closeButton.style.color = getCssVariable('--foreground', '#333');
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '28px';
    closeButton.style.height = '28px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.fontSize = '18px';
    closeButton.style.lineHeight = '1';
    closeButton.style.zIndex = '100000'; // Ensure it's above iframe content

    // Append iframe and close button to container
    iframeContainer.appendChild(iframe);
    iframeContainer.appendChild(closeButton);


    // Append to widget host or body
    widgetHost.appendChild(toggleButton);
    widgetHost.appendChild(iframeContainer);


    // --- Event Listeners ---
    let isOpen = false;
    toggleButton.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        iframeContainer.style.display = 'flex';
        setTimeout(() => { // Allow display to apply before transition
            iframeContainer.style.opacity = '1';
            iframeContainer.style.transform = 'translateY(0)';
        }, 10);
        toggleButton.style.opacity = '0';
        toggleButton.style.transform = 'scale(0.8)';
        toggleButton.style.pointerEvents = 'none';

      } else {
        iframeContainer.style.opacity = '0';
        iframeContainer.style.transform = 'translateY(20px)';
        setTimeout(() => {
            iframeContainer.style.display = 'none';
        }, 300); // Match transition duration
        toggleButton.style.opacity = '1';
        toggleButton.style.transform = 'scale(1)';
        toggleButton.style.pointerEvents = 'auto';
      }
    });

    closeButton.addEventListener('click', () => {
      if (isOpen) {
        toggleButton.click(); // Simulate click on toggle button to close
      }
    });

    // Optional: Close widget if clicked outside
    document.addEventListener('click', function(event) {
        if (isOpen && !iframeContainer.contains(event.target) && !toggleButton.contains(event.target)) {
            toggleButton.click();
        }
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }
})();
