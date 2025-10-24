import { create } from 'zustand';

// API base URL - make it configurable for different environments
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  result?: string;
}

export interface MessagePart {
  type: 'text' | 'tool_call' | 'tool_result';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: any;
  };
  toolResult?: {
    id: string;
    result: string;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  toolCalls?: ToolCall[];
  messageParts?: MessagePart[];
}

interface ChatStore {
  messages: ChatMessage[];
  conversationId: string;
  isLoading: boolean;
  isFetchingMessages: boolean;
  error: string | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (prompt: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversationId: 'default',
  isLoading: false, // Don't start with loading - let components control this
  isFetchingMessages: false,
  error: null,

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  sendMessage: async (prompt: string) => {
    const { addMessage, setLoading, setError, conversationId } = get();

    // Add user message
    addMessage({ content: prompt, role: 'user' });

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/streamtext`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ prompt, conversationId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = '';
      let toolCalls: ToolCall[] = [];
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                if (jsonStr === '[DONE]') continue;

                const event = JSON.parse(jsonStr);

                if (event.type === 'tool-input-available') {
                  // Handle tool call event
                  toolCalls.push({
                    id: event.toolCallId,
                    name: event.toolName,
                    arguments: event.input,
                  });
                } else if (event.type === 'tool-output-available') {
                  // Handle tool result event
                  const toolCall = toolCalls.find(tc => tc.id === event.toolCallId);
                  if (toolCall) {
                    toolCall.result = event.output;
                  }
                } else if (event.type === 'text-delta' && event.delta) {
                  assistantMessage += event.delta;
                }

                // Update the assistant message in real-time
                if (assistantMessage || toolCalls.length > 0) {
                  set((state) => {
                    const messages = [...state.messages];
                    const lastMessage = messages[messages.length - 1];

                    if (lastMessage && lastMessage.role === 'assistant') {
                      // Update existing assistant message with new object to force re-render
                      const updatedMessage = {
                        ...lastMessage,
                        content: assistantMessage,
                        toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
                      };
                      messages[messages.length - 1] = updatedMessage;
                    } else {
                      // Add new assistant message
                      messages.push({
                        id: crypto.randomUUID(),
                        content: assistantMessage,
                        role: 'assistant',
                        timestamp: new Date(),
                        toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
                      });
                    }

                    return { messages };
                  });
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  },

  fetchMessages: async () => {
    const { isFetchingMessages, setLoading, setError } = get();

    // Don't fetch if already fetching
    if (isFetchingMessages) {
      return;
    }

    set({ isFetchingMessages: true });
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/messages`, {
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform server messages to client format
      const messages: ChatMessage[] = data.map((msg: any) => {
        let content = msg.content || '';
        let toolCalls: ToolCall[] = [];
        let messageParts: MessagePart[] | undefined;

        // If we have messageParts, reconstruct content and tool calls
        if (msg.messageParts && Array.isArray(msg.messageParts)) {
          messageParts = msg.messageParts;
          content = '';
          toolCalls = [];

          for (const part of msg.messageParts) {
            if (part.type === 'text' && part.content) {
              content += part.content;
            } else if (part.type === 'tool_call' && part.toolCall) {
              toolCalls.push({
                id: part.toolCall.id,
                name: part.toolCall.name,
                arguments: part.toolCall.arguments,
              });
            } else if (part.type === 'tool_result' && part.toolResult) {
              // Find the corresponding tool call and add the result
              const toolCall = toolCalls.find(tc => tc.id === part.toolResult!.id);
              if (toolCall) {
                toolCall.result = part.toolResult.result;
              }
            }
          }
        }

        return {
          id: crypto.randomUUID(), // Generate new ID for client
          content,
          role: msg.role as 'user' | 'assistant',
          timestamp: new Date(msg.timestamp),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          messageParts,
        };
      });

      set({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
      set({ isFetchingMessages: false });
    }
  },

  clearMessages: async () => {
    const { setLoading, setError } = get();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/messages`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear messages locally
      set({ messages: [], error: null });
    } catch (error) {
      console.error('Error clearing messages:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
