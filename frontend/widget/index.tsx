import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotWidget from '@/frontend/components/chatbot/ChatbotWidget';

function loadStyles() {
  if (document.getElementById('kommander-style')) return;
  const link = document.createElement('link');
  link.id = 'kommander-style';
  link.rel = 'stylesheet';
  const src = (document.currentScript as HTMLScriptElement | null)?.src;
  const origin = src ? new URL(src).origin : '';
  link.href = origin + '/chatbot.css';
  document.head.appendChild(link);
}

export function initKommanderChatbot({ userId }: { userId: string }) {
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
