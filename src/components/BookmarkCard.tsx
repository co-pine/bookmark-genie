import React from 'react';
import { BookmarkData } from '@/types';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BookmarkCardProps {
  bookmark: BookmarkData;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark }) => {
  const handleClick = () => {
    chrome.tabs.create({ url: bookmark.url });
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border border-border bg-card hover:bg-accent cursor-pointer transition-colors",
        "flex items-start space-x-3"
      )}
    >
      <div className="w-8 h-8 rounded flex items-center justify-center bg-muted flex-shrink-0">
        {bookmark.favicon ? (
          <img 
            src={bookmark.favicon} 
            alt="" 
            className="w-4 h-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <Globe className={cn("w-4 h-4 text-muted-foreground", bookmark.favicon && "hidden")} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-card-foreground truncate">
          {bookmark.title}
        </h4>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {getDomain(bookmark.url)}
        </p>
        {bookmark.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {bookmark.description}
          </p>
        )}
      </div>
      
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
};

export default BookmarkCard;