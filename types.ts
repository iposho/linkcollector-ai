
export interface PageMetadata {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
}

export interface SavedLink {
  date: string;
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  notes: string;
  image: string;
  icon: string;
}

export type StorageProvider = 'google_sheets' | 'notion';

export interface AppSettings {
  storageProvider: StorageProvider;
  // Google Sheets
  spreadsheetId: string;
  scriptUrl: string; // URL для Google Apps Script Web App
  // Notion
  notionToken: string; // Notion Internal Integration Token
  notionDatabaseId: string; // ID базы данных Notion
  // AI
  autoAiAnalysis: boolean;
  folderName: string;
  cerebrasApiKey: string; // API ключ для Cerebras AI
  cerebrasModel?: string; // Модель для Cerebras AI
}

export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  SETTINGS = 'SETTINGS',
  LIST = 'LIST',
  EDITING = 'EDITING'
}
