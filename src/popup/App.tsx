import { useState, useEffect } from 'react';
import { ChatMessage, ExtensionSettings } from '@/types';
import { StorageManager } from '@/utils/storage';
import { BookmarkManager } from '@/utils/bookmark-manager';
import { AIAPIClient } from '@/utils/ai-api';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import SettingsPage from '@/components/SettingsPage';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 应用主题到document
  useEffect(() => {
    if (settings) {
      document.documentElement.classList.remove('light', 'dark');
      
      if (settings.theme === 'system') {
        // 跟随系统主题
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
        
        // 监听系统主题变化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e: MediaQueryListEvent) => {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handleThemeChange);
        return () => mediaQuery.removeEventListener('change', handleThemeChange);
      } else {
        // 使用固定主题
        document.documentElement.classList.add(settings.theme);
      }
    }
  }, [settings]);

  const loadInitialData = async () => {
    try {
      const [chatHistory, settingsData] = await Promise.all([
        StorageManager.getChatHistory(),
        StorageManager.getSettings()
      ]);
      
      // 只保留最近100条消息
      const limitedChatHistory = chatHistory.slice(-100);
      setMessages(limitedChatHistory);
      setSettings(settingsData);
      
      // 如果没有聊天记录，显示欢迎消息
      if (chatHistory.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '你好！我是书签精灵。你可以用自然语言询问我关于你的书签，比如："帮我找找关于React的书签"或"最近保存的技术文档"。',
          timestamp: Date.now()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // 获取书签数据和设置
      const [bookmarkData, settings] = await Promise.all([
        BookmarkManager.getAllBookmarks(),
        StorageManager.getSettings()
      ]);

      // 创建AI客户端
      const aiClient = new AIAPIClient(settings);
      
      // 使用流式聊天
      let fullResponse = '';
      
      for await (const chunk of aiClient.streamChat(content, bookmarkData)) {
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      }

      // 流式输出完成，创建最终消息
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessage(''); // 清空流式消息
      
      // 保存聊天记录（只保留最近100条）
      const updatedMessages = [...messages, userMessage, assistantMessage];
      const limitedMessages = updatedMessages.slice(-100);
      await StorageManager.saveChatHistory(limitedMessages);
      
    } catch (error) {
      console.error('发送消息失败:', error);
      setStreamingMessage('');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '抱歉，处理您的请求时出现了错误。请检查网络连接和AI配置。',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  if (showSettings) {
    return (
      <div className="h-screen bg-background text-foreground">
        <SettingsPage onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header 
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatInterface 
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        streamingMessage={streamingMessage}
      />
    </div>
  );
}

export default App;