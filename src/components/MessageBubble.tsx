import React from 'react';
import { ChatMessage } from '@/types';
import { Bot, User } from 'lucide-react';
import BookmarkCard from './BookmarkCard';
import { cn } from '@/utils/cn';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
  const isUser = message.type === 'user';
  
  // 预处理消息内容，将思考内容转换为可折叠的组件
  const processMessageContent = (content: string) => {
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
  
  const { processedContent, thinkingBlocks } = processMessageContent(message.content);
  
  return (
    <div className={cn(
      "flex items-start space-x-2",
      isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary" : "bg-secondary"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-foreground" />
        )}
      </div>
      
      <div className={cn(
        "max-w-[280px] rounded-lg p-3 text-sm break-words overflow-hidden",
        isUser 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-secondary text-secondary-foreground"
      )}>
        <div>
          {/* 显示思考内容 */}
          {thinkingBlocks.map((thinking, index) => (
            <details key={index} className="my-2 p-2 bg-muted/50 rounded border border-muted-foreground/20">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground mb-1 select-none">
                💭 AI思考过程 (点击展开/收起)
              </summary>
              <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap font-mono">
                {thinking}
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
            </div>
          )}
        </div>
        
        {message.bookmarks && message.bookmarks.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        )}
        
        <div className={cn(
          "text-xs mt-2 opacity-70",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
