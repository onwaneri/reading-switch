/** A single message in the Socratic chat */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Context passed to the chat API for every request */
export interface ChatContext {
  word: string;
  definition: string;
  wordSum: string;
  bases: string[];
  prefixes: string[];
  suffixes: string[];
  relatives: string[];
  pageText: string;
  bookTitle: string;
}

/** Request body for POST /api/chat */
export interface ChatRequest {
  message: string;
  context: ChatContext;
  history: Pick<ChatMessage, 'role' | 'content'>[];
}

/** A suggestion chip the child can tap */
export interface SuggestionChip {
  label: string;
  query: string;
}
