import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  streamingMessage?: string; // 新增：正在流式输出的消息内容
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  streamingMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              streamingMessage={streamingMessage}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-border">
        <MessageInput onSendMessage={onSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface;
