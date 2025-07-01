
(function () {
  const scriptEl =
    document.currentScript ||
    Array.from(document.querySelectorAll('script')).find((s) =>
      s.src && s.src.includes('chatbot.js'),
    );
  const ORIGIN = scriptEl
    ? new URL(scriptEl.src, window.location.href).origin
    : window.location.origin;

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

  // Function to calculate contrasting text color
  function getContrastTextColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  async function ensureReact() {
    if (!window.React) {
      await loadScript(ORIGIN + '/react.production.min.js');
    }
    if (!window.ReactDOM) {
      await loadScript(ORIGIN + '/react-dom.production.min.js');
    }
    if (!window.marked) {
      await loadScript(ORIGIN + '/marked.min.js');
    }
  }
  
  // Function to render markdown to HTML
  function renderMarkdown(text) {
    if (!window.marked) {
      return text; // Fallback to plain text if marked not loaded
    }
    
    try {
      // Configure marked options
      marked.setOptions({
        breaks: true, // Convert \n to <br>
        gfm: true, // GitHub Flavored Markdown
        sanitize: false, // Allow HTML (we trust our content)
        headerIds: false, // Don't generate IDs for headers
        mangle: false // Don't mangle autolinked emails
      });
      
      return marked.parse(text);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return text; // Fallback to plain text on error
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
    const [botColor, setBotColor] = useState('#1a1a1a');
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
      const fetchSettings = () => {
        console.log('[Chatbot] Fetching settings for userId:', userId);
        fetch(`${ORIGIN}/api/settings/${userId}`)
          .then((res) => {
            console.log('[Chatbot] Settings response status:', res.status);
            return res.ok ? res.json() : null;
          })
          .then((data) => {
            console.log('[Chatbot] Settings data received:', data);
            if (!data) {
              console.log('[Chatbot] No settings found for userId:', userId);
              return;
            }
            if (data.name) {
              console.log('[Chatbot] Setting bot name to:', data.name);
              setBotName(data.name);
            }
            if (data.color) {
              console.log('[Chatbot] Setting bot color to:', data.color);
              setBotColor(data.color);
              document.documentElement.style.setProperty(
                '--kommander-primary-color',
                data.color,
              );

              document.documentElement.style.setProperty(
                '--kommander-secondary-color',
                data.color,
              );
              
              // Calculate and set contrasting text color for header
              const contrastColor = getContrastTextColor(data.color);
              document.documentElement.style.setProperty(
                '--kommander-header-text-color',
                contrastColor,
              );

            }
          })
          .catch((err) => {
            console.error('[Chatbot] Error fetching settings:', err);
          });
      };
      
      fetchSettings();
      
      // Poll for settings changes every 1 second
      const interval = setInterval(fetchSettings, 1000);
      
      return () => clearInterval(interval);
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
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'agent' ? 'agent' : m.role),
            text: m.text,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: m.timestamp // Keep original timestamp for deduplication
          }));
          
          // COMPLETE filtering logic to prevent ALL message duplicates
          newMsgs = newMsgs.filter(msg => {
            // NEVER include user messages from polling - they should only come from local addMessage
            if (msg.role === 'user') {
              console.log('Filtering out user message from polling:', msg.text);
              return false;
            }
            return true;
          });
          
          if (newMsgs.length) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
            
            // Add new messages with deduplication
            setMessages((prevMessages) => {
              const combinedMessages = [...prevMessages];
              
              newMsgs.forEach(newMsg => {
                // Check if this message already exists (prevent assistant duplicates)
                const isDuplicate = combinedMessages.some(existingMsg => {
                  // Exact text match for same role
                  if (existingMsg.role === newMsg.role && existingMsg.text === newMsg.text) {
                    // If both have timestamps, check they're within 30 seconds
                    if (existingMsg.timestamp && newMsg.timestamp) {
                      return Math.abs(new Date(existingMsg.timestamp) - new Date(newMsg.timestamp)) < 30000;
                    }
                    // If one doesn't have timestamp, consider it duplicate if text matches exactly
                    return true;
                  }
                  return false;
                });
                
                if (!isDuplicate) {
                  combinedMessages.push(newMsg);
                  console.log('Added new message from polling:', newMsg.role, newMsg.text.substring(0, 50));
                } else {
                  console.log('Filtered duplicate message from polling:', newMsg.role, newMsg.text.substring(0, 50));
                }
              });
              
              return combinedMessages;
            });
            
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
      interval = setInterval(poll, 3000); // Poll every 3 seconds for good balance between real-time and performance
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
      // Only show typing indicator if not handled by human agent
      if (handledBy !== 'agent') {
        setIsTyping(true);
      }

      const isHumanRequest = text.toLowerCase().includes('operatore umano');

      if (isHumanRequest) {
        addMessage(
          'assistant',
          'Certamente! Ti metto subito in contatto con uno specialista. Nel frattempo, se vuoi, puoi continuare a farmi domande: potrei già aiutarti a trovare una soluzione mentre attendi la risposta di un operatore.'
        );
        setIsTyping(false);
        setInput('');
        isSendingRef.current = false;
        // DO NOT call API for human operator requests - this prevents AI from generating response
        return;
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
        if (data.error) {
          addMessage('system', 'Si è verificato un errore: ' + data.error);
        }
        // NON aggiungere data.reply immediatamente - arriverà tramite polling
        // Questo evita duplicazioni
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
          { className: 'kommander-window' },
          React.createElement(
            'div',
            { className: 'kommander-header' },
            React.createElement('span', { className: 'font-semibold' }, botName),
            React.createElement(
              'div',
              { className: 'kommander-header-right' },
              React.createElement('span', { className: 'kommander-badge' }, 'Online'),
              React.createElement('span', { className: 'kommander-date' }, currentDate),
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
                  className: `kommander-row kommander-row-${m.role === 'user' ? 'user' : (m.role === 'agent' ? 'agent' : 'assistant')}`,
                },
                m.role !== 'user' &&
                  React.createElement('img', {
                    className: 'kommander-avatar',
                    src:
                      m.role === 'agent'
                        ? 'https://placehold.co/40x40/22c55e/FFFFFF.png?text=A'
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
                    m.role === 'user' 
                      ? React.createElement('p', null, m.text)
                      : React.createElement('div', {
                          className: 'kommander-markdown',
                          dangerouslySetInnerHTML: { __html: renderMarkdown(m.text) }
                        }),
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
              { className: `kommander-row kommander-row-${handledBy === 'agent' ? 'agent' : 'assistant'}` },
              React.createElement('img', {
                className: 'kommander-avatar',
                src: handledBy === 'agent' 
                  ? 'https://placehold.co/40x40/22c55e/FFFFFF.png?text=A'
                  : 'https://placehold.co/40x40/1a56db/FFFFFF.png?text=K',
                alt: handledBy === 'agent' ? 'Operatore' : 'Kommander.ai'
              }),
              React.createElement(
                'div',
                { className: 'kommander-msg kommander-assistant kommander-typing' },
                React.createElement('p', null, React.createElement('span', { className: 'kommander-typing-dots' }))
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
              disabled: isTyping || isSendingRef.current // Disable input while typing or sending
            }),
            React.createElement(
              'button',
              { type: 'submit', 'aria-label': 'Invia', disabled: isTyping || !input.trim() || isSendingRef.current },
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

