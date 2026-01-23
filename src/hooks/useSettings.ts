import { useState, useCallback } from 'react';
import { AppSettings } from '../../types';
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
            spreadsheetId: '',
            scriptUrl: '',
            autoAiAnalysis: true,
            folderName: 'Reading List'
        });
    }, []);

    return {
        settings,
        setSettings,
        saveSettings,
        categories,
        addCategory,
        clearCache
    };
};

export default useSettings;
