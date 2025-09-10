
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
      
      // Parse markdown to HTML
      let html = marked.parse(text);
      
      // Add target="_blank" and rel="noopener noreferrer" to all links
      html = html.replace(/<a([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, href, after) => {
        // Check if target is already specified
        if (!/target\s*=/i.test(before + after)) {
          return `<a${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`;
        }
        return match;
      });
      
      return html;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return text; // Fallback to plain text on error
    }
  }
  
  // Capitalizzazione automatica
  function capitalizeFirstLetter(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  function applyRealtimeCapitalization(text, previousText) {
    if (!text) return text;
    
    // Se è il primo carattere o dopo punteggiatura seguita da spazio
    if (text.length === 1 || 
        (text.length > (previousText || '').length && 
         /^[a-z]$/.test(text.slice(-1)) && 
         /[.!?]\s*$/.test(text.slice(0, -1)))) {
      return capitalizeFirstLetter(text);
    }
    
    // Capitalizza dopo punteggiatura seguita da spazio
    return text.replace(/([.!?]\s+)([a-z])/g, function(match, prefix, letter) {
      return prefix + letter.toUpperCase();
    });
  }

  function ChatbotWidget({ userId, organizationId, trialMode = false, forceReset = false, preloadSettings = {} }) {
    const { useState, useRef, useEffect } = React;
    const [open, setOpen] = useState(trialMode ? true : false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [handledBy, setHandledBy] = useState('bot');
    const [conversationId, setConversationId] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [botName, setBotName] = useState(preloadSettings.name || 'Kommander.ai');
    const [botColor, setBotColor] = useState(preloadSettings.color || '#1a1a1a');
    const viewportRef = useRef(null);
    const conversationIdRef = useRef('');
    const lastTimestampRef = useRef('');
    const pollFnRef = useRef(null);
    const prevHandledBy = useRef('bot');
    const lastSentTextRef = useRef('');

    // WebSocket state (optional, with fallback to polling)
    const wsRef = useRef(null);
    const wsConnectedRef = useRef(false);
    const wsRetryRef = useRef(0);

    const isSendingRef = useRef(false);
    const isStreamingRef = useRef(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const [showConversationsList, setShowConversationsList] = useState(false);
    const [conversationsList, setConversationsList] = useState([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    
    
    // Genera o recupera un ID utente finale univoco per questo browser
    const [endUserId, setEndUserId] = useState('');
    const endUserIdRef = useRef('');
    
    // Genera ID utente finale univoco per questo browser/dispositivo + pagina specifica
    useEffect(() => {
      const generateEndUserId = () => {
        // Include informazioni specifiche della pagina/origine
        const pageSpecificInfo = [
          window.location.hostname,     // es. "example.com"
          window.location.pathname,     // es. "/support" o "/homepage"
          window.location.protocol,     // "https:" o "http:"
          document.title || 'untitled', // Titolo della pagina
        ].join('|');
        
        const browserFingerprint = [
          navigator.userAgent,
          navigator.language,
          screen.width + 'x' + screen.height,
          new Date().getTimezoneOffset(),
        ].join('|');
        
        // Combina info pagina + browser
        const combinedFingerprint = `${pageSpecificInfo}||${browserFingerprint}`;
        
        // Crea un hash semplice del fingerprint completo
        let hash = 0;
        for (let i = 0; i < combinedFingerprint.length; i++) {
          const char = combinedFingerprint.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Converti a 32bit integer
        }
        
        // Include hostname e path nel ID per identificazione rapida
        const locationId = `${window.location.hostname}${window.location.pathname}`.replace(/[^a-zA-Z0-9]/g, '_');
        
        return `eu_${locationId}_${Math.abs(hash)}`;
      };
      
      // Storage key ora include anche informazioni della pagina
      const pageKey = `${window.location.hostname}${window.location.pathname}`;
      const endUserStorageKey = `kommander_end_user_${userId}_${pageKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      let storedEndUserId = localStorage.getItem(endUserStorageKey);
      
      if (!storedEndUserId) {
        storedEndUserId = generateEndUserId();
        localStorage.setItem(endUserStorageKey, storedEndUserId);
        console.log('[Chatbot] Generated new end user ID for page:', storedEndUserId);
        console.log('[Chatbot] Page details:', {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          href: window.location.href,
          title: document.title
        });
      } else {
        console.log('[Chatbot] Retrieved existing end user ID for page:', storedEndUserId);
        console.log('[Chatbot] Page details:', {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          href: window.location.href,
          title: document.title
        });
      }
      
      setEndUserId(storedEndUserId);
      endUserIdRef.current = storedEndUserId;
    }, [userId]);

    const restartConversation = () => {
      if (!storageKey) return; // Wait for storageKey to be set
      const newId = `konv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      conversationIdRef.current = newId;
      setConversationId(newId);
      localStorage.setItem(storageKey, newId);
      setMessages([]);
      lastTimestampRef.current = '';
      console.log('[Chatbot] Restarted conversation with new ID:', newId);
    };

    const confirmRestart = () => {
      restartConversation();
      setShowRestartConfirm(false);
    };


    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function addMessage(role, text, updateTimestamp = true, isWelcome = false) {
      setMessages((prev) => {
        const currentTime = new Date().toISOString();
        
        // Enhanced deduplication: check if this exact message already exists recently (within 5 seconds)
        const isDuplicate = prev.some(msg => {
          if (msg.role === role && msg.text === text) {
            // Check if it's a recent duplicate (within 5 seconds)
            const msgTime = msg.timestamp || msg.time;
            if (msgTime) {
              const timeDiff = Math.abs(new Date(currentTime) - new Date(msgTime));
              return timeDiff < 5000; // 5 seconds
            }
            return true; // No timestamp, consider duplicate
          }
          return false;
        });
        
        if (isDuplicate) {
          console.log('Preventing duplicate message:', role, text.substring(0, 50));
          return prev; // Don't add duplicate
        }
        
        console.log('Adding new message:', role, text.substring(0, 50));
        const newMessage = { role, text, time: formatTime(), timestamp: currentTime };
        if (isWelcome) {
          newMessage.isWelcome = true;
        }
        return [...prev, newMessage];
      });
      
      if (updateTimestamp) {
        lastTimestampRef.current = new Date().toISOString();
      }
      
      // Add welcome animation after a short delay
      if (isWelcome) {
        setTimeout(() => {
          const lastMessage = document.querySelector('.kommander-messages .kommander-row:last-child');
          if (lastMessage) {
            lastMessage.classList.add('kommander-welcome-message');
          }
        }, 100);
      }
    }

    useEffect(() => {
      // If we have preloaded settings, apply them immediately and skip fetching
      if (preloadSettings.name || preloadSettings.color) {
        console.log('[Chatbot] Using preloaded settings:', preloadSettings);
        if (preloadSettings.name) {
          setBotName(preloadSettings.name);
        }
        if (preloadSettings.color) {
          setBotColor(preloadSettings.color);
          document.documentElement.style.setProperty('--kommander-primary-color', preloadSettings.color);
          document.documentElement.style.setProperty('--kommander-secondary-color', preloadSettings.color);
          const contrastColor = getContrastTextColor(preloadSettings.color);
          document.documentElement.style.setProperty('--kommander-header-text-color', contrastColor);
        }
        
        // Don't fetch settings if we have preloaded ones and it's trial mode
        if (trialMode) return;
      }

      const contextId = organizationId || userId;
      const metaKey = `kommander:settings:${contextId}:meta`;
      const dataKey = `kommander:settings:${contextId}:data`;
      const TTL = 60 * 60 * 1000; // 1 hour

      const applySettings = (data) => {
        if (!data) return;
        if (data.name) setBotName(data.name);
        if (data.color) {
          setBotColor(data.color);
          document.documentElement.style.setProperty('--kommander-primary-color', data.color);
          document.documentElement.style.setProperty('--kommander-secondary-color', data.color);
          const contrastColor = getContrastTextColor(data.color);
          document.documentElement.style.setProperty('--kommander-header-text-color', contrastColor);
        }
      };

      const readCache = () => {
        try {
          const meta = JSON.parse(localStorage.getItem(metaKey) || 'null');
          const cached = localStorage.getItem(dataKey);
          if (meta && cached && meta.expiresAt && Date.now() < meta.expiresAt) {
            return JSON.parse(cached);
          }
        } catch (e) {
          console.warn('[Chatbot] Failed to read settings cache', e);
        }
        return null;
      };

      const fetchFromNetwork = async () => {
        const headers = {};
        try {
          const meta = JSON.parse(localStorage.getItem(metaKey) || 'null');
          if (meta?.etag) headers['If-None-Match'] = meta.etag;
        } catch {}

        try {
          const res = await fetch(`${ORIGIN}/api/settings/${contextId}`, { headers, cache: 'no-store' });
          if (res.status === 304) {
            const cached = readCache();
            if (cached) applySettings(cached);
            return;
          }
          if (!res.ok) {
            console.warn('[Chatbot] Settings fetch not ok:', res.status);
            return;
          }
          const etag = res.headers.get('ETag');
          const data = await res.json();
          applySettings(data);
          try {
            localStorage.setItem(dataKey, JSON.stringify(data));
            localStorage.setItem(metaKey, JSON.stringify({ etag, expiresAt: Date.now() + TTL }));
          } catch (e) {
            // ignore quota errors
          }
        } catch (err) {
          console.error('[Chatbot] Error fetching settings:', err);
        }
      };

      // 1) Try cache first for instant paint
      const cached = readCache();
      if (cached) applySettings(cached);

      // 2) Always fetch once (revalidates with ETag), no polling
      fetchFromNetwork();
    }, [userId, organizationId, preloadSettings, trialMode]);

    const currentDate = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Auto-scroll disabilitato per controllo utente durante streaming
    // useEffect(() => {
    //   if (viewportRef.current) {
    //     viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    //   }
    // }, [messages, isTyping]);

    useEffect(() => {
      // Only add welcome message if:
      // 1. Chat is open
      // 2. No messages exist
      // 3. No existing conversation ID (means it's a fresh conversation) OR forceReset is true
      if (open && messages.length === 0 && (!conversationIdRef.current || forceReset)) {
        // Add welcome message with animation class for trial mode
        const welcomeMessage = `Ciao, sono ${botName}! Come posso aiutarti oggi?`;
        if (trialMode) {
          // Add with animation class
          setTimeout(() => {
            addMessage('assistant', welcomeMessage, true, true);
          }, 500); // Slight delay for better UX
        } else {
          addMessage('assistant', welcomeMessage, true, true);
        }
      }
    }, [open, botName, forceReset, trialMode]);

    // Storage key using endUserId to separate conversations per browser
    const [storageKey, setStorageKey] = useState('');
    
    useEffect(() => {
      if (endUserId) {
        // Include page-specific info in storage key
        const pageId = `${window.location.hostname}${window.location.pathname}`.replace(/[^a-zA-Z0-9]/g, '_');
        const key = `kommander_conversation_${userId}_${pageId}_${endUserId}`;
        setStorageKey(key);
        
        // If forceReset is true, clear any existing conversation
        if (forceReset) {
          localStorage.removeItem(key);
          conversationIdRef.current = '';
          setConversationId('');
          console.log('[Chatbot] Forced reset - cleared conversation for page:', window.location.href);
        } else {
          const stored = localStorage.getItem(key);
          if (stored) {
            conversationIdRef.current = stored;
            setConversationId(stored);
            console.log('[Chatbot] Restored conversation ID for page:', stored, 'Page:', window.location.href);
          } else {
            console.log('[Chatbot] No existing conversation found for this page:', window.location.href);
          }
        }
      }
    }, [userId, endUserId, forceReset]);

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
          
          // Always add welcome message at the beginning of every conversation
          const welcomeMessage = {
            role: 'assistant',
            text: `Ciao, sono ${botName}! Come posso aiutarti oggi?`,
            time: formatTime()
          };
          
          setMessages([welcomeMessage, ...msgs]);
          if (msgs.length) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
          }
        } else if (res.status !== 404) {
          // Solo logga errori che non sono 404 (conversazione non trovata è normale per nuove conv)
          console.error(`Error fetching initial conversation (${res.status}):`, res.statusText);
        }
      } catch (err) {
        // Solo logga errori che non sono di rete 404
        if (!err.message?.includes('404') && !err.message?.includes('Not Found')) {
          console.error("Error fetching initial conversation:", err);
        }
      }
    };

    const poll = async (skipUserDup = false) => {
      const id = conversationIdRef.current;
      if (!id || isStreamingRef.current) {
        console.log('[Chatbot] Skipping poll - streaming active or no conversation ID');
        return;
      }
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
            
            // Add new messages with deduplication and merge with streaming message if present
            setMessages((prevMessages) => {
              const combinedMessages = [...prevMessages];
              
              newMsgs.forEach(newMsg => {
                // If we have a streaming assistant message, merge instead of pushing a new one
                if (newMsg.role === 'assistant') {
                  const streamingIdx = combinedMessages.findIndex(m => m.role === 'assistant' && m.streamingId);
                  if (streamingIdx !== -1) {
                    combinedMessages[streamingIdx] = {
                      ...combinedMessages[streamingIdx],
                      text: newMsg.text,
                      timestamp: newMsg.timestamp
                    };
                    console.log('Merged polling update into streaming assistant message');
                    return;
                  }
                }

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
        } else if (res.status !== 404) {
          // Solo logga errori che non sono 404 (conversazione non trovata è normale per nuove conv)
          console.error(`Error polling for updates (${res.status}):`, res.statusText);
        }
      } catch (err) {
        // Solo logga errori che non sono di rete 404
        if (!err.message?.includes('404') && !err.message?.includes('Not Found')) {
          console.error("Error polling for updates:", err);
        }
      }
    };

    // Skip initial fetch once for freshly created conversation IDs to avoid 404 noise
    const skipInitialFetchOnceRef = useRef(false);

    useEffect(() => {
      if (!conversationId) return;
      pollFnRef.current = poll;
      let interval = null;

      const start = () => {
        if (interval || isStreamingRef.current) return;
        // poll immediato per allineare lo stato
        if (open && !document.hidden && !wsConnectedRef.current) {
          poll();
        }
        interval = setInterval(() => {
          if (!document.hidden && open && !isStreamingRef.current && !wsConnectedRef.current) {
            poll();
          }
        }, 10000); // Poll ogni 10s quando visibile e aperto
      };

      const stop = () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      const onVisibility = () => {
        if (document.hidden || !open) {
          stop();
        } else {
          start();
        }
      };

      const doStart = () => {
        if (open && !document.hidden && !wsConnectedRef.current) {
          start();
        }
      };

      if (skipInitialFetchOnceRef.current) {
        // Consume the skip flag and start polling/ws without fetching
        skipInitialFetchOnceRef.current = false;
        doStart();
      } else {
        fetchInitial().then(() => {
          doStart();
        });
      }

      document.addEventListener('visibilitychange', onVisibility);

      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        stop();
      };
    }, [conversationId, userId, open]); // Gestisce open/visibility e stop durante streaming

    useEffect(() => {
      if (handledBy === 'agent' && prevHandledBy.current !== 'agent') {
        addMessage('system', 'Sei ora in contatto con un operatore umano.');
      }
      prevHandledBy.current = handledBy;
    }, [handledBy]);

    // Funzione per caricare la lista delle conversazioni
    const loadConversationsList = async () => {
      if (!endUserId) {
        console.log('[Chatbot] endUserId not ready yet, skipping conversations load');
        return;
      }
      
      setIsLoadingConversations(true);
      try {
        const url = `${ORIGIN}/api/user-conversations/${userId}?endUserId=${encodeURIComponent(endUserId)}`;
        console.log('[Chatbot] Loading conversations from:', url);
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          console.log('[Chatbot] Loaded conversations:', data.conversations?.length || 0);
          setConversationsList(data.conversations || []);
        } else {
          console.error('Failed to load conversations list, status:', res.status);
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    // Funzione per aprire una conversazione specifica
    const openConversation = (convId) => {
      console.log('[Chatbot] Opening conversation:', convId);
      conversationIdRef.current = convId;
      setConversationId(convId);
      if (storageKey) {
        localStorage.setItem(storageKey, convId);
        console.log('[Chatbot] Saved conversation ID to localStorage:', convId);
      }
      setMessages([]); // Clear current messages and then add welcome message
      addMessage('assistant', `Ciao, sono ${botName}! Come posso aiutarti oggi?`, true, true);
      lastTimestampRef.current = '';
      setShowConversationsList(false); // Torna alla chat
      // fetchInitial sarà chiamato automaticamente dal useEffect
    };

    // Funzione per creare una nuova conversazione
    const startNewConversation = () => {
      const newId = `konv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Avoid immediate fetchInitial 404 for new conversations
      skipInitialFetchOnceRef.current = true;
      console.log('[Chatbot] Starting new conversation:', newId);
      conversationIdRef.current = newId;
      setConversationId(newId);
      if (storageKey) {
        localStorage.setItem(storageKey, newId);
        console.log('[Chatbot] Saved new conversation ID to localStorage:', newId);
      }
      setMessages([]); // Clear messages and then add welcome message
      addMessage('assistant', `Ciao, sono ${botName}! Come posso aiutarti oggi?`, true, true);
      lastTimestampRef.current = '';
      setShowConversationsList(false);
    };

    // Determine if WS is enabled via preloadSettings
    const wsEnabled = !!preloadSettings.ws;

    const getWsUrl = () => {
      try {
        const o = new URL(ORIGIN);
        const proto = o.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = o.hostname;
        const port = preloadSettings.wsPort || (o.port ? parseInt(o.port, 10) : (o.protocol === 'https:' ? 443 : 80));
        return `${proto}//${host}:${port}/ws`;
      } catch (e) {
        return (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws';
      }
    };

    const handleWsUpdate = (data) => {
      try {
        if (!data) return;
        if (data.handledBy) setHandledBy(data.handledBy || 'bot');
        let newMsgs = (data.messages || []).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : (m.role === 'agent' ? 'agent' : m.role),
          text: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: m.timestamp
        }));
        // Filter out user messages from WS as well
        newMsgs = newMsgs.filter(msg => msg.role !== 'user');
        if (newMsgs.length) {
          lastTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp;
          setMessages((prevMessages) => {
            const combinedMessages = [...prevMessages];
            newMsgs.forEach(newMsg => {
              // If a streaming assistant message exists, merge into it
              if (newMsg.role === 'assistant') {
                const streamingIdx = combinedMessages.findIndex(m => m.role === 'assistant' && m.streamingId);
                if (streamingIdx !== -1) {
                  combinedMessages[streamingIdx] = {
                    ...combinedMessages[streamingIdx],
                    text: newMsg.text,
                    timestamp: newMsg.timestamp
                  };
                  return;
                }
              }

              const isDuplicate = combinedMessages.some(existingMsg => {
                if (existingMsg.role === newMsg.role && existingMsg.text === newMsg.text) {
                  if (existingMsg.timestamp && newMsg.timestamp) {
                    return Math.abs(new Date(existingMsg.timestamp) - new Date(newMsg.timestamp)) < 30000;
                  }
                  return true;
                }
                return false;
              });
              if (!isDuplicate) combinedMessages.push(newMsg);
            });
            return combinedMessages;
          });
          setIsTyping(false);
        }
      } catch (e) {
        console.warn('[Chatbot] WS update handling error', e);
      }
    };

    const connectWebSocket = () => {
      if (!wsEnabled) return;
      try {
        // Ensure server WS hub is started before connecting
        fetch(ORIGIN + '/api/ws-start').catch(() => {});
        const url = getWsUrl();
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          wsConnectedRef.current = true;
          wsRetryRef.current = 0;
          const id = conversationIdRef.current;
          if (id) {
            try { ws.send(JSON.stringify({ type: 'subscribe', conversationId: id, userId })); } catch {}
          }
        };
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload?.type === 'update') {
              handleWsUpdate(payload);
            }
          } catch {}
        };
        const scheduleReconnect = () => {
          wsConnectedRef.current = false;
          if (!wsEnabled) return;
          const attempt = Math.min(wsRetryRef.current + 1, 6);
          wsRetryRef.current = attempt;
          const delay = Math.pow(2, attempt) * 500; // 0.5s,1s,2s,4s,8s,16s
          setTimeout(() => {
            connectWebSocket();
          }, delay);
        };
        ws.onclose = scheduleReconnect;
        ws.onerror = scheduleReconnect;
      } catch (e) {
        console.warn('[Chatbot] WS connect error', e);
      }
    };

    // Manage WS lifecycle based on conversationId and widget state
    useEffect(() => {
      if (!wsEnabled) return;
      if (!open) {
        // Close if widget closed
        try { wsRef.current?.close(); } catch {}
        wsConnectedRef.current = false;
        return;
      }
      // Connect or resubscribe
      if (!wsRef.current || wsRef.current.readyState > 1) {
        connectWebSocket();
      } else if (wsConnectedRef.current && conversationIdRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: 'subscribe', conversationId: conversationIdRef.current, userId })); } catch {}
      }
      return () => {
        // No-op cleanup; connection persists while open
      };
    }, [conversationId, userId, open, wsEnabled]);

    // Funzione per mostrare la lista delle conversazioni
    const showConversationsListHandler = () => {
      setShowConversationsList(true);
      loadConversationsList();
    };

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
          // Avoid immediate fetchInitial 404 for new conversations
          skipInitialFetchOnceRef.current = true;
          conversationIdRef.current = newId;
          setConversationId(newId);
          localStorage.setItem(storageKey, newId);
        }

        // Usa la stessa logica di generateChatResponse della pagina /chatbot
        // Costruisci la history per l'AI (solo user e assistant)
        const historyForAI = messages
          .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg) => ({ role: msg.role, content: msg.text }));


        const requestBody = {
          userId: organizationId || userId,
          message: text,
          history: historyForAI,
          conversationId: conversationIdRef.current,
          site: window.location.hostname,
          endUserId: endUserIdRef.current,
        };
          
        console.log('[Chatbot] Sending message with data:', requestBody);
        
        const res = await fetch(`${ORIGIN}/api/kommander-direct-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error('Network response was not ok');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let currentMessageId = Date.now().toString();
        
        // Create unique message ID for streaming to prevent duplicates with polling
        const streamingMessageId = `streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Disable polling during streaming
        isStreamingRef.current = true;
        
        // Add initial empty message that will be updated
        addMessage('assistant', '', false);
        
        // Get the last message to update it
        const updateLastMessage = (content) => {
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                text: content,
                streamingId: streamingMessageId // Mark as streaming message
              };
            }
            return newMessages;
          });
        };
        
        // Nascondi typing loader appena inizia lo streaming
        let hasStartedStreaming = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert ArrayBuffer to text properly
          let textValue;
          if (value instanceof Uint8Array) {
            textValue = decoder.decode(value, { stream: true });
          } else {
            // If it's already text, use it directly
            textValue = value;
          }
          
          const lines = textValue.split('\n');

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.replace(/^data: /, ''));

                if (event.type === 'chunk') {
                  // Nascondi typing loader non appena inizia il primo chunk.
                  setIsTyping(false);
                  
                  fullResponse += event.content;
                  updateLastMessage(fullResponse);
                  
                  if (event.conversationId) {
                    conversationIdRef.current = event.conversationId;
                    setConversationId(event.conversationId);
                    localStorage.setItem(storageKey, event.conversationId);
                  }
                } else if (event.type === 'complete') {
                  // Remove streamingId when streaming is complete to allow normal deduplication
                  setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant' && newMessages[newMessages.length - 1].streamingId) {
                      // Remove streamingId from completed message
                      const lastMessage = { ...newMessages[newMessages.length - 1] };
                      delete lastMessage.streamingId;
                      newMessages[newMessages.length - 1] = lastMessage;
                    }
                    return newMessages;
                  });
                  
                  if (event.conversationId) {
                    conversationIdRef.current = event.conversationId;
                    setConversationId(event.conversationId);
                    localStorage.setItem(storageKey, event.conversationId);
                  }
                  
                  if (event.handledBy) {
                    setHandledBy(event.handledBy);
                  }
                } else if (event.type === 'error') {
                  addMessage('system', 'Si è verificato un errore: ' + event.error);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Line:', line);
              }
            }
          }
        }
      } catch (err) {
        addMessage('system', 'Ops! Non riusciamo a connetterci. Riprova più tardi.');
        console.error("Failed to send message:", err);
      } finally {
        setIsTyping(false); // Hide typing indicator
        isSendingRef.current = false;
        
        // Re-enable polling after streaming completes
        setTimeout(() => {
          isStreamingRef.current = false;
          if (pollFnRef.current) {
            pollFnRef.current();
          }
        }, 1000); // Wait 1 second before polling after streaming completes
      }
    };

    return React.createElement(
      React.Fragment,
      null,
      !trialMode && React.createElement(
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
      (open || trialMode) &&
        React.createElement(
          'div',
          { className: 'kommander-window' },
          React.createElement(
            'div',
            { className: 'kommander-header' },
            // Pulsante indietro (solo se non stiamo già visualizzando la lista conversazioni)
            !showConversationsList && React.createElement(
              'button',
              { 
                onClick: showConversationsListHandler, 
                className: 'kommander-back-btn',
                'aria-label': 'Lista conversazioni' 
              },
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
                React.createElement('path', { d: 'M19 12H5' }),
                React.createElement('path', { d: 'M12 19l-7-7 7-7' })
              )
            ),
            // Pulsante indietro dalla lista conversazioni alla chat
            showConversationsList && React.createElement(
              'button',
              { 
                onClick: () => setShowConversationsList(false), 
                className: 'kommander-back-btn',
                'aria-label': 'Torna alla chat' 
              },
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
                React.createElement('path', { d: 'M19 12H5' }),
                React.createElement('path', { d: 'M12 19l-7-7 7-7' })
              )
            ),
            React.createElement('span', { className: 'font-semibold' }, showConversationsList ? 'Conversazioni' : botName),
            React.createElement(
              'div',
              { className: 'kommander-header-right' },
              React.createElement('span', { className: 'kommander-badge' }, 'Online'),
              React.createElement('span', { className: 'kommander-date' }, currentDate),
              !trialMode && React.createElement(
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
            !showConversationsList ? [
              // Chat normale
              ...messages.map((m, i) =>
                React.createElement(
                  'div',
                  {
                    key: i,
                    className: `kommander-row kommander-row-${m.role === 'user' ? 'user' : (m.role === 'agent' ? 'agent' : 'assistant')}`,
                  },
                  // Avatar rimosso per layout più pulito
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
                  // Avatar utente rimosso per layout più pulito
                ),
              ),
              isTyping && React.createElement(
                'div',
                { key: 'typing', className: `kommander-row kommander-row-${handledBy === 'agent' ? 'agent' : 'assistant'}` },
                React.createElement(
                  'div',
                  { className: 'kommander-msg kommander-assistant kommander-typing-new' },
                  React.createElement(
                    'div',
                    { className: 'kommander-typing-loader' },
                    React.createElement('div', { className: 'kommander-dots-container' },
                      React.createElement('div', { className: 'kommander-dot' }),
                      React.createElement('div', { className: 'kommander-dot' }),
                      React.createElement('div', { className: 'kommander-dot' }),
                      React.createElement('div', { className: 'kommander-dot' }),
                      React.createElement('div', { className: 'kommander-dot' })
                    )
                  )
                )
              )
            ] : [
              // Lista conversazioni
              React.createElement(
                'div',
                { key: 'conversations-header', className: 'kommander-conversations-header' },
                React.createElement(
                  'button',
                  { 
                    onClick: startNewConversation, 
                    className: 'kommander-new-conversation-btn' 
                  },
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
                    React.createElement('path', { d: 'M12 5v14' }),
                    React.createElement('path', { d: 'M5 12h14' })
                  ),
                  'Nuova conversazione'
                )
              ),
              isLoadingConversations ? React.createElement(
                'div',
                { key: 'loading', className: 'kommander-loading' },
                'Caricamento conversazioni...'
              ) : conversationsList.length === 0 ? React.createElement(
                'div',
                { key: 'empty', className: 'kommander-empty-conversations' },
                'Nessuna conversazione trovata'
              ) : conversationsList.map((conv, i) => 
                React.createElement(
                  'div',
                  {
                    key: conv.id || i,
                    className: `kommander-conversation-item ${conv.id === conversationId ? 'active' : ''}`,
                    onClick: () => openConversation(conv.id)
                  },
                  React.createElement(
                    'div',
                    { className: 'kommander-conversation-preview' },
                    React.createElement('h4', null, conv.preview || 'Conversazione senza titolo'),
                    React.createElement('p', { className: 'kommander-conversation-date' }, 
                      conv.lastMessage ? new Date(conv.lastMessage).toLocaleDateString('it-IT') : 'Data non disponibile'
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'kommander-conversation-arrow' },
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
                      React.createElement('path', { d: 'M9 18l6-6-6-6' })
                    )
                  )
                )
              )
            ]
          ),
          !showConversationsList && React.createElement(
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
              id: 'kommander-message-input',
              name: 'message',
              value: input,
              onChange: (e) => {
                const newValue = e.target.value;
                // Applica capitalizzazione automatica
                const capitalizedValue = applyRealtimeCapitalization(newValue, input);
                setInput(capitalizedValue);
              },
              placeholder: 'Scrivi qui…',
              disabled: isTyping || isSendingRef.current, // Disable input while typing or sending
              autoComplete: 'off'
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

  window.initKommanderChatbot = async function ({ userId, organizationId, trialMode = false, forceReset = false, preloadSettings = {} }) {
    // Evita doppia inizializzazione del widget sulla stessa pagina
    if (window.__kommander_inited) return;
    window.__kommander_inited = true;
    await ensureReact();
    loadStyles();

    // Allow zero-fetch override via data attributes on the script tag
    try {
      const ds = (document.currentScript || Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes('chatbot.js')))?.dataset || {};
      const override = {};
      if (ds.primaryColor) override.color = ds.primaryColor;
      if (ds.botName) override.name = ds.botName;
      if (ds.ws) override.ws = ds.ws === '1' || ds.ws === 'true';
      if (ds.wsPort) {
        const p = parseInt(ds.wsPort, 10);
        if (!isNaN(p)) override.wsPort = p;
      }
      if (Object.keys(override).length > 0) {
        preloadSettings = { ...override, ...preloadSettings }; // script data-* wins unless explicitly overridden in preloadSettings
      }
    } catch {}

    let container = document.getElementById('kommander-chatbot');
    if (!container) {
      container = document.createElement('div');
      container.id = 'kommander-chatbot';
      document.body.appendChild(container);
    }
    if (ReactDOM.createRoot) {
      ReactDOM.createRoot(container).render(React.createElement(ChatbotWidget, { userId, organizationId, trialMode, forceReset, preloadSettings }));
    } else {
      ReactDOM.render(React.createElement(ChatbotWidget, { userId, organizationId, trialMode, forceReset, preloadSettings }), container);
    }
  };
})();

