import { useRef, useState } from 'react';
import type { Message } from '../types';
import { makeId } from '../types';

type StatusType = string;

async function streamFromSse(params: {
  url: string;
  body: unknown;
  signal: AbortSignal;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}): Promise<void> {
  const res = await fetch(params.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    params.onError(text || `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
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
            params.onError(parsed.message || 'Unknown error');
          } catch {
            params.onError(data || 'Unknown error');
          }
          return;
        }

        // Backend sends JSON string chunks.
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
    if (params.signal.aborted) return;
    const message = err instanceof Error ? err.message : String(err);
    params.onError(message);
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: 'assistant',
      content: 'Hi! I’m your WebBot UI. Ask me anything.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>('Ready');

  const stopStreamRef = useRef<null | (() => void)>(null);
  const activeAssistantIdRef = useRef<string | null>(null);

  const detectStatus = (token: string): void => {
    // Check for tool usage patterns
    if (token.includes('read_file') || token.includes('Reading') || token.includes('reading')) {
      setCurrentStatus('🔍 Reading files');
    } else if (token.includes('write_file') || token.includes('Writing') || token.includes('Creating')) {
      setCurrentStatus('✏️ Writing files');
    } else if (token.includes('replace_in_file') || token.includes('Replacing') || token.includes('Modifying')) {
      setCurrentStatus('✏️ Modifying code');
    } else if (token.includes('run_command') || token.includes('Running') || token.includes('Executing')) {
      setCurrentStatus('⚙️ Running commands');
    } else if (token.includes('search') || token.includes('Searching') || token.includes('Finding')) {
      setCurrentStatus('🔍 Searching');
    } else if (token.includes('list_dir') || token.includes('Listing')) {
      setCurrentStatus('📁 Listing files');
    } else if (token.includes('Checking') || token.includes('Verifying') || token.includes('lint')) {
      setCurrentStatus('✓ Verifying');
    } else if (isStreaming) {
      setCurrentStatus('💭 Thinking');
    }
  };

  const appendAssistantToken = (assistantMessageId: string, token: string) => {
    if (!token) return;

    detectStatus(token);

    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === assistantMessageId);

      if (index === -1) {
        return [...prev, { id: assistantMessageId, role: 'assistant', content: token }];
      }

      const copy = [...prev];
      const current = copy[index];
      copy[index] = { ...current, content: (current.content || '') + token };
      return copy;
    });
  };

  const send = () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    stopStreamRef.current?.();
    stopStreamRef.current = null;

    setInput('');
    setIsStreaming(true);
    setCurrentStatus('💭 Thinking');

    const userMessageId = makeId();
    const assistantMessageId = makeId();
    activeAssistantIdRef.current = assistantMessageId;

    // Build payload with full conversation history BEFORE updating state
    // This ensures we capture all previous messages correctly
    const payloadMessages = [
      ...messages.map(({ role, content }) => ({ role, content })),
      { role: 'user' as const, content: text }
    ];

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: text },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);

    const controller = new AbortController();
    stopStreamRef.current = () => controller.abort();

    void streamFromSse({
      url: '/api/chat/stream',
      body: { messages: payloadMessages },
      signal: controller.signal,
      onChunk: (chunk) => appendAssistantToken(assistantMessageId, chunk),
      onDone: () => {
        setIsStreaming(false);
        setCurrentStatus('Ready');
        stopStreamRef.current = null;
        activeAssistantIdRef.current = null;
      },
      onError: (message) => {
        appendAssistantToken(assistantMessageId, `\n\n[Error] ${message}`);
        setIsStreaming(false);
        setCurrentStatus('Ready');
        stopStreamRef.current = null;
        activeAssistantIdRef.current = null;
      },
    });
  };

  return { messages, input, setInput, isStreaming, currentStatus, send };
}