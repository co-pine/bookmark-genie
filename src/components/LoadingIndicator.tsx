import React from 'react';
import { Bot } from 'lucide-react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex items-start space-x-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
        <Bot className="w-4 h-4 text-secondary-foreground" />
      </div>
      
      <div className="bg-secondary text-secondary-foreground rounded-lg p-3 max-w-[280px]">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm ml-2">正在思考...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;