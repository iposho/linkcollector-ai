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
    spreadsheetId: localStorage.getItem('gs_id') || '',
    scriptUrl: localStorage.getItem('gs_script_url') || '',
    autoAiAnalysis: localStorage.getItem('auto_ai') !== 'false',
    folderName: localStorage.getItem('folder_name') || 'Reading List',
    cerebrasApiKey: localStorage.getItem('cerebras_api_key') || ''
});

export const saveSettings = (settings: {
    spreadsheetId: string;
    scriptUrl: string;
    autoAiAnalysis: boolean;
    folderName: string;
    cerebrasApiKey: string;
}): void => {
    localStorage.setItem('gs_id', settings.spreadsheetId);
    localStorage.setItem('gs_script_url', settings.scriptUrl);
    localStorage.setItem('auto_ai', String(settings.autoAiAnalysis));
    localStorage.setItem('folder_name', settings.folderName);
    localStorage.setItem('cerebras_api_key', settings.cerebrasApiKey);
};

export const clearAllCache = (): void => {
    localStorage.removeItem('saved_links');
    localStorage.removeItem('categories');
    localStorage.removeItem('gs_id');
    localStorage.removeItem('gs_script_url');
    localStorage.removeItem('auto_ai');
    localStorage.removeItem('folder_name');
    localStorage.removeItem('cerebras_api_key');
};
