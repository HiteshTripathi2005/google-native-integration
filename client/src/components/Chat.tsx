'use client';

import { useChatStore } from "@/stores/chatStore";
import Header from './Header';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

export default function Chat() {
  const { messages, isLoading, isFetchingMessages, error, sendMessage, clearMessages } = useChatStore();

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col h-screen bg-[#212121] overflow-hidden">
      <Header onClearChat={clearMessages} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading || isFetchingMessages} error={error} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
