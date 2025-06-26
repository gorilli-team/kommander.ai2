import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotWidget from '@/frontend/components/chatbot/ChatbotWidget';

// Determine the base URL from the script origin at load time
const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src;
const baseOrigin = scriptSrc ? new URL(scriptSrc).origin : '';
(window as any).__kommanderBaseUrl = baseOrigin;

// Dynamically load React and ReactDOM if missing
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureReact() {
  if (!(window as any).React) {
    await loadScript(baseOrigin + '/react.production.min.js');
  }
  if (!(window as any).ReactDOM) {
    await loadScript(baseOrigin + '/react-dom.production.min.js');
  }
}

function loadStyles() {
  if (document.getElementById('kommander-style')) return;
  const link = document.createElement('link');
  link.id = 'kommander-style';
  link.rel = 'stylesheet';
  link.href = baseOrigin + '/chatbot.css';
  document.head.appendChild(link);
}

export async function initKommanderChatbot({ userId }: { userId: string }) {
  await ensureReact();
  loadStyles();
  let el = document.getElementById('kommander-chatbot');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kommander-chatbot';
    document.body.appendChild(el);
  }
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(el).render(<ChatbotWidget userId={userId} />);
  } else {
    // @ts-ignore
    ReactDOM.render(<ChatbotWidget userId={userId} />, el);
  }
}

// expose on window
(window as any).initKommanderChatbot = initKommanderChatbot;
