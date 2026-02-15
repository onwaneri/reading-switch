import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ChatContext } from '@/types/chat';

interface UseSocraticChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string, context: ChatContext) => Promise<void>;
  reset: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSocraticChat(): UseSocraticChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (text: string, context: ChatContext) => {
    setError(null);

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // Capture current messages for history before updating state
    const currentMessages = messages;

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const history = currentMessages.map(m => ({ role: m.role, content: m.content }));

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context, history }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error('Chat request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines (terminated by \n\n)
        const parts = buffer.split('\n\n');
        // Keep the last part as it may be incomplete
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                )
              );
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Chat failed';
      setError(msg);
      // Remove the empty assistant placeholder on error
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages]);

  return { messages, isStreaming, error, sendMessage, reset };
}
