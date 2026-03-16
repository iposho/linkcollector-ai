// Storage utility functions

export const getSavedUrls = (): string[] => {
    const saved = localStorage.getItem('saved_links');
    return saved ? JSON.parse(saved) : [];
};

export const addSavedUrl = (url: string): void => {
    const savedUrls = getSavedUrls();
    if (!savedUrls.includes(url)) {
        const updatedUrls = [...savedUrls, url];
        localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
    }
};

export const removeSavedUrl = (url: string): void => {
    const savedUrls = getSavedUrls();
    const updatedUrls = savedUrls.filter(u => u !== url);
    localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
};

export const isUrlSaved = (url: string): boolean => {
    return getSavedUrls().includes(url);
};

export const getCategories = (): string[] => {
    const saved = localStorage.getItem('categories');
    const DEFAULT_CATEGORIES = ["Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"];
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: string[]): void => {
    localStorage.setItem('categories', JSON.stringify(categories));
};

export const getSettings = () => ({
    storageProvider: (localStorage.getItem('storage_provider') || 'google_sheets') as 'google_sheets' | 'notion',
    spreadsheetId: localStorage.getItem('gs_id') || '',
    scriptUrl: localStorage.getItem('gs_script_url') || '',
    notionToken: localStorage.getItem('notion_token') || '',
    notionDatabaseId: localStorage.getItem('notion_database_id') || '',
    autoAiAnalysis: localStorage.getItem('auto_ai') !== 'false',
    aiProvider: (localStorage.getItem('ai_provider') || 'cerebras') as 'cerebras' | 'google_gemini',
    folderName: localStorage.getItem('folder_name') || 'Reading List',
    cerebrasApiKey: localStorage.getItem('cerebras_api_key') || '',
    cerebrasModel: localStorage.getItem('cerebras_model') || 'llama3.1-8b',
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    geminiModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash'
});

export const saveSettings = (settings: {
    storageProvider: string;
    spreadsheetId: string;
    scriptUrl: string;
    notionToken: string;
    notionDatabaseId: string;
    autoAiAnalysis: boolean;
    aiProvider: string;
    folderName: string;
    cerebrasApiKey: string;
    cerebrasModel?: string;
    geminiApiKey: string;
    geminiModel?: string;
}): void => {
    localStorage.setItem('storage_provider', settings.storageProvider);
    localStorage.setItem('gs_id', settings.spreadsheetId);
    localStorage.setItem('gs_script_url', settings.scriptUrl);
    localStorage.setItem('notion_token', settings.notionToken);
    localStorage.setItem('notion_database_id', settings.notionDatabaseId);
    localStorage.setItem('auto_ai', String(settings.autoAiAnalysis));
    localStorage.setItem('ai_provider', settings.aiProvider);
    localStorage.setItem('folder_name', settings.folderName);
    localStorage.setItem('cerebras_api_key', settings.cerebrasApiKey);
    if (settings.cerebrasModel) {
        localStorage.setItem('cerebras_model', settings.cerebrasModel);
    }
    localStorage.setItem('gemini_api_key', settings.geminiApiKey);
    if (settings.geminiModel) {
        localStorage.setItem('gemini_model', settings.geminiModel);
    }
};

export const clearAllCache = (): void => {
    localStorage.removeItem('saved_links');
    localStorage.removeItem('categories');
    localStorage.removeItem('storage_provider');
    localStorage.removeItem('gs_id');
    localStorage.removeItem('gs_script_url');
    localStorage.removeItem('notion_token');
    localStorage.removeItem('notion_database_id');
    localStorage.removeItem('auto_ai');
    localStorage.removeItem('folder_name');
    localStorage.removeItem('cerebras_api_key');
    localStorage.removeItem('cerebras_model');
    localStorage.removeItem('ai_provider');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_model');
};
