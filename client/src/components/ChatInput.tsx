import { useState, FormEvent, useRef } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  onFileUpload?: (files: File[]) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, onFileUpload, isLoading, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for supported file types (text files, PDFs, etc.)
    const supportedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv', 'application/json'];
    const validFiles = files.filter(file =>
      supportedTypes.includes(file.type) || file.name.match(/\.(txt|pdf|md|csv|json)$/i)
    );

    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only text, PDF, markdown, CSV, and JSON files are supported.');
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);

      // Auto-upload files if onFileUpload is provided
      if (onFileUpload) {
        setIsUploading(true);
        try {
          await onFileUpload(validFiles);
          setSelectedFiles([]); // Clear files after successful upload
        } catch (error) {
          console.error('File upload failed:', error);
          alert('File upload failed. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || disabled) return;

    const message = input.trim();
    const filesToSend = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);
    onSendMessage(message, filesToSend);
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
              placeholder="Message ChatGPT or upload a file..."
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-400 px-3 py-2 focus:outline-none resize-none max-h-[200px] text-base"
              style={{ minHeight: '36px' }}
              disabled={isLoading || disabled || isUploading}
            />

            <button
              type="submit"
              disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || disabled || isUploading}
              className="mr-2 p-2 rounded-lg bg-transparent hover:bg-[#3F3F3F] disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200"
            >
              {isLoading ? (
                <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg
                  className={`w-5 h-5 ${(input.trim() || selectedFiles.length > 0) ? 'text-white' : 'text-gray-500'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.md,.csv,.json,text/plain,application/pdf,text/markdown,text/csv,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </form>
      </div>
    </div>
  );
}
