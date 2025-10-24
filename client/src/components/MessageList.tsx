import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

// Skeleton component for loading messages
function MessageSkeleton({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={`w-full ${isUser ? 'bg-[#212121]' : 'bg-[#171717]'} animate-pulse`}
    >
      <div className={`${isUser ? 'text-right' : 'text-left'} py-6 px-4`}>
        <div className="space-y-3">
          <div className={`h-4 bg-[#3F3F3F] rounded ${isUser ? 'ml-auto w-3/4' : 'w-4/5'}`}></div>
          <div className={`h-4 bg-[#3F3F3F] rounded ${isUser ? 'ml-auto w-1/2' : 'w-3/5'}`}></div>
          <div className={`h-4 bg-[#3F3F3F] rounded ${isUser ? 'ml-auto w-2/3' : 'w-2/5'}`}></div>
        </div>
      </div>
      <div className={`px-4 pb-3 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className="h-3 bg-[#3F3F3F] rounded w-12"></div>
      </div>
    </div>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export default function MessageList({ messages, isLoading, error }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#212121]">
      {messages.length === 0 ? (
        isLoading ? (
          // Show skeleton loaders while initially loading
          <>
            <div style={{ animationDelay: '0ms' }}><MessageSkeleton isUser={false} /></div>
            <div style={{ animationDelay: '100ms' }}><MessageSkeleton isUser={true} /></div>
            <div style={{ animationDelay: '200ms' }}><MessageSkeleton isUser={false} /></div>
            <div style={{ animationDelay: '300ms' }}><MessageSkeleton isUser={true} /></div>
            <div style={{ animationDelay: '400ms' }}><MessageSkeleton isUser={false} /></div>
          </>
        ) : (
          <WelcomeScreen />
        )
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}
        </>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="w-full bg-[#171717] animate-fade-in py-6 px-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="w-full bg-[#2F2F2F] py-4 px-4">
          <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

// Internal WelcomeScreen component
function WelcomeScreen() {
  const examplePrompts = [
    {
      icon: "💡",
      title: "Explain quantum computing",
      description: "in simple terms"
    },
    {
      icon: "✍️",
      title: "Help me write",
      description: "a professional email"
    },
    {
      icon: "🧮",
      title: "Solve a math problem",
      description: "step by step"
    },
    {
      icon: "🌍",
      title: "Plan a trip",
      description: "with recommendations"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] px-4">
      <div className="max-w-3xl mx-auto text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold text-white">
            ChatGPT
          </h1>
          <p className="text-lg text-gray-400">
            How can I help you today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              className="bg-[#2F2F2F] hover:bg-[#3F3F3F] text-left p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-[#565656] group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{prompt.icon}</span>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm mb-1 group-hover:text-gray-100">
                    {prompt.title}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {prompt.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
