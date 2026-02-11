import { useRef, useState, useEffect, useCallback } from 'react';
import type { Message, Session, ErrorResponse, Usage } from '../types';
import { makeId } from '../types';
import { config } from '../config/env';

type StatusType = string;

// Status patterns for better detection
const STATUS_PATTERNS = {
  reading: /read_file|reading|viewing|analyzing file/i,
  writing: /write_file|writing|creating|saving/i,
  searching: /search|searching|finding|looking for/i,
  running: /run_command|running|executing|command/i,
  analyzing: /analyz|check|verify|lint|test/i,
  modifying: /replace_in_file|modifying|editing|updating/i,
  listing: /list_dir|listing|browsing/i,
  thinking: /think|consider|evaluat|processing/i,
} as const;

const STATUS_LABELS: Record<keyof typeof STATUS_PATTERNS, string> = {
  reading: '🔍 Reading files',
  writing: '✏️ Writing files',
  searching: '🔎 Searching',
  running: '⚙️ Running commands',
  analyzing: '✓ Analyzing',
  modifying: '✏️ Modifying code',
  listing: '📁 Listing files',
  thinking: '💭 Thinking',
};

async function streamFromSse(params: {
  url: string;
  body: unknown;
  signal: AbortSignal;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: ErrorResponse) => void;
  onUsage?: (usage: Usage) => void;
}): Promise<void> {
  let response: Response;

  try {
    response = await fetch(params.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body),
      signal: params.signal,
    });
  } catch (err) {
    if (params.signal.aborted) {
      console.log('Request was cancelled');
      return;
    }

    params.onError({
      type: 'network',
      message: 'Network error. Please check your connection.',
      retryable: true,
    });
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    params.onError({
      type: 'server',
      message: text || `Server error (${response.status})`,
      retryable: response.status >= 500,
    });
    return;
  }

  if (!response.body) {
    params.onError({
      type: 'server',
      message: 'No response body',
      retryable: false,
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const sep = buffer.indexOf('\n\n');
        if (sep === -1) break;

        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const lines = rawEvent.split('\n');
        const eventType = lines
          .find((l) => l.startsWith('event:'))
          ?.slice('event:'.length)
          .trim();

        const dataLines = lines
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice('data:'.length).trimStart());

        if (dataLines.length === 0) continue;
        const data = dataLines.join('\n');

        if (data === '[DONE]') {
          params.onDone();
          return;
        }

        if (eventType === 'error') {
          try {
            const parsed = JSON.parse(data) as { message?: string };
            params.onError({
              type: 'server',
              message: parsed.message || 'Unknown error',
              retryable: false,
            });
          } catch {
            params.onError({
              type: 'server',
              message: data || 'Unknown error',
              retryable: false,
            });
          }
          return;
        }

        // Handle usage data
        if (eventType === 'usage') {
          try {
            const usage = JSON.parse(data) as Usage;
            params.onUsage?.(usage);
          } catch {
            console.warn('Failed to parse usage data');
          }
          continue;
        }

        // Handle chunks
        try {
          const chunk = JSON.parse(data);
          if (typeof chunk === 'string') params.onChunk(chunk);
        } catch {
          params.onChunk(data);
        }
      }
    }

    params.onDone();
  } catch (err) {
    if (params.signal.aborted) {
      console.log('Request was cancelled');
      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    // Ignore normal disconnection messages
    if (message.includes('Cannot respond') || message.includes('No request with id')) {
      console.log('Connection closed normally');
      return;
    }

    params.onError({
      type: 'network',
      message: message || 'Connection error',
      retryable: true,
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader might already be released
    }
  }
}

export function useChat() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>('Ready');

  // Session management
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Advanced features
  const [usage, setUsage] = useState<Usage>({
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
  });
  const [streamedTokens, setStreamedTokens] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Rate limiting
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const MIN_REQUEST_INTERVAL = 1000; // 1 second

  // Refs
  const stopStreamRef = useRef<null | (() => void)>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Constants
  const MAX_CONTEXT_MESSAGES = 50; // Keep last 50 messages for context

  // ============================================================================
  // PERSISTENCE - Load/Save to localStorage
  // ============================================================================

  useEffect(() => {
    mountedRef.current = true;

    // Load sessions from localStorage
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions) as Session[];
        setSessions(parsed);

        // Load last active session
        const lastSessionId = localStorage.getItem('lastSessionId');
        if (lastSessionId && parsed.find(s => s.id === lastSessionId)) {
          setCurrentSessionId(lastSessionId);
          const session = parsed.find(s => s.id === lastSessionId);
          if (session) setMessages(session.messages);
        } else if (parsed.length > 0) {
          // Load most recent session
          const mostRecent = parsed.sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setCurrentSessionId(mostRecent.id);
          setMessages(mostRecent.messages);
        } else {
          // Create first session
          createNewSession();
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
        createNewSession();
      }
    } else {
      // First time user - create initial session
      createNewSession();
    }

    // Load usage stats
    const savedUsage = localStorage.getItem('chatUsage');
    if (savedUsage) {
      try {
        setUsage(JSON.parse(savedUsage));
      } catch {
        // Ignore parse errors
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save current session ID
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('lastSessionId', currentSessionId);
    }
  }, [currentSessionId]);

  // Save usage stats
  useEffect(() => {
    localStorage.setItem('chatUsage', JSON.stringify(usage));
  }, [usage]);

  // Update current session with latest messages
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? {
              ...s,
              messages,
              updatedAt: Date.now(),
              title: s.title || generateSessionTitle(messages)
            }
            : s
        )
      );
    }
  }, [messages, currentSessionId]);

  // ============================================================================
  // HEALTH CHECK - Monitor backend status
  // ============================================================================

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch(`${config.API_URL}/health`, {
          signal: controller.signal
        });

        clearTimeout(timeout);
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // STATUS DETECTION - Better pattern matching
  // ============================================================================

  const detectStatus = useCallback((token: string): void => {
    for (const [status, pattern] of Object.entries(STATUS_PATTERNS)) {
      if (pattern.test(token)) {
        setCurrentStatus(STATUS_LABELS[status as keyof typeof STATUS_PATTERNS]);
        return;
      }
    }

    if (isStreaming) {
      setCurrentStatus('💭 Thinking');
    }
  }, [isStreaming]);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  const generateSessionTitle = (msgs: Message[]): string => {
    const firstUserMessage = msgs.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    const title = firstUserMessage.content.slice(0, 50);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  };

  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: makeId(),
      title: 'New Chat',
      messages: [{
        id: makeId(),
        role: 'assistant',
        content: "Hi! I'm your WebBot UI. Ask me anything.",
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setInput('');
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setInput('');

      // Cancel any ongoing stream
      if (stopStreamRef.current) {
        stopStreamRef.current();
        stopStreamRef.current = null;
        setIsStreaming(false);
        setCurrentStatus('Ready');
      }
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    if (currentSessionId === sessionId) {
      // Switch to another session or create new one
      const remaining = sessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        switchSession(remaining[0].id);
      } else {
        createNewSession();
      }
    }
  }, [currentSessionId, sessions, switchSession, createNewSession]);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev =>
      prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s)
    );
  }, []);

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  const appendAssistantToken = useCallback((assistantMessageId: string, token: string) => {
    if (!token || !mountedRef.current) return;

    detectStatus(token);
    setStreamedTokens(prev => prev + 1);

    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === assistantMessageId);

      if (index === -1) {
        return [...prev, {
          id: assistantMessageId,
          role: 'assistant',
          content: token,
          timestamp: Date.now(),
        }];
      }

      const copy = [...prev];
      const current = copy[index];
      copy[index] = { ...current, content: (current.content || '') + token };
      return copy;
    });
  }, [detectStatus]);

  const retryMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== 'user') return;

    // Remove this message and all subsequent messages
    setMessages(prev => prev.slice(0, messageIndex));

    // Resend
    setTimeout(() => {
      sendMessage(message.content);
    }, 100);
  }, [messages]);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== 'user') return;

    // Remove this message and all subsequent messages
    setMessages(prev => prev.slice(0, messageIndex));

    // Send with new content
    setTimeout(() => {
      sendMessage(newContent);
    }, 100);
  }, [messages]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const reactToMessage = useCallback((messageId: string, reaction: '👍' | '👎' | null) => {
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, reaction } : m)
    );

    // TODO: Send feedback to backend for model improvement
    if (reaction) {
      console.log(`User reacted ${reaction} to message ${messageId}`);
    }
  }, []);

  // ============================================================================
  // EXPORT CHAT
  // ============================================================================

  const exportChat = useCallback((format: 'txt' | 'json' | 'md' = 'txt') => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'md') {
      content = `# ${session.title}\n\n`;
      content += `*Created: ${new Date(session.createdAt).toLocaleString()}*\n\n`;
      content += '---\n\n';
      session.messages.forEach(m => {
        content += `## ${m.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n`;
        content += `${m.content}\n\n`;
        content += '---\n\n';
      });
      mimeType = 'text/markdown';
      extension = 'md';
    } else {
      content = `${session.title}\n`;
      content += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
      content += '='.repeat(60) + '\n\n';
      session.messages.forEach(m => {
        content += `${m.role.toUpperCase()}:\n${m.content}\n\n`;
        content += '-'.repeat(60) + '\n\n';
      });
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${session.title.slice(0, 30)}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sessions, currentSessionId]);

  // ============================================================================
  // SEND MESSAGE - Enhanced with all features
  // ============================================================================

  const sendMessage = useCallback((content: string, attachments?: File[]) => {
    const text = content.trim();
    if (!text || isStreaming) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      alert('Please wait a moment before sending another message');
      return;
    }
    setLastRequestTime(now);

    // Backend health check
    if (backendStatus === 'offline') {
      alert('Backend is offline. Please check your connection.');
      return;
    }

    // Cancel any existing stream
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }

    setInput('');
    setIsStreaming(true);
    setCurrentStatus('💭 Thinking');
    setStreamedTokens(0);

    const userMessageId = makeId();
    const assistantMessageId = makeId();
    activeAssistantIdRef.current = assistantMessageId;

    setMessages((prev) => {
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments: attachments?.map(f => f.name),
      };

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      // Build payload with context window management
      const recentMessages = prev.slice(-MAX_CONTEXT_MESSAGES);
      const payloadMessages = [
        ...recentMessages.map(({ role, content }) => ({ role, content })),
        { role: userMessage.role, content: userMessage.content }
      ];

      // Start streaming
      setTimeout(() => {
        const controller = new AbortController();
        stopStreamRef.current = () => controller.abort();

        void streamFromSse({
          url: config.API_URL,
          body: { messages: payloadMessages },
          signal: controller.signal,
          onChunk: (chunk) => appendAssistantToken(assistantMessageId, chunk),
          onDone: () => {
            if (!mountedRef.current) return;
            setIsStreaming(false);
            setCurrentStatus('Ready');
            stopStreamRef.current = null;
            activeAssistantIdRef.current = null;
          },
          onError: (error) => {
            if (!mountedRef.current) return;

            const errorMessage = `\n\n[Error: ${error.message}]${error.retryable ? ' (You can retry this message)' : ''}`;
            appendAssistantToken(assistantMessageId, errorMessage);

            setIsStreaming(false);
            setCurrentStatus('Ready');
            stopStreamRef.current = null;
            activeAssistantIdRef.current = null;

            // Mark message as failed for retry
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, error: error, retryable: error.retryable }
                  : m
              )
            );
          },
          onUsage: (newUsage) => {
            setUsage(prev => ({
              promptTokens: prev.promptTokens + newUsage.promptTokens,
              completionTokens: prev.completionTokens + newUsage.completionTokens,
              totalCost: prev.totalCost + newUsage.totalCost,
            }));
          },
        });
      }, 0);

      return [...prev, userMessage, assistantMessage];
    });
  }, [
    isStreaming,
    lastRequestTime,
    backendStatus,
    appendAssistantToken,
  ]);

  const send = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  // ============================================================================
  // STOP GENERATION
  // ============================================================================

  const stopGeneration = useCallback(() => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;

      if (activeAssistantIdRef.current) {
        appendAssistantToken(
          activeAssistantIdRef.current,
          '\n\n[Generation stopped by user]'
        );
      }

      setIsStreaming(false);
      setCurrentStatus('Ready');
      activeAssistantIdRef.current = null;
    }
  }, [appendAssistantToken]);

  // ============================================================================
  // CLEAR CHAT
  // ============================================================================

  const clearChat = useCallback(() => {
    if (currentSessionId) {
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? {
              ...s,
              messages: [{
                id: makeId(),
                role: 'assistant',
                content: "Hi! I'm your WebBot UI. Ask me anything.",
                timestamp: Date.now(),
              }],
              updatedAt: Date.now(),
            }
            : s
        )
      );

      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setMessages([{
          id: makeId(),
          role: 'assistant',
          content: "Hi! I'm your WebBot UI. Ask me anything.",
          timestamp: Date.now(),
        }]);
      }
    }
  }, [currentSessionId, sessions]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        send();
      }

      // Escape to stop generation
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        stopGeneration();
      }

      // Ctrl/Cmd + K for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createNewSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [input, isStreaming, send, stopGeneration, createNewSession]);

  // ============================================================================
  // RETURN ALL THE THINGS!
  // ============================================================================

  return {
    // Core state
    messages,
    input,
    setInput,
    isStreaming,
    currentStatus,

    // Session management
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession,

    // Message operations
    send,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    stopGeneration,
    clearChat,

    // Advanced features
    usage,
    streamedTokens,
    backendStatus,
    exportChat,
  };
}
