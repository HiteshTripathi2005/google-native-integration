import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  result?: string;
}

interface MessagePart {
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

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    toolCalls?: ToolCall[];
    messageParts?: MessagePart[];
  };
  index: number;
}

export default function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Custom link component for ReactMarkdown
  const LinkComponent = ({ children, href, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline"
      {...props}
    >
      {children}
    </a>
  );

  // ReactMarkdown components configuration
  const markdownComponents = {
    a: LinkComponent,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`w-full ${isUser ? 'bg-[#212121]' : 'bg-[#171717]'} animate-fade-in relative group`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Copy button */}
      <button
        onClick={copyToClipboard}
        className={`absolute top-3 ${isUser ? 'left-3' : 'right-3'} p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
          copied ? 'bg-green-600 text-white' : 'bg-[#2F2F2F] hover:bg-[#3F3F3F] text-gray-300 hover:text-white'
        }`}
        title={copied ? 'Copied!' : 'Copy message'}
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      <div className={`${isUser ? 'text-right' : 'text-left'} pt-2 pb-2 px-4`}>
        {/* Render structured message parts if available, otherwise fallback to content */}
        {message.messageParts && message.messageParts.length > 0 ? (
          <div className="space-y-3">
            {message.messageParts.map((part, partIndex) => {
              if (part.type === 'text' && part.content) {
                return (
                  <div key={partIndex} className="prose prose-invert max-w-none prose-p:leading-7 prose-p:my-3 prose-headings:my-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-pre:my-3 prose-code:text-sm break-words text-[#ECECEC]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {part.content}
                    </ReactMarkdown>
                  </div>
                );
              } else if (part.type === 'tool_call' && part.toolCall) {
                // Check if this tool call has a corresponding result (completed)
                const hasResult = message.messageParts!.some(p =>
                  p.type === 'tool_result' && p.toolResult?.id === part.toolCall!.id
                );

                return (
                  <div key={partIndex} className="bg-[#2F2F2F] rounded-lg p-3 border border-[#404040]">
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 text-blue-400 ${!hasResult ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-400">
                        {hasResult ? `Used ${part.toolCall.name}` : `Using ${part.toolCall.name}...`}
                      </span>
                    </div>
                  </div>
                );
              } else if (part.type === 'tool_result' && part.toolResult) {
                // Don't show tool results to keep UI clean
                return null;
              }
              return null;
            })}
          </div>
        ) : (
          // Fallback to simple content rendering for backwards compatibility
          <>
            {/* Show tool calls first (at top) during streaming */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.toolCalls.map((toolCall) => (
                  <div key={toolCall.id} className="bg-[#2F2F2F] rounded-lg p-3 border border-[#404040]">
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 text-blue-400 ${!toolCall.result ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-400">
                        {toolCall.result ? `Used ${toolCall.name}` : `Using ${toolCall.name}...`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Content below tool calls */}
            <div className="prose prose-invert max-w-none prose-p:leading-7 prose-p:my-3 prose-headings:my-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-pre:my-3 prose-code:text-sm break-words text-[#ECECEC]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>

      {/* Timestamp */}
      <div className={`px-4 pb-3 ${isUser ? 'text-right' : 'text-left'}`}>
        <span className="text-xs text-gray-500">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
