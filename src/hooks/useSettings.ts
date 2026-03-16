import { useState, useCallback } from 'react';
import { AppSettings, SavedLink } from '../../types';
import * as storage from '../utils/storage';
import { DEFAULT_CATEGORIES } from '../constants';

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
    const [categories, setCategories] = useState<string[]>(() => storage.getCategories());

    const saveSettings = useCallback((newSettings: AppSettings) => {
        storage.saveSettings(newSettings);
        setSettings(newSettings);
    }, []);

    const addCategory = useCallback((categoryName: string) => {
        if (categoryName.trim() && !categories.includes(categoryName.trim())) {
            const updated = [...categories, categoryName.trim()];
            setCategories(updated);
            storage.saveCategories(updated);
            return categoryName.trim();
        }
        return null;
    }, [categories]);

    const clearCache = useCallback(() => {
        storage.clearAllCache();
        setCategories(DEFAULT_CATEGORIES);
        setSettings({
            storageProvider: 'google_sheets',
            spreadsheetId: '',
            scriptUrl: '',
            notionToken: '',
            notionDatabaseId: '',
            autoAiAnalysis: true,
            aiProvider: 'cerebras',
            folderName: 'Reading List',
            cerebrasApiKey: '',
            cerebrasModel: 'llama3.1-8b',
            geminiApiKey: '',
            geminiModel: 'gemini-2.5-flash'
        });
    }, []);

    const syncCategories = useCallback((links: SavedLink[]) => {
        if (!links || links.length === 0) return;

        const uniqueCategories = Array.from(new Set(links.map(link => link.category).filter(Boolean)));

        if (uniqueCategories.length > 0) {
            setCategories(prev => {
                const combined = Array.from(new Set([...prev, ...uniqueCategories]));
                const changed = combined.length !== prev.length || combined.some((c, i) => c !== prev[i]);
                if (changed) {
                    storage.saveCategories(combined);
                    return combined;
                }
                return prev;
            });
        }
    }, []);

    return {
        settings,
        setSettings,
        saveSettings,
        categories,
        addCategory,
        clearCache,
        syncCategories
    };
};

export default useSettings;
