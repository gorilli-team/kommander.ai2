(function () {
  const ORIGIN = new URL(document.currentScript.src).origin;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureReact() {
    if (!window.React) {
      await loadScript(ORIGIN + '/react.production.min.js');
    }
    if (!window.ReactDOM) {
      await loadScript(ORIGIN + '/react-dom.production.min.js');
    }
  }

  async function ensureWidget() {
    if (!window.ChatBotWidget) {
      const m = await import('https://unpkg.com/chatbot-widget-ui@3.0.3/dist/esm/index.js');
      window.ChatBotWidget = m.ChatBotWidget;
    }
  }

  window.initKommanderChatbot = async function ({ userId }) {
    await ensureReact();
    await ensureWidget();

    const storageKey = `kommander_conversation_${userId}`;
    const site = window.location.hostname;
    const conversationIdRef = { current: localStorage.getItem(storageKey) || '' };

    async function callApi(message) {
      if (!message.trim()) return '';
      if (!conversationIdRef.current) {
        const newId = Date.now().toString();
        conversationIdRef.current = newId;
        localStorage.setItem(storageKey, newId);
      }

      const res = await fetch(`${ORIGIN}/api/kommander-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message,
          conversationId: conversationIdRef.current,
          site,
        }),
      });

      const data = await res.json();

      if (data.conversationId) {
        conversationIdRef.current = data.conversationId;
        localStorage.setItem(storageKey, data.conversationId);
      }

      if (data.error) throw new Error(data.error);
      return data.reply || '';
    }

    let container = document.getElementById('kommander-chatbot');
    if (!container) {
      container = document.createElement('div');
      container.id = 'kommander-chatbot';
      document.body.appendChild(container);
    }

    const element = React.createElement(window.ChatBotWidget, { callApi });

    if (ReactDOM.createRoot) {
      ReactDOM.createRoot(container).render(element);
    } else {
      ReactDOM.render(element, container);
    }
  };
})();
