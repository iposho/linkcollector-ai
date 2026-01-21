
export interface PageMetadata {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
}

export interface AppSettings {
  spreadsheetId: string;
  scriptUrl: string; // URL для Google Apps Script Web App
  autoAiAnalysis: boolean;
  folderName: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  SETTINGS = 'SETTINGS'
}
