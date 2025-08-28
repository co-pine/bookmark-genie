import { BookmarkData } from '@/types';

export class BookmarkManager {
  /**
   * 从浏览器书签API直接读取所有书签
   */
  static async getAllBookmarks(): Promise<BookmarkData[]> {
    try {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const bookmarks: BookmarkData[] = [];
      
      // 递归遍历书签树
      const traverseBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        for (const node of nodes) {
          if (node.url) {
            // 这是一个书签（不是文件夹）
            bookmarks.push({
              id: node.id,
              title: node.title,
              url: node.url,
              dateAdded: node.dateAdded || Date.now(),
              parentId: node.parentId,
              index: node.index,
              favicon: `chrome://favicon/${node.url}`,
              description: node.title // 使用标题作为描述
            });
          }
          
          // 如果有子节点，递归处理
          if (node.children) {
            traverseBookmarks(node.children);
          }
        }
      };
      
      traverseBookmarks(bookmarkTree);
      
      // 按添加时间倒序排列
      return bookmarks.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } catch (error) {
      console.error('读取浏览器书签失败:', error);
      return [];
    }
  }

  /**
   * 根据关键词搜索书签
   */
  static async searchBookmarks(query: string): Promise<BookmarkData[]> {
    try {
      const allBookmarks = await this.getAllBookmarks();
      
      if (!query.trim()) {
        return allBookmarks.slice(0, 20); // 返回最近的20个书签
      }
      
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      return allBookmarks
        .map(bookmark => ({
          bookmark,
          score: this.calculateRelevanceScore(bookmark, searchTerms, query.toLowerCase())
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.bookmark)
        .slice(0, 20);
    } catch (error) {
      console.error('搜索书签失败:', error);
      return [];
    }
  }

  /**
   * 计算书签相关性得分
   */
  private static calculateRelevanceScore(bookmark: BookmarkData, searchTerms: string[], fullQuery: string): number {
    let score = 0;
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    const description = (bookmark.description || '').toLowerCase();

    // 完整查询匹配
    if (title.includes(fullQuery)) score += 100;
    if (description.includes(fullQuery)) score += 80;
    if (url.includes(fullQuery)) score += 60;

    // 单词匹配
    searchTerms.forEach(term => {
      if (title.includes(term)) score += 50;
      if (description.includes(term)) score += 30;
      if (url.includes(term)) score += 20;
      if (title.startsWith(term)) score += 20;
    });

    // 时间加权（最近添加的书签得分更高）
    const daysSinceAdded = (Date.now() - (bookmark.dateAdded || 0)) / (1000 * 60 * 60 * 24);
    if (daysSinceAdded < 7) score += 10;
    else if (daysSinceAdded < 30) score += 5;
    else if (daysSinceAdded < 90) score += 2;

    return score;
  }

  /**
   * 获取书签文件夹结构
   */
  static async getBookmarkFolders(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    try {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const folders: chrome.bookmarks.BookmarkTreeNode[] = [];
      
      const traverseFolders = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        for (const node of nodes) {
          if (!node.url && node.children) {
            // 这是一个文件夹
            folders.push(node);
            traverseFolders(node.children);
          }
        }
      };
      
      traverseFolders(bookmarkTree);
      return folders;
    } catch (error) {
      console.error('读取书签文件夹失败:', error);
      return [];
    }
  }

  /**
   * 根据文件夹ID获取书签
   */
  static async getBookmarksByFolder(folderId: string): Promise<BookmarkData[]> {
    try {
      const children = await chrome.bookmarks.getChildren(folderId);
      const bookmarks: BookmarkData[] = [];
      
      for (const node of children) {
        if (node.url) {
          bookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded || Date.now(),
            parentId: node.parentId,
            index: node.index,
            favicon: `chrome://favicon/${node.url}`,
            description: node.title
          });
        }
      }
      
      return bookmarks.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } catch (error) {
      console.error('读取文件夹书签失败:', error);
      return [];
    }
  }

  /**
   * 获取最近添加的书签
   */
  static async getRecentBookmarks(limit: number = 10): Promise<BookmarkData[]> {
    const allBookmarks = await this.getAllBookmarks();
    return allBookmarks.slice(0, limit);
  }

  /**
   * 获取书签统计信息
   */
  static async getBookmarkStats(): Promise<{
    total: number;
    folders: number;
    recentCount: number;
  }> {
    try {
      const [allBookmarks, folders] = await Promise.all([
        this.getAllBookmarks(),
        this.getBookmarkFolders()
      ]);
      
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentCount = allBookmarks.filter(b => (b.dateAdded || 0) > oneWeekAgo).length;
      
      return {
        total: allBookmarks.length,
        folders: folders.length,
        recentCount
      };
    } catch (error) {
      console.error('获取书签统计失败:', error);
      return { total: 0, folders: 0, recentCount: 0 };
    }
  }
}