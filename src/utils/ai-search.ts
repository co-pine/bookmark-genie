import { BookmarkData } from '@/types';

export class AISearchEngine {
  static searchBookmarks(bookmarks: BookmarkData[], query: string): BookmarkData[] {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return bookmarks
      .map(bookmark => ({
        bookmark,
        score: this.calculateRelevanceScore(bookmark, searchTerms, query.toLowerCase())
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.bookmark);
  }

  private static calculateRelevanceScore(bookmark: BookmarkData, searchTerms: string[], fullQuery: string): number {
    let score = 0;
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    const description = (bookmark.description || '').toLowerCase();
    
    // 完整查询匹配（高分）
    if (title.includes(fullQuery)) score += 100;
    if (description.includes(fullQuery)) score += 80;
    if (url.includes(fullQuery)) score += 60;
    
    // 单词匹配
    searchTerms.forEach(term => {
      if (title.includes(term)) score += 50;
      if (description.includes(term)) score += 30;
      if (url.includes(term)) score += 20;
      
      // 标题开头匹配（额外加分）
      if (title.startsWith(term)) score += 20;
    });
    
    // 时间因子（新书签稍微加分）
    const daysSinceAdded = (Date.now() - bookmark.dateAdded) / (1000 * 60 * 60 * 24);
    if (daysSinceAdded < 7) score += 5;
    if (daysSinceAdded < 30) score += 2;
    
    return score;
  }

  static generateSearchSuggestions(bookmarks: BookmarkData[]): string[] {
    const suggestions = [
      "最近保存的书签",
      "技术文档",
      "学习资料", 
      "工作相关",
      "开发工具",
      "设计资源"
    ];
    
    // 基于现有书签生成更多建议
    const domains = new Set<string>();
    bookmarks.forEach(bookmark => {
      try {
        const domain = new URL(bookmark.url).hostname;
        domains.add(domain);
      } catch {}
    });
    
    return suggestions;
  }
}