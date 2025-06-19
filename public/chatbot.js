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

    useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }, [messages]);

    const storageKey = `kommander_conversation_${userId}`;
    let conversationId = localStorage.getItem(storageKey) || '';

    const sendMessage = async () => {
      const text = input.trim();
      if (!text) return;

      setMessages((prev) => [...prev, { role: 'user', text }]);
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
          setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
          if (data.conversationId) {
            conversationId = data.conversationId;
            localStorage.setItem(storageKey, conversationId);
          }
        } else if (data.error) {
          setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: ' + data.error }]);
        }
      } catch (err) {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: ' + err.message }]);
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
        },
        'Chat'
      ),
      open &&
        React.createElement(
          'div',
          { className: 'kommander-window' },
          React.createElement(
            'div',
            { className: 'kommander-header' },
            React.createElement('span', { className: 'font-semibold' }, 'Kommander.ai'),
            React.createElement(
              'button',
              { onClick: () => setOpen(false), 'aria-label': 'Close chatbot' },
              '×'
            )
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
                  className:
                    'kommander-msg ' +
                    (m.role === 'user' ? 'kommander-user' : 'kommander-assistant'),
                },
                m.text
              )
            )
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
              placeholder: 'Type a message...',
            }),
            React.createElement(
              'button',
              { type: 'submit' },
              'Send'
            )
          )
        )
    );
  }

  window.initKommanderChatbot = async function ({ userId }) {
    await ensureReact();
    loadStyles();
    const container = document.getElementById('kommander-chatbot');
    if (!container) return;
    ReactDOM.render(React.createElement(ChatbotWidget, { userId }), container);
  };
})();