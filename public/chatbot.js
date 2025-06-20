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
    const viewportRef = useRef(null);

    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        setMessages([
          { role: 'assistant', text: 'Ciao, sono Kommander.ai! Come posso aiutarti oggi?', time: formatTime() },
        ]);
      }
    }, [open]);

    const storageKey = `kommander_conversation_${userId}`;
    let conversationId = localStorage.getItem(storageKey) || '';

    const sendMessage = async () => {
      const text = input.trim();
      if (!text) return;

      setMessages((prev) => [...prev, { role: 'user', text, time: formatTime() }]);
      setInput('');

      try {
        if (!conversationId) {
          conversationId = Date.now().toString();
          localStorage.setItem(storageKey, conversationId);
        }

        const res = await fetch(`${ORIGIN}/api/kommander-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            message: text,
            conversationId,
            site: window.location.hostname,
          }),
        });

        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => [...prev, { role: 'assistant', text: data.reply, time: formatTime() }]);
          if (data.conversationId) {
            conversationId = data.conversationId;
            localStorage.setItem(storageKey, conversationId);
          }
        } else if (data.error) {
          setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: ' + data.error, time: formatTime() }]);
        }
      } catch (err) {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: ' + err.message, time: formatTime() }]);
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
                    src: 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K',
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
            React.createElement('button', { type: 'submit' }, '\u27A4'),
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
