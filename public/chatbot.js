
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
    const [isTyping, setIsTyping] = useState(false);
    const [botName, setBotName] = useState('Kommander.ai');
    const [botColor, setBotColor] = useState('#1E3A8A');
    const [isDarkMode, setIsDarkMode] = useState(() => {
      try {
        const stored = localStorage.getItem('kommander_dark_mode');
        if (stored !== null) return stored === 'true';
      } catch (e) {
        console.error("Failed to read dark mode from localStorage", e);
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const viewportRef = useRef(null);
    const conversationIdRef = useRef('');
    const lastTimestampRef = useRef('');
    const pollFnRef = useRef(null);
    const prevHandledBy = useRef('bot');
    const lastSentTextRef = useRef('');

    const isSendingRef = useRef(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);

    const restartConversation = () => {

      const newId = `konv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      conversationIdRef.current = newId;
      setConversationId(newId);
      localStorage.setItem(storageKey, newId);
      setMessages([]);
      lastTimestampRef.current = '';
    };


    const confirmRestart = () => {
      restartConversation();
      setShowRestartConfirm(false);
    };

    const toggleDarkMode = () => {
      setIsDarkMode(prevMode => {
        const newMode = !prevMode;
        try {
          localStorage.setItem('kommander_dark_mode', newMode.toString());
        } catch (e) {
          console.error("Failed to write dark mode to localStorage", e);
        }
        return newMode;
      });
    };

    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function addMessage(role, text, updateTimestamp = true) {
      setMessages((prev) => [...prev, { role, text, time: formatTime() }]);
      if (updateTimestamp) {
        lastTimestampRef.current = new Date().toISOString();
      }
    }

    useEffect(() => {
      fetch(`${ORIGIN}/api/settings/${userId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.name) setBotName(data.name);
          if (data.color) {
            setBotColor(data.color);
            document.documentElement.style.setProperty(
              '--kommander-primary-color',
              data.color,
            );

            document.documentElement.style.setProperty(
              '--kommander-secondary-color',
              data.color,
            );

          }
        })
        .catch(() => {});
    }, [userId]);

    const currentDate = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }, [messages, isTyping]);

    useEffect(() => {
      if (open && messages.length === 0) {
        addMessage('assistant', `Ciao, sono ${botName}! Come posso aiutarti oggi?`);
      }
    }, [open, botName]);

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
      } catch (err) {
        console.error("Error fetching initial conversation:", err);
      }
    };

    const poll = async (skipUserDup = false) => {
      const id = conversationIdRef.current;
      if (!id) return;
      try {
        const params = new URLSearchParams({ userId });
        if (lastTimestampRef.current) params.set('since', lastTimestampRef.current);
        const res = await fetch(`${ORIGIN}/api/widget-conversations/${id}/updates?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHandledBy(data.handledBy || 'bot');
          let newMsgs = (data.messages || []).map((m) => ({
            role: m.role,
            text: m.text,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          if (skipUserDup && newMsgs.length && newMsgs[0].role === 'user' && newMsgs[0].text === lastSentTextRef.current) {
            newMsgs = newMsgs.slice(1);
          }
          if (newMsgs.length) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
            setMessages((prev) => [...prev, ...newMsgs]);
            setIsTyping(false); // Stop typing indicator if new messages arrive
          }
        }
      } catch (err) {
        console.error("Error polling for updates:", err);
      }
    };

    useEffect(() => {
      if (!conversationId) return;
      pollFnRef.current = poll;
      let interval;
      fetchInitial().then(() => {
        // Only start polling if the chatbot is open, otherwise poll when opened
        if (open) {
          poll();
        }
      });
      interval = setInterval(poll, 1000); // Poll more frequently for a better real-time feel
      return () => interval && clearInterval(interval);
    }, [conversationId, userId, open]); // Added 'open' to dependency array

    useEffect(() => {
      if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
        addMessage('system', 'Sei ora in contatto con un operatore umano.');
      }
      prevHandledBy.current = handledBy;
    }, [handledBy]);

    const sendMessage = async () => {
      const text = input.trim();
      if (!text || isSendingRef.current) return;
      isSendingRef.current = true;

      addMessage('user', text, false);
      lastSentTextRef.current = text;
      setIsTyping(true); // Show typing indicator

      const isHumanRequest = text.toLowerCase().includes('operatore umano');

      if (isHumanRequest) {
        addMessage(
          'assistant',
          'Certamente! Ti metto subito in contatto con uno specialista. Nel frattempo, se vuoi, puoi continuare a farmi domande: potrei gi\u00e0 aiutarti a trovare una soluzione mentre attendi la risposta di un operatore.'
        );
        setIsTyping(false);
      }

      setInput('');

      try {
        if (!conversationIdRef.current) {
          const newId = `konv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // More robust ID
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
        if (data.reply && !isHumanRequest) {
          addMessage('assistant', data.reply);
        } else if (data.error) {
          addMessage('system', 'Si è verificato un errore: ' + data.error);
        }
      } catch (err) {
        addMessage('system', 'Ops! Non riusciamo a connetterci. Riprova più tardi.');
        console.error("Failed to send message:", err);
      } finally {
        setIsTyping(false); // Hide typing indicator

        isSendingRef.current = false;

        if (pollFnRef.current) pollFnRef.current(true); // Manual poll after sending message
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
        open ? '×' : React.createElement(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 24 24',
            width: '24',
            height: '24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          React.createElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
        )
      ),
      open &&
        React.createElement(
          'div',
          { className: `kommander-window ${isDarkMode ? 'dark-mode' : ''}` },
          React.createElement(
            'div',
            { className: 'kommander-header' },
            React.createElement('span', { className: 'font-semibold' }, botName + ' – Trial'),
            React.createElement(
              'div',
              { className: 'kommander-header-right' },
              React.createElement('span', { className: 'kommander-badge' }, 'Online'),
              React.createElement('span', { className: 'kommander-date' }, currentDate),
              React.createElement(
                'button',
                {
                  onClick: toggleDarkMode,
                  'aria-label': 'Toggle Dark Mode',
                  className: 'kommander-toggle-dark-mode',
                  title: isDarkMode ? 'Disattiva Modalità Scura' : 'Attiva Modalità Scura'
                },
                isDarkMode ?
                  React.createElement(
                    'svg',
                    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'currentColor', width: '16', height: '16' },
                    React.createElement('path', { d: 'M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.106a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.06l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM18.894 17.894a.75.75 0 0 0-1.06 1.06l1.591 1.591a.75.75 0 1 0 1.06-1.06l-1.591-1.591ZM12 18.75a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75ZM5.003 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.06 1.06l1.59 1.591ZM3 12.75a.75.75 0 0 1-.75-.75H.75a.75.75 0 0 1 0-1.5H2.25c.414 0 .75.336.75.75Z' })
                  )
                  :
                  React.createElement(
                    'svg',
                    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'currentColor', width: '16', height: '16' },
                    React.createElement('path', { d: 'M9.528 1.714a.75.75 0 0 0-.829 1.074 11.25 11.25 0 0 1 7.029 7.029.75.75 0 0 0 1.074-.829 12.75 12.75 0 0 0-8.274-8.274ZM10.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12 3.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75ZM5.25 5.25a.75.75 0 0 0 0 1.06h.001l.447.447a.75.75 0 1 0 1.06-1.06l-.447-.447a.75.75 0 0 0-1.06 0ZM4.5 12a.75.75 0 0 1 .75-.75H5.25a.75.75 0 0 1 0 1.5H4.5a.75.75 0 0 1-.75-.75ZM7.029 18.894a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.06l1.59-1.591ZM12 18.75a.75.75 0 0 1-.75.75v.75a.75.75 0 0 1 1.5 0v-.75a.75.75 0 0 1-.75-.75ZM17.894 17.029a.75.75 0 1 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.06-1.06l-1.591-1.59ZM19.5 12a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 0 1.5h-.75a.75.75 0 0 1-.75-.75ZM18.894 5.003a.75.75 0 0 0-1.06-1.06l-1.59 1.59a.75.75 0 0 0 1.06 1.06l1.59-1.591ZM12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM9.528 1.714a.75.75 0 0 0-.829 1.074 11.25 11.25 0 0 1 7.029 7.029.75.75 0 0 0 1.074-.829 12.75 12.75 0 0 0-8.274-8.274ZM10.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12 3.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75ZM5.25 5.25a.75.75 0 0 0 0 1.06h.001l.447.447a.75.75 0 1 0 1.06-1.06l-.447-.447a.75.75 0 0 0-1.06 0ZM4.5 12a.75.75 0 0 1 .75-.75H5.25a.75.75 0 0 1 0 1.5H4.5a.75.75 0 0 1-.75-.75ZM7.029 18.894a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.06l1.59-1.591ZM12 18.75a.75.75 0 0 1-.75.75v.75a.75.75 0 0 1 1.5 0v-.75a.75.75 0 0 1-.75-.75ZM17.894 17.029a.75.75 0 1 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.06-1.06l-1.591-1.59ZM19.5 12a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 0 1.5h-.75a.75.75 0 0 1-.75-.75ZM18.894 5.003a.75.75 0 0 0-1.06-1.06l-1.59 1.59a.75.75 0 0 0 1.06 1.06l1.59-1.591Z' })
                  )
              ),
              React.createElement(
                'button',
                { onClick: () => setOpen(false), 'aria-label': 'Chiudi chatbot', className: 'kommander-close' },
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
                  className: `kommander-row kommander-row-${m.role === 'user' ? 'user' : m.role}`,
                },
                m.role !== 'user' &&
                  React.createElement('img', {
                    className: 'kommander-avatar',
                    src:
                      m.role === 'agent'
                        ? 'https://placehold.co/40x40/444/FFFFFF.png?text=A'
                        : 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K',
                    alt: m.role
                  }),
                React.createElement(
                  'div',
                  { className: 'kommander-message-wrap' },
                  React.createElement(
                    'div',
                    {
                      className: `kommander-msg kommander-${m.role}`,
                    },
                    React.createElement('p', null, m.text),
                  ),
                  React.createElement('p', { className: 'kommander-time' }, m.time),
                ),
                m.role === 'user' &&
                  React.createElement('img', {
                    className: 'kommander-avatar',
                    src: 'https://placehold.co/40x40/8cb0ea/1A202C.png?text=U',
                    alt: 'User'
                  }),
              ),
            ),
            isTyping && React.createElement(
              'div',
              { className: 'kommander-row kommander-row-assistant' },
              React.createElement('img', {
                className: 'kommander-avatar',
                src: 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K',
                alt: 'Kommander.ai'
              }),
              React.createElement(
                'div',
                { className: 'kommander-msg kommander-assistant kommander-typing' },
                React.createElement('p', null, '...')
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
            React.createElement(
              'button',

              { type: 'button', className: 'kommander-restart', onClick: () => setShowRestartConfirm(true), disabled: isTyping, 'aria-label': 'Ricomincia' },
              React.createElement(
                'svg',
                { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 1920 1920', width: '16', height: '16', fill: 'currentColor' },
                React.createElement('path', { d: 'M960 0v112.941c467.125 0 847.059 379.934 847.059 847.059 0 467.125-379.934 847.059-847.059 847.059-467.125 0-847.059-379.934-847.059-847.059 0-267.106 126.607-515.915 338.824-675.727v393.374h112.94V112.941H0v112.941h342.89C127.058 407.38 0 674.711 0 960c0 529.355 430.645 960 960 960s960-430.645 960-960S1489.355 0 960 0' })

              )
            ),
            React.createElement('input', {
              value: input,
              onChange: (e) => setInput(e.target.value),
              placeholder: 'Scrivi qui…',
              disabled: isTyping // Disable input while typing
            }),
            React.createElement(
              'button',
              { type: 'submit', 'aria-label': 'Invia', disabled: isTyping || !input.trim() },
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
          showRestartConfirm &&
            React.createElement(
              'div',
              { className: 'kommander-modal-overlay' },
              React.createElement(
                'div',
                { className: 'kommander-modal' },
                React.createElement(
                  'p',
                  null,
                  'Ricominciare la conversazione?'
                ),
                React.createElement(
                  'div',
                  { className: 'kommander-modal-buttons' },
                  React.createElement(
                    'button',
                    { className: 'kommander-modal-confirm', onClick: confirmRestart },
                    'S\u00ec'
                  ),
                  React.createElement(
                    'button',
                    { className: 'kommander-modal-cancel', onClick: () => setShowRestartConfirm(false) },
                    'No'
                  )
                )
              )
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

