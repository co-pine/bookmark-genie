import React, { useState, useEffect } from 'react';
import { Bot, Settings, Bookmark } from 'lucide-react';
import { BookmarkManager } from '@/utils/bookmark-manager';

interface HeaderProps {
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    const loadBookmarkCount = async () => {
      try {
        const stats = await BookmarkManager.getBookmarkStats();
        setBookmarkCount(stats.total);
      } catch (error) {
        console.error('获取书签统计失败:', error);
      }
    };

    loadBookmarkCount();
  }, []);
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">书签精灵</h1>
          <p className="text-xs text-muted-foreground flex items-center">
            <Bookmark className="w-3 h-3 mr-1" />
            {bookmarkCount} 个书签
          </p>
        </div>
      </div>
      <button 
        onClick={onOpenSettings}
        className="p-2 hover:bg-accent rounded-lg transition-colors"
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default Header;