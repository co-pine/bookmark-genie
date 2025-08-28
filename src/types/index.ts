export interface BookmarkData {
  id: string;
  title: string;
  url: string;
  dateAdded: number;
  parentId?: string;
  index?: number;
  description?: string;
  tags?: string[];
  favicon?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  bookmarks?: BookmarkData[];
}

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  customModel: string;
  maxTokens: number;
  temperature: number;
}

export interface ExtensionSettings {
  aiConfig: AIConfig;
  autoSync: boolean;
  shortcutKey: string;
  theme: 'light' | 'dark' | 'system';
}

export interface StorageData {
  bookmarks: BookmarkData[];
  chatHistory: ChatMessage[];
  settings: ExtensionSettings;
}