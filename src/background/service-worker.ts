// Chrome扩展Service Worker - 不使用ES6 import

// 类型定义
interface BookmarkData {
  id: string;
  title: string;
  url: string;
  dateAdded: number;
  parentId?: string;
  index?: number;
  favicon?: string;
  description?: string;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  customModel: string;
  maxTokens: number;
  temperature: number;
}

interface Settings {
  aiConfig: AIConfig;
}

// 存储管理器
class BookmarkStorageManager {
  static async getBookmarks(): Promise<BookmarkData[]> {
    const result = await chrome.storage.local.get(['bookmarks']);
    return result.bookmarks || [];
  }

  static async addBookmark(bookmark: BookmarkData): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.id === bookmark.id);
    
    if (existingIndex >= 0) {
      bookmarks[existingIndex] = bookmark;
    } else {
      bookmarks.push(bookmark);
    }
    
    await chrome.storage.local.set({ bookmarks });
  }

  static async removeBookmark(id: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const filteredBookmarks = bookmarks.filter(b => b.id !== id);
    await chrome.storage.local.set({ bookmarks: filteredBookmarks });
  }

  static async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      aiConfig: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        customModel: '',
        maxTokens: 8192,
        temperature: 0.7
      }
    };
  }
}

// AI API客户端
class AIAPIClient {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  async searchBookmarks(query: string, bookmarks: BookmarkData[]): Promise<BookmarkData[]> {
    if (!this.settings.aiConfig.apiKey) {
      return this.localSearch(query, bookmarks);
    }

    try {
      const aiResponse = await this.callAI(query, bookmarks);
      return this.parseAIResponse(aiResponse, bookmarks);
    } catch (error) {
      console.error('AI API调用失败，使用本地搜索:', error);
      return this.localSearch(query, bookmarks);
    }
  }

  async callAI(query: string, bookmarks: BookmarkData[]): Promise<any> {
    const model = this.settings.aiConfig.model === 'custom' 
      ? this.settings.aiConfig.customModel 
      : this.settings.aiConfig.model;

    const prompt = `你是一个智能书签助手。用户有以下书签：

${bookmarks.map(bookmark => ({
  id: bookmark.id,
  title: bookmark.title,
  url: bookmark.url,
  description: bookmark.description || ''
})).slice(0, 50).map((bookmark, index) => `${index + 1}. 标题: ${bookmark.title}
   URL: ${bookmark.url}
   描述: ${bookmark.description}`).join('\n\n')}

用户查询: "${query}"

请分析用户的查询意图，找出最相关的书签。返回一个JSON数组，包含相关书签的ID（按相关性排序）。

示例格式：
["bookmark_id_1", "bookmark_id_2", "bookmark_id_3"]

只返回JSON数组，不要其他解释。`;

    const requestBody = {
      model: model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: this.settings.aiConfig.maxTokens,
      temperature: this.settings.aiConfig.temperature
    };

    const response = await fetch(`${this.settings.aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.aiConfig.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  parseAIResponse(response: any, bookmarks: BookmarkData[]): BookmarkData[] {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        return this.localSearch('', bookmarks);
      }

      const bookmarkIds = JSON.parse(content.trim());
      if (!Array.isArray(bookmarkIds)) {
        return this.localSearch('', bookmarks);
      }

      const results: BookmarkData[] = [];
      bookmarkIds.forEach(id => {
        const bookmark = bookmarks.find(b => b.id === id);
        if (bookmark) {
          results.push(bookmark);
        }
      });

      return results;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return this.localSearch('', bookmarks);
    }
  }

  localSearch(query: string, bookmarks: BookmarkData[]): BookmarkData[] {
    if (!query) {
      return bookmarks.slice(0, 10);
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return bookmarks
      .map(bookmark => ({
        bookmark,
        score: this.calculateRelevanceScore(bookmark, searchTerms, query.toLowerCase())
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.bookmark)
      .slice(0, 10);
  }

  calculateRelevanceScore(bookmark: BookmarkData, searchTerms: string[], fullQuery: string): number {
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

    // 时间加权
    const daysSinceAdded = (Date.now() - bookmark.dateAdded) / (1000 * 60 * 60 * 24);
    if (daysSinceAdded < 7) score += 5;
    if (daysSinceAdded < 30) score += 2;

    return score;
  }

  // AI对话功能
  async chat(message: string, conversationHistory: any[], bookmarks: BookmarkData[]): Promise<string> {
    if (!this.settings.aiConfig.apiKey) {
      return '请先在设置中配置AI API密钥。';
    }

    try {
      const model = this.settings.aiConfig.model === 'custom' 
        ? this.settings.aiConfig.customModel 
        : this.settings.aiConfig.model;

      // 构建系统提示，包含书签信息
      const bookmarkContext = bookmarks.length > 0 ? `

用户的书签信息：
${bookmarks.slice(0, 20).map((b, i) => `${i + 1}. ${b.title} - ${b.url}${b.description ? ` (${b.description})` : ''}`).join('\n')}
${bookmarks.length > 20 ? `\n... 还有${bookmarks.length - 20}个书签` : ''}` : '';

      const systemPrompt = `你是一个智能书签助手。你可以帮助用户管理和查找书签，回答关于书签的问题，或者进行一般性对话。

当用户询问书签相关问题时，请基于以下书签信息进行回答：${bookmarkContext}

请用友好、有帮助的语气回答用户的问题。如果用户询问特定书签，请提供相关的标题、URL和描述信息。`;

      // 构建消息历史
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // 保留最近10条对话
        { role: 'user', content: message }
      ];

      const requestBody = {
        model: model,
        messages: messages,
        max_tokens: this.settings.aiConfig.maxTokens,
        temperature: this.settings.aiConfig.temperature
      };

      const response = await fetch(`${this.settings.aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.aiConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || '抱歉，我无法生成回复。';
    } catch (error) {
      console.error('AI聊天调用失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return `抱歉，AI服务出现问题：${errorMessage}`;
    }
  }
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI书签管理器已安装');
});

// 不再需要监听书签事件，因为我们直接从浏览器API读取书签

// 监听快捷键命令
chrome.commands.onCommand.addListener((command: any) => {
  if (command === 'open-ai-chat') {
    chrome.action.openPopup();
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request: any, _: any, sendResponse: any) => {
  if (request.action === 'searchBookmarks') {
    handleBookmarkSearch(request.query).then(sendResponse);
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'aiChat') {
    handleAIChat(request.message, request.conversationHistory).then(sendResponse);
    return true; // 保持消息通道开放
  }
});

// 从浏览器书签API直接读取所有书签
async function getAllBookmarks(): Promise<BookmarkData[]> {
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

// AI书签搜索处理
async function handleBookmarkSearch(query: string): Promise<BookmarkData[]> {
  try {
    const [bookmarks, settings] = await Promise.all([
      getAllBookmarks(),
      BookmarkStorageManager.getSettings()
    ]);
    
    // 使用AI API客户端进行智能搜索
    const aiClient = new AIAPIClient(settings);
    const searchResults = await aiClient.searchBookmarks(query, bookmarks);
    
    return searchResults;
  } catch (error) {
    console.error('搜索书签失败:', error);
    return [];
  }
}

// AI对话处理
async function handleAIChat(message: string, conversationHistory: any[]): Promise<string> {
  try {
    const [bookmarks, settings] = await Promise.all([
      getAllBookmarks(),
      BookmarkStorageManager.getSettings()
    ]);
    
    const aiClient = new AIAPIClient(settings);
    const response = await aiClient.chat(message, conversationHistory, bookmarks);
    
    return response;
  } catch (error) {
    console.error('AI对话处理失败:', error);
    return '抱歉，AI服务暂时不可用，请检查API配置或稍后再试。';
  }
}
