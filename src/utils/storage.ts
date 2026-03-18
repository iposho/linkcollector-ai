// Storage utility functions
// In extension: also syncs to chrome.storage.local so background (context menu) can read settings.

const CHROME_STORAGE_KEY = 'linkcollector_data';

function syncToChromeStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    try {
        chrome.storage.local.set({
            [CHROME_STORAGE_KEY]: {
                settings: getSettings(),
                categories: getCategories(),
                savedUrls: getSavedUrls(),
            },
        });
    } catch (_) {}
}

/** Call from popup on load to sync savedUrls from background (e.g. after context-menu save). */
export const initFromChromeStorage = (callback?: () => void): void => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        callback?.();
        return;
    }
    chrome.storage.local.get(CHROME_STORAGE_KEY, (data: any) => {
        const payload = data?.[CHROME_STORAGE_KEY];
        if (payload?.savedUrls && Array.isArray(payload.savedUrls)) {
            localStorage.setItem('saved_links', JSON.stringify(payload.savedUrls));
        }
        if (payload?.categories && Array.isArray(payload.categories)) {
            localStorage.setItem('categories', JSON.stringify(payload.categories));
        }
        callback?.();
    });
};

export const getSavedUrls = (): string[] => {
    const saved = localStorage.getItem('saved_links');
    return saved ? JSON.parse(saved) : [];
};

export const addSavedUrl = (url: string): void => {
    const savedUrls = getSavedUrls();
    if (!savedUrls.includes(url)) {
        const updatedUrls = [...savedUrls, url];
        localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
        syncToChromeStorage();
    }
};

export const removeSavedUrl = (url: string): void => {
    const savedUrls = getSavedUrls();
    const updatedUrls = savedUrls.filter(u => u !== url);
    localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
    syncToChromeStorage();
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
    syncToChromeStorage();
};

export const getSettings = () => ({
    storageProvider: (localStorage.getItem('storage_provider') || 'google_sheets') as 'google_sheets' | 'notion',
    spreadsheetId: localStorage.getItem('gs_id') || '',
    scriptUrl: localStorage.getItem('gs_script_url') || '',
    notionToken: localStorage.getItem('notion_token') || '',
    notionDatabaseId: localStorage.getItem('notion_database_id') || '',
    autoAiAnalysis: localStorage.getItem('auto_ai') !== 'false',
    aiProvider: (localStorage.getItem('ai_provider') || 'openrouter') as 'cerebras' | 'google_gemini' | 'groq' | 'openrouter' | 'sambanova',
    folderName: localStorage.getItem('folder_name') || 'Reading List',
    cerebrasApiKey: localStorage.getItem('cerebras_api_key') || '',
    cerebrasModel: localStorage.getItem('cerebras_model') || 'llama3.1-8b',
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    geminiModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
    groqApiKey: localStorage.getItem('groq_api_key') || '',
    groqModel: localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile',
    openRouterApiKey: localStorage.getItem('openrouter_api_key') || '',
    openRouterModel: (() => {
        const v = localStorage.getItem('openrouter_model') || 'stepfun/step-3.5-flash:free';
        const fixes: Record<string, string> = {
            'openrouter/free': 'stepfun/step-3.5-flash:free',
            'liquid/lfm2.5-1.2b-thinking:free': 'liquid/lfm-2.5-1.2b-thinking:free',
            'qwen/qwen3-coder-480b-a35b-instruct:free': 'qwen/qwen3-coder:free',
            'nvidia/nemotron-nano-12b-2-vl:free': 'nvidia/nemotron-nano-12b-v2-vl:free',
        };
        return fixes[v] ?? v;
    })(),
    sambanovaApiKey: localStorage.getItem('sambanova_api_key') || '',
    sambanovaModel: localStorage.getItem('sambanova_model') || 'DeepSeek-R1-0528'
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
    groqApiKey: string;
    groqModel?: string;
    openRouterApiKey: string;
    openRouterModel?: string;
    sambanovaApiKey: string;
    sambanovaModel?: string;
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
    localStorage.setItem('groq_api_key', settings.groqApiKey);
    if (settings.groqModel) {
        localStorage.setItem('groq_model', settings.groqModel);
    }
    localStorage.setItem('openrouter_api_key', settings.openRouterApiKey);
    if (settings.openRouterModel) {
        localStorage.setItem('openrouter_model', settings.openRouterModel);
    }
    localStorage.setItem('sambanova_api_key', settings.sambanovaApiKey);
    if (settings.sambanovaModel) {
        localStorage.setItem('sambanova_model', settings.sambanovaModel);
    }
    syncToChromeStorage();
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
    localStorage.removeItem('groq_api_key');
    localStorage.removeItem('groq_model');
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('openrouter_model');
    localStorage.removeItem('sambanova_api_key');
    localStorage.removeItem('sambanova_model');
    // Иначе при следующем открытии popup initFromChromeStorage подтянет старые данные из chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(CHROME_STORAGE_KEY);
    }
};
