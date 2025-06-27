import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotWidget from '@/frontend/components/chatbot/ChatbotWidget';

export interface InitOptions {
  userId: string;
}

function ensureStyles(origin: string) {
  if (document.getElementById('kommander-style')) return;
  const link = document.createElement('link');
  link.id = 'kommander-style';
  link.rel = 'stylesheet';
  link.href = origin + '/chatbot.css';
  document.head.appendChild(link);
}

export function initKommanderChatbot(opts: InitOptions) {
  const origin = new URL((document.currentScript as HTMLScriptElement)!.src).origin;
  ensureStyles(origin);
  let container = document.getElementById('kommander-chatbot');
  if (!container) {
    container = document.createElement('div');
    container.id = 'kommander-chatbot';
    document.body.appendChild(container);
  }
  const elem = React.createElement(ChatbotWidget, { userId: opts.userId, baseUrl: origin });
  if ((ReactDOM as any).createRoot) {
    (ReactDOM as any).createRoot(container).render(elem);
  } else {
    (ReactDOM as any).render(elem, container);
  }
}

(window as any).initKommanderChatbot = initKommanderChatbot;
