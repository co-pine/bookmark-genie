import React from 'react';
import { ChatMessage } from '@/types';
import { Bot } from 'lucide-react';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import ReactMarkdown from 'react-markdown';
import OptimizedRenderer from './OptimizedRenderer';
import { useRAFThrottle } from '@/hooks/useThrottledValue';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingMessage?: string;
}

// 流式消息气泡组件 - 使用RAF节流优化
const StreamingMessageBubble: React.FC<{ content: string }> = React.memo(({ content }) => {
  // 使用RAF节流优化内容更新
  const optimizedContent = useRAFThrottle(content);
  
  // 预处理流式消息内容，处理思考内容
  const processStreamingContent = (content: string) => {
    const thinkingBlocks: string[] = [];
    let processedContent = content;
    
    // 处理流式思考标记
    const thinkingPattern = /<thinking-start>([\s\S]*?)(?:<thinking-end>|$)/g;
    let match;
    
    while ((match = thinkingPattern.exec(content)) !== null) {
      const thinkingContent = match[1].trim();
      if (thinkingContent) {
        thinkingBlocks.push(thinkingContent);
      }
    }
    
    // 移除思考标记，保留正常内容
    processedContent = content
      .replace(/<thinking-start>[\s\S]*?<thinking-end>/g, '')
      .replace(/<thinking-start>[\s\S]*$/g, '') // 处理未结束的思考内容
      .trim();
    
    return { processedContent, thinkingBlocks };
  };

  const { processedContent, thinkingBlocks } = processStreamingContent(optimizedContent);

  return (
    <div className="flex items-start space-x-2 flex-row">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
        <Bot className="w-4 h-4 text-secondary-foreground" />
      </div>
      
      <div className="max-w-[280px] rounded-lg p-3 text-sm bg-secondary text-secondary-foreground break-words overflow-hidden">
        <div>
          {/* 显示思考内容 */}
          {thinkingBlocks.map((thinking, index) => (
            <details key={index} className="my-2 p-2 bg-muted/50 rounded border border-muted-foreground/20" open>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground mb-1 select-none">
                💭 AI思考过程 (实时)
              </summary>
              <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap font-mono">
                {thinking}
                <span className="inline-block w-1 h-3 bg-current ml-1 animate-pulse opacity-70"></span>
              </div>
            </details>
          ))}
          
          {/* 显示处理后的消息内容 */}
          {processedContent.trim() && (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
              <ReactMarkdown
                components={{
                  // 自定义组件样式
                  p: ({ children }) => <p className="my-1 break-words overflow-wrap-anywhere">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0">{children}</li>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{children}</code>
                    ) : (
                      <code className="block p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">{children}</code>
                    );
                  },
                  pre: ({ children }) => <div className="my-2">{children}</div>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-muted-foreground/30 pl-3 my-2 italic">{children}</blockquote>
                  ),
                  h1: ({ children }) => <h1 className="text-base font-bold my-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold my-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ children, href }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {processedContent}
              </ReactMarkdown>
              <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse opacity-70"></span>
            </div>
          )}
          
          {/* 如果只有思考内容，没有正常内容，显示光标 */}
          {!processedContent.trim() && thinkingBlocks.length === 0 && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse opacity-70"></span>
          )}
        </div>
      </div>
    </div>
  );
});

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  streamingMessage 
}) => {
  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* 显示正在流式输出的消息 */}
      {streamingMessage && (
        <OptimizedRenderer content={streamingMessage}>
          <StreamingMessageBubble content={streamingMessage} />
        </OptimizedRenderer>
      )}
      
      {isLoading && !streamingMessage && <LoadingIndicator />}
    </div>
  );
};

export default MessageList;
