'use client';

import { useState, useRef, useEffect } from 'react';
import type { SWIAnalysis } from '@/types/book';
import type { ChatMessage, ChatContext } from '@/types/chat';
import { generateSuggestions } from '@/lib/suggestions';

interface ChatAssistantProps {
  analysis: SWIAnalysis;
  bookTitle: string;
  pageText: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  onSend: (text: string, context: ChatContext) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function buildChatContext(analysis: SWIAnalysis, bookTitle: string, pageText: string): ChatContext {
  return {
    word: analysis.word,
    definition: analysis.definition,
    wordSum: analysis.wordSum,
    bases: analysis.matrix.bases.map(b => b.text),
    prefixes: analysis.matrix.prefixes.map(p => p.text),
    suffixes: analysis.matrix.suffixes.map(s => s.text),
    relatives: analysis.relatives,
    pageText,
    bookTitle,
  };
}

export function ChatAssistant({
  analysis,
  bookTitle,
  pageText,
  messages,
  isStreaming,
  error,
  onSend,
  isExpanded,
  onToggleExpand,
}: ChatAssistantProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = generateSuggestions(analysis);
  const context = buildChatContext(analysis, bookTitle, pageText);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isStreaming) return;
    onSend(messageText, context);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // --- COLLAPSED STATE ---
  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 text-blue-600 font-semibold text-sm hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
        </svg>
        Ask me about this word!
        {messages.length > 0 && (
          <span className="bg-blue-200 text-blue-700 text-xs rounded-full px-2 py-0.5">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  // --- EXPANDED STATE ---
  return (
    <div className="mt-4 flex flex-col border-t-2 border-blue-100 pt-3">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase text-gray-400">
          Ask about &ldquo;{analysis.word}&rdquo;
        </h3>
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
          aria-label="Collapse chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-2">
            Tap a question below or type your own!
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-800 ml-auto'
                : 'bg-gray-100 text-gray-700 mr-auto'
            }`}
          >
            {msg.content}
            {msg.role === 'assistant' && msg.content === '' && isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 rounded-sm animate-pulse ml-0.5" />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {/* Suggestion chips — shown only when no messages yet */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestions.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(chip.query)}
              disabled={isStreaming}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-50 cursor-pointer transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isStreaming}
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!input.trim() || isStreaming}
          className="px-3 py-2 rounded-lg bg-blue-500 text-white disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer disabled:cursor-default transition"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
