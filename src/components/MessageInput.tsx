import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 如果输入法正在激活状态，不处理 Enter 键
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 处理输入法开始事件
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理输入法结束事件
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      <form onSubmit={handleSubmit} className="flex items-start space-x-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="询问关于您的书签..."
          disabled={disabled}
          className={cn(
            "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            "min-h-[40px] max-h-[120px]"
          )}
          rows={1}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={cn(
            "rounded-lg bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
            "flex items-center justify-center w-10 h-10 flex-shrink-0"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;