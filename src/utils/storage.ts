import { BookmarkData, ChatMessage, ExtensionSettings } from '@/types';

export class StorageManager {
  static async getBookmarks(): Promise<BookmarkData[]> {
    const result = await chrome.storage.local.get(['bookmarks']);
    return result.bookmarks || [];
  }

  static async saveBookmarks(bookmarks: BookmarkData[]): Promise<void> {
    await chrome.storage.local.set({ bookmarks });
  }

  static async getChatHistory(): Promise<ChatMessage[]> {
    const result = await chrome.storage.local.get(['chatHistory']);
    return result.chatHistory || [];
  }

  static async saveChatHistory(chatHistory: ChatMessage[]): Promise<void> {
    await chrome.storage.local.set({ chatHistory });
  }

  static async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      aiConfig: {
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash',
        customModel: '',
        maxTokens: 1000,
        temperature: 0.7
      },
      autoSync: true,
      shortcutKey: 'Ctrl+Shift+B',
      theme: 'system'
    };
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ settings });
  }

  static async addBookmark(bookmark: BookmarkData): Promise<void> {
    const bookmarks = await this.getBookmarks();
    bookmarks.push(bookmark);
    await this.saveBookmarks(bookmarks);
  }

  static async removeBookmark(bookmarkId: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    await this.saveBookmarks(filtered);
  }
}