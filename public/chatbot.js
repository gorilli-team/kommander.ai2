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

  function loadStyles() {
    if (document.getElementById('kommander-style')) return;
    const link = document.createElement('link');
    link.id = 'kommander-style';
    link.rel = 'stylesheet';
    link.href = ORIGIN + '/chatbot.css';
    document.head.appendChild(link);
  }

  async function ensureReact() {
    if (!window.React) {
      await loadScript(ORIGIN + '/react.production.min.js');
    }
    if (!window.ReactDOM) {
      await loadScript(ORIGIN + '/react-dom.production.min.js');
    }
  }

  function ChatbotWidget({ userId }) {
    const { useState, useRef, useEffect } = React;
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [handledBy, setHandledBy] = useState('bot');
    const [conversationId, setConversationId] = useState('');

    const viewportRef = useRef(null);
    const conversationIdRef = useRef('');
    const lastTimestampRef = useRef('');
    const pollFnRef = useRef(null);
    const prevHandledBy = useRef('bot');

    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function addMessage(role, text) {
      setMessages((prev) => [...prev, { role, text, time: formatTime() }]);
      lastTimestampRef.current = new Date().toISOString();
    }

    const currentDate = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }, [messages]);

    useEffect(() => {
      if (open && messages.length === 0) {
        addMessage('assistant', 'Ciao, sono Kommander.ai! Come posso aiutarti oggi?');
      }
    }, [open]);

    const storageKey = `kommander_conversation_${userId}`;

    useEffect(() => {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        conversationIdRef.current = stored;
        setConversationId(stored);
      }
    }, [storageKey]);

    const fetchInitial = async () => {
      const id = conversationIdRef.current;
      if (!id) return;
      try {
        const res = await fetch(`${ORIGIN}/api/widget-conversations/${id}?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');
          const msgs = (data.messages || []).map((m) => ({
            role: m.role,
            text: m.text,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setMessages(msgs);
          if (msgs.length) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
          }
        }
      } catch {}
    };

    const poll = async () => {
      const id = conversationIdRef.current;
      if (!id) return;
      try {
        const params = new URLSearchParams({ userId });
        if (lastTimestampRef.current) params.set('since', lastTimestampRef.current);
        const res = await fetch(`${ORIGIN}/api/widget-conversations/${id}/updates?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');
          const newMsgs = (data.messages || []).map((m) => ({
            role: m.role,
            text: m.text,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          if (newMsgs.length) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
            setMessages((prev) => [...prev, ...newMsgs]);
          }
        }
      } catch {}
    };

    useEffect(() => {
      if (!conversationId) return;
      pollFnRef.current = poll;
      let interval;
      fetchInitial().then(poll);
      interval = setInterval(poll, 500);
      return () => interval && clearInterval(interval);
    }, [conversationId, userId]);

    useEffect(() => {
      if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
        addMessage('system', 'Stai parlando con un operatore umano');
      }
      prevHandledBy.current = handledBy;
    }, [handledBy]);

    const sendMessage = async () => {
      const text = input.trim();
      if (!text) return;

      addMessage('user', text);
      setInput('');

      try {
        if (!conversationIdRef.current) {
          const newId = Date.now().toString();
          conversationIdRef.current = newId;
          setConversationId(newId);
          localStorage.setItem(storageKey, newId);
        }

        const res = await fetch(`${ORIGIN}/api/kommander-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            message: text,
            conversationId: conversationIdRef.current,
            site: window.location.hostname,
          }),
        });

        const data = await res.json();

        if (data.conversationId) {
          conversationIdRef.current = data.conversationId;
          setConversationId(data.conversationId);
          localStorage.setItem(storageKey, data.conversationId);
        }

        if (data.handledBy) {
          setHandledBy(data.handledBy);
        }

        if (data.reply) {
          addMessage('assistant', data.reply);
        } else if (data.error) {
          addMessage('system', 'Error: ' + data.error);
        }
      } catch (err) {
        addMessage('system', 'Error: ' + err.message);
      } finally {
        if (pollFnRef.current) pollFnRef.current();
      }
    };

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'button',
        {
          onClick: () => setOpen(!open),
          className: 'kommander-button',
          'aria-label': 'Apri chat',
        },
        '\u2318',
      ),
      open &&
        React.createElement(
          'div',
          { className: 'kommander-window' },
          React.createElement(
            'div',
            { className: 'kommander-header' },
            React.createElement('span', { className: 'font-semibold' }, 'Kommander.ai – Trial'),
            React.createElement(
              'div',
              { className: 'kommander-header-right' },
              React.createElement('span', { className: 'kommander-badge' }, 'Online'),
              React.createElement('span', { className: 'kommander-date' }, currentDate),
              React.createElement(
                'button',
                { onClick: () => setOpen(false), 'aria-label': 'Close chatbot', className: 'kommander-close' },
                '×',
              ),
            ),
          ),
          React.createElement(
            'div',
            {
              ref: viewportRef,
              className: 'kommander-messages',
            },
            messages.map((m, i) =>
              React.createElement(
                'div',
                {
                  key: i,
                  className: 'kommander-row ' + (m.role === 'user' ? 'kommander-row-user' : 'kommander-row-assistant'),
                },
                m.role !== 'user' &&
                  React.createElement('img', {
                    className: 'kommander-avatar',
                    src:
                      m.role === 'agent'
                        ? 'https://placehold.co/40x40/444/FFFFFF.png?text=A'
                        : 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K',
                  }),
                React.createElement(
                  'div',
                  {
                    className: 'kommander-msg ' + (m.role === 'user' ? 'kommander-user' : 'kommander-assistant'),
                  },
                  React.createElement('p', null, m.text),
                  React.createElement('p', { className: 'kommander-time' }, m.time),
                ),
                m.role === 'user' &&
                  React.createElement('img', {
                    className: 'kommander-avatar',
                    src: 'https://placehold.co/40x40/8cb0ea/1A202C.png?text=U',
                  }),
              ),
            ),
          ),
          React.createElement(
            'form',
            {
              onSubmit: (e) => {
                e.preventDefault();
                sendMessage();
              },
              className: 'kommander-input',
            },
            React.createElement('input', {
              value: input,
              onChange: (e) => setInput(e.target.value),
              placeholder: 'Scrivi qui…',
            }),
            React.createElement(
              'button',
              { type: 'submit', 'aria-label': 'Invia' },
              React.createElement(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  viewBox: '0 0 24 24',
                  width: '16',
                  height: '16',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                },
                React.createElement('path', {
                  d: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
                }),
                React.createElement('path', {
                  d: 'm21.854 2.147-10.94 10.939',
                })
              )
            ),
          ),
        ),
    );
  }

  window.initKommanderChatbot = async function ({ userId }) {
    await ensureReact();
    loadStyles();
    let container = document.getElementById('kommander-chatbot');
    if (!container) {
      container = document.createElement('div');
      container.id = 'kommander-chatbot';
      document.body.appendChild(container);
    }
    if (ReactDOM.createRoot) {
      ReactDOM.createRoot(container).render(React.createElement(ChatbotWidget, { userId }));
    } else {
      ReactDOM.render(React.createElement(ChatbotWidget, { userId }), container);
    }
  };
})();
