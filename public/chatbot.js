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

  function loadTailwind() {
    if (document.getElementById('kommander-tailwind')) return Promise.resolve();
    return loadScript('https://cdn.tailwindcss.com').then((e) => {
      document.currentScript?.removeAttribute('id');
    });
  }

  async function ensureReact() {
    if (!window.React) {
      await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
    }
    if (!window.ReactDOM) {
      await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
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

    const sendMessage = async () => {
      const text = input.trim();
      if (!text) return;
      setMessages((m) => [...m, { role: 'user', text }]);
      setInput('');
      try {
        const res = await fetch(`${ORIGIN}/api/kommander-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message: text }),
        });
        const data = await res.json();
        if (data.reply) {
          setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
        } else if (data.error) {
          setMessages((m) => [...m, { role: 'assistant', text: 'Error: ' + data.error }]);
        }
      } catch (err) {
        setMessages((m) => [...m, { role: 'assistant', text: 'Error: ' + err.message }]);
      }
    };

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'button',
        {
          onClick: () => setOpen(!open),
          className:
            'fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 text-white p-3 shadow-lg',
        },
        'Chat'
      ),
      open &&
        React.createElement(
          'div',
          {
            className:
              'fixed bottom-20 right-4 z-50 w-80 h-96 bg-white border border-gray-300 rounded-lg flex flex-col shadow-xl',
          },
          React.createElement(
            'div',
            { className: 'p-3 border-b border-gray-200 flex justify-between items-center' },
            React.createElement('span', { className: 'font-semibold' }, 'Kommander.ai'),
            React.createElement(
              'button',
              { onClick: () => setOpen(false) },
              '×'
            )
          ),
          React.createElement(
            'div',
            {
              ref: viewportRef,
              className: 'flex-1 overflow-y-auto p-3 space-y-2 text-sm',
            },
            messages.map((m, i) =>
              React.createElement(
                'div',
                {
                  key: i,
                  className: m.role === 'user' ? 'text-right' : 'text-left',
                },
                React.createElement(
                  'span',
                  {
                    className:
                      'inline-block max-w-xs rounded-lg px-2 py-1 ' +
                      (m.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'),
                  },
                  m.text
                )
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
              className: 'p-3 border-t border-gray-200 flex space-x-2',
            },
            React.createElement('input', {
              value: input,
              onChange: (e) => setInput(e.target.value),
              disabled: false,
              className: 'flex-1 border rounded px-2 py-1 text-sm',
              placeholder: 'Type a message...',
            }),
            React.createElement(
              'button',
              {
                type: 'submit',
                className: 'bg-blue-600 text-white rounded px-3',
              },
              'Send'
            )
          )
        )
    );
  }

  window.initKommanderChatbot = async function ({ userId }) {
    await Promise.all([ensureReact(), loadTailwind()]);
    const container = document.getElementById('kommander-chatbot');
    if (!container) return;
    ReactDOM.render(React.createElement(ChatbotWidget, { userId }), container);
  };
})();
