
// public/chatbot-loader.js
document.addEventListener('DOMContentLoaded', () => {
  const chatWidgetElement = document.querySelector('kommanderai-chat');
  if (!chatWidgetElement) {
    console.warn('Kommander.ai Chat: Element <kommanderai-chat> not found.');
    return;
  }

  const chatbotId = chatWidgetElement.getAttribute('chatbot-id');
  if (!chatbotId) {
    console.warn('Kommander.ai Chat: Attribute "chatbot-id" is missing on <kommanderai-chat> element.');
    return;
  }

  const appUrl = chatWidgetElement.getAttribute('data-app-url') || window.location.origin; // Fallback to current origin if not specified
  const iframeSrc = `${appUrl}/widget/chat/${chatbotId}`;

  // Create Styles
  const style = document.createElement('style');
  style.textContent = `
    .kommanderai-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #1a56db; /* Primary color from your theme */
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      border: none;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    .kommanderai-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }
    .kommanderai-iframe-container {
      position: fixed;
      bottom: 90px; /* Above FAB */
      right: 20px;
      width: 370px;
      height: 70vh; /* Max height */
      max-height: 600px;
      min-height: 400px;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      overflow: hidden;
      display: none; /* Hidden by default */
      z-index: 9998;
      background-color: white;
      flex-direction: column;
    }
    .kommanderai-iframe-container.kommanderai-open {
      display: flex;
    }
    .kommanderai-iframe-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    /* Simple X button for closing */
    .kommanderai-close-button {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        font-size: 18px;
        font-weight: bold;
        color: #555;
        cursor: pointer;
        z-index: 10000; /* Above iframe content */
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }
    .kommanderai-close-button:hover {
        background-color: #f0f0f0;
    }
  `;
  document.head.appendChild(style);

  // Create Floating Action Button (FAB)
  const fab = document.createElement('button');
  fab.className = 'kommanderai-fab';
  fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`; // Simple pen icon
  document.body.appendChild(fab);

  // Create Iframe Container
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'kommanderai-iframe-container';
  
  const iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.allow = "clipboard-write;"; // For potential copy-paste functionality within chat
  
  iframeContainer.appendChild(iframe);
  document.body.appendChild(iframeContainer);
  
  // Create Close Button for Iframe (optional, good UX)
  const closeButton = document.createElement('button');
  closeButton.className = 'kommanderai-close-button';
  closeButton.innerHTML = '&times;'; // Simple 'X'
  closeButton.onclick = () => {
    iframeContainer.classList.remove('kommanderai-open');
    fab.style.display = 'flex'; // Show FAB again
  };
  iframeContainer.insertBefore(closeButton, iframe); // Insert before iframe to be on top if iframe loads slowly

  // FAB Click Handler
  fab.addEventListener('click', () => {
    const isOpen = iframeContainer.classList.toggle('kommanderai-open');
    if (isOpen) {
      fab.style.display = 'none'; // Hide FAB when chat is open
    } else {
      fab.style.display = 'flex';
    }
  });
});
