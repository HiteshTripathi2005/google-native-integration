import { useState, FormEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    const message = input.trim();
    setInput('');
    onSendMessage(message);
  };

  return (
    <div className="bg-[#212121] border-t border-[#2F2F2F] py-2">
      <div className="max-w-3xl mx-auto px-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center bg-[#2F2F2F] rounded-3xl border border-transparent focus-within:border-[#565656] transition-all duration-200">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Message ChatGPT"
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-400 px-4 py-2 pr-12 focus:outline-none resize-none max-h-[200px] text-base"
              style={{ minHeight: '36px' }}
              disabled={isLoading || disabled}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || disabled}
              className="absolute right-2 p-2 rounded-lg bg-transparent hover:bg-[#3F3F3F] disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200"
            >
              {isLoading ? (
                <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg 
                  className={`w-5 h-5 ${input.trim() ? 'text-white' : 'text-gray-500'}`}
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
