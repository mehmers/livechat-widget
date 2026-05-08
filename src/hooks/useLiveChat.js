import { useState, useCallback, useRef, useEffect } from 'react';
import { LiveChatAPI } from '../api/LiveChatAPI';

export function useLiveChat(config) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isLiveAgentMode, setIsLiveAgentMode] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [currentInputType, setCurrentInputType] = useState('text');
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const apiRef = useRef(null);
  const pollingRef = useRef(null);
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  // Storage keys
  const storageKey = `livechat_${config.token}`;
  const userKey = `${storageKey}_user`;
  const sessionKey = `${storageKey}_session`;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(userKey);
      const savedSession = localStorage.getItem(sessionKey);

      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsInitialized(true);

        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          setSessionId(sessionData.sessionId);
          setIsLiveAgentMode(sessionData.isLiveAgentMode || false);
          setCurrentOptions(sessionData.currentOptions || []);
          setCurrentInputType(sessionData.currentInputType || 'text');
        }
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
  }, [userKey, sessionKey]);

  // Initialize API
  useEffect(() => {
    if (config.apiUrl && config.token) {
      apiRef.current = new LiveChatAPI({
        apiUrl: config.apiUrl,
        token: config.token,
      });

      // Fetch widget config
      apiRef.current.getConfig()
        .then(data => setWidgetConfig(data.config))
        .catch(err => {
          console.error('Failed to load widget config:', err);
          const msg = err.message || 'Konfigürasyon yüklenemedi. Lütfen tokeninizi kontrol edin.';
          setError(msg);
          setConnectionError(msg);
        });
    }
  }, [config.apiUrl, config.token]);

  // Load history when user is restored from localStorage
  useEffect(() => {
    if (isInitialized && user?.id && apiRef.current) {
      apiRef.current.getHistory(user.id)
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            setSessionId(data.session_id);
            setIsLiveAgentMode(data.is_live_agent_mode || false);

            // Set current step options and input type
            setCurrentOptions(data.current_options || []);
            setCurrentInputType(data.current_input_type || 'text');

            // Update localStorage with latest session info
            localStorage.setItem(sessionKey, JSON.stringify({
              sessionId: data.session_id,
              isLiveAgentMode: data.is_live_agent_mode || false,
              currentOptions: data.current_options || [],
              currentInputType: data.current_input_type || 'text',
            }));
          }
        })
        .catch(err => console.error('Failed to load history:', err));
    }
  }, [isInitialized, user?.id, sessionKey]);

  // WebSocket subscriber — agent reply / mode change push
  useEffect(() => {
    if (!user?.id || !config.apiUrl || !config.token) return undefined;

    // http(s)://host[:port]  →  ws(s)://host[:port]/livechat
    // (Backend WebSocket'i HTTP ile AYNI portta /livechat path'inde dinliyor.)
    // Geriye-doneuk: config.wsUrl tam URL olarak override edilebilir.
    let wsUrl;
    try {
      if (config.wsUrl) {
        wsUrl = config.wsUrl;
      } else {
        const u = new URL(config.apiUrl);
        const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
        // config.wsPort verildiyse onu kullan (legacy), yoksa apiUrl'in portunu kullan
        const portPart = config.wsPort ? `:${config.wsPort}` : (u.port ? `:${u.port}` : '');
        wsUrl = `${proto}//${u.hostname}${portPart}/livechat`;
      }
    } catch (e) {
      return undefined;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      let ws;
      try { ws = new WebSocket(wsUrl); } catch (e) { return; }
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            command: 'livechat:join',
            token: config.token,
            external_user_id: user.id,
          }),
        );
      };

      ws.onmessage = (ev) => {
        let data;
        try { data = JSON.parse(ev.data); } catch (e) { return; }
        if (data.type === 'livechat:message' && data.message) {
          const msg = data.message;
          if (seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (data.type === 'livechat:mode') {
          setIsLiveAgentMode(data.mode === 'live_agent');
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        // exponential-ish reconnect: 2s
        wsReconnectRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        try { ws.close(); } catch (e) {}
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [user?.id, config.apiUrl, config.token, config.wsPort]);

  // Polling fallback — WS yoksa veya disconnect ise live agent mesajları kaçmasın diye
  useEffect(() => {
    if (isLiveAgentMode && user?.id) {
      pollingRef.current = setInterval(async () => {
        try {
          const data = await apiRef.current.getHistory(user.id);
          if (data.messages) {
            // dedup against seenIds
            data.messages.forEach((m) => seenIdsRef.current.add(m.id));
            setMessages(data.messages);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 8000); // WS varsa 8sn yeterli (eskiden 3sn, sadece fallback)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isLiveAgentMode, user?.id]);

  // Initialize session with user data
  const initSession = useCallback(async (userData) => {
    if (!apiRef.current) {
      setError('API not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRef.current.initSession(userData);
      setUser(data.user);
      setIsInitialized(true);

      // Save to localStorage
      localStorage.setItem(userKey, JSON.stringify(data.user));

      // Load existing history if any
      const historyData = await apiRef.current.getHistory(data.external_user_id);
      if (historyData.messages && historyData.messages.length > 0) {
        setMessages(historyData.messages);
        setSessionId(historyData.session_id);
        setIsLiveAgentMode(historyData.is_live_agent_mode || false);

        // Set current step options and input type
        setCurrentOptions(historyData.current_options || []);
        setCurrentInputType(historyData.current_input_type || 'text');

        // Save session info
        localStorage.setItem(sessionKey, JSON.stringify({
          sessionId: historyData.session_id,
          isLiveAgentMode: historyData.is_live_agent_mode || false,
          currentOptions: historyData.current_options || [],
          currentInputType: historyData.current_input_type || 'text',
        }));
      }

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userKey, sessionKey]);

  // Send message
  const sendMessage = useCallback(async (message) => {
    if (!apiRef.current) {
      setError('API not initialized');
      return false;
    }

    if (!user) {
      setError('Kullanıcı bilgileri bulunamadı');
      return false;
    }

    if (hasEnded) {
      setError('Sohbet sonlandı');
      return false;
    }

    setIsLoading(true);
    setError(null);

    // Add user message to UI immediately
    const userMessage = {
      id: `temp_${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const data = await apiRef.current.sendMessage(user.id, message);

      // Update session info
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(sessionKey, JSON.stringify({
          sessionId: data.session_id,
          isLiveAgentMode: data.mode === 'live_agent',
          currentOptions: data.options || [],
          currentInputType: data.input_type || 'text',
        }));
      }

      // Handle live agent mode
      if (data.mode === 'live_agent') {
        setIsLiveAgentMode(true);
      } else if (data.mode === 'bot') {
        setIsLiveAgentMode(false);
      }

      // Add bot/agent response
      if (data.response) {
        const botMessage = {
          id: `bot_${Date.now()}`,
          content: data.response,
          sender: data.mode === 'live_agent' ? 'agent' : 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, botMessage]);
      }

      // Update options and input type
      setCurrentOptions(data.options || []);
      setCurrentInputType(data.input_type || 'text');

      // Check if ended
      if (data.ended) {
        setHasEnded(true);
      }

      return true;
    } catch (err) {
      setError(err.message);
      // Remove the temp message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, hasEnded, sessionKey, isInitialized]);

  // Send file
  const sendFile = useCallback(async (file) => {
    if (!apiRef.current) {
      setError('API not initialized');
      return false;
    }

    if (!user) {
      setError('Kullanıcı bilgileri bulunamadı');
      return false;
    }

    if (hasEnded) {
      setError('Sohbet sonlandı');
      return false;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Sadece JPG, JPEG ve PNG dosyaları kabul edilir.');
      return false;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB\'dan büyük olamaz.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    // Add file message to UI
    const fileMessage = {
      id: `temp_file_${Date.now()}`,
      content: `[Dosya: ${file.name}]`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      file: { name: file.name },
    };
    setMessages(prev => [...prev, fileMessage]);

    try {
      const data = await apiRef.current.sendFile(user.id, file);

      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(sessionKey, JSON.stringify({
          sessionId: data.session_id,
          isLiveAgentMode: data.mode === 'live_agent',
          currentOptions: data.options || [],
          currentInputType: data.input_type || 'text',
        }));
      }

      if (data.mode === 'live_agent') {
        setIsLiveAgentMode(true);
      }

      if (data.response) {
        const botMessage = {
          id: `bot_${Date.now()}`,
          content: data.response,
          sender: data.mode === 'live_agent' ? 'agent' : 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, botMessage]);
      }

      setCurrentOptions(data.options || []);
      setCurrentInputType(data.input_type || 'text');

      if (data.ended) {
        setHasEnded(true);
      }

      return true;
    } catch (err) {
      setError(err.message);
      setMessages(prev => prev.filter(m => m.id !== fileMessage.id));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, hasEnded, sessionKey]);

  // Reset chat
  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setIsLiveAgentMode(false);
    setCurrentOptions([]);
    setCurrentInputType('text');
    setHasEnded(false);
    setError(null);
    setIsInitialized(false);
    setUser(null);

    // Clear localStorage
    localStorage.removeItem(userKey);
    localStorage.removeItem(sessionKey);
  }, [userKey, sessionKey]);

  return {
    messages,
    isLoading,
    error,
    isInitialized,
    user,
    sessionId,
    isLiveAgentMode,
    currentOptions,
    currentInputType,
    widgetConfig,
    hasEnded,
    initSession,
    sendMessage,
    sendFile,
    resetChat,
    setError,
    connectionError,
  };
}

export default useLiveChat;
