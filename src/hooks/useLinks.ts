import { useState, useCallback } from 'react';
import { SavedLink, StorageProvider } from '../../types';
import * as storage from '../utils/storage';
import { compressImage, imageToBase64 } from '../utils/imageUtils';
import * as notionService from '../services/notionService';

interface UseLinksOptions {
    scriptUrl: string;
    storageProvider: StorageProvider;
    notionToken: string;
    notionDatabaseId: string;
}

export const useLinks = ({ scriptUrl, storageProvider, notionToken, notionDatabaseId }: UseLinksOptions) => {
    const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLinks = useCallback(async () => {
        if (storageProvider === 'notion') {
            if (!notionToken || !notionDatabaseId) {
                setError('Укажите Notion Token и Database ID в настройках');
                return [];
            }
            try {
                setLoading(true);
                setError(null);
                const links = await notionService.queryLinks(notionToken, notionDatabaseId);
                setSavedLinks(links);
                return links;
            } catch (err: any) {
                console.error('Ошибка загрузки ссылок из Notion:', err);
                setError(err.message || 'Ошибка при загрузке списка ссылок из Notion');
                return [];
            } finally {
                setLoading(false);
            }
        }

        // Google Sheets
        if (!scriptUrl) {
            setError('Укажите Script URL в настройках');
            return [];
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(scriptUrl, { method: 'GET' });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch links`);
            }

            const result = await response.json();
            if (result.success) {
                setSavedLinks(result.data || []);
                return result.data || [];
            } else {
                throw new Error(result.error || 'Failed to load links');
            }
        } catch (err: any) {
            console.error('Ошибка загрузки ссылок:', err);
            setError(err.message || 'Ошибка при загрузке списка ссылок');
            return [];
        } finally {
            setLoading(false);
        }
    }, [scriptUrl, storageProvider, notionToken, notionDatabaseId]);

    const processImage = async (image: string): Promise<string> => {
        let imageBase64 = image;
        if (imageBase64 && !imageBase64.startsWith('data:') && !imageBase64.includes('picsum.photos')) {
            try {
                imageBase64 = await imageToBase64(imageBase64);
            } catch (err) {
                console.warn('Не удалось конвертировать изображение в base64:', err);
            }
        }

        if (imageBase64 && imageBase64.startsWith('data:')) {
            try {
                imageBase64 = await compressImage(imageBase64, 600);
            } catch (err) {
                console.warn('Не удалось сжать изображение:', err);
            }
        }
        return imageBase64;
    };

    const saveLink = useCallback(async (linkData: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
        category: string;
        tags: string[];
        notes: string;
        date?: string;
    }) => {
        if (storageProvider === 'notion') {
            if (!notionToken || !notionDatabaseId) {
                throw new Error('Укажите Notion Token и Database ID в настройках');
            }
            const wasAlreadySaved = storage.isUrlSaved(linkData.url);
            if (wasAlreadySaved) {
                await notionService.updateLink(notionToken, notionDatabaseId, linkData.url, {
                    ...linkData,
                });
            } else {
                await notionService.createLink(notionToken, notionDatabaseId, linkData);
                storage.addSavedUrl(linkData.url);
            }
            return;
        }

        // Google Sheets
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        const imageBase64 = await processImage(linkData.image);

        const wasAlreadySaved = storage.isUrlSaved(linkData.url);
        const action = wasAlreadySaved ? 'update' : 'create';

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                ...linkData,
                image: imageBase64,
                timestamp: linkData.date || new Date().toISOString()
            })
        });

        if (!wasAlreadySaved) {
            storage.addSavedUrl(linkData.url);
        }
    }, [scriptUrl, storageProvider, notionToken, notionDatabaseId]);

    const updateLink = useCallback(async (originalUrl: string, linkData: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
        category: string;
        tags: string[];
        notes: string;
        date?: string;
    }) => {
        if (storageProvider === 'notion') {
            if (!notionToken || !notionDatabaseId) {
                throw new Error('Укажите Notion Token и Database ID в настройках');
            }
            await notionService.updateLink(notionToken, notionDatabaseId, originalUrl, linkData);
            return;
        }

        // Google Sheets
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        const imageBase64 = await processImage(linkData.image);

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                ...linkData,
                url: originalUrl,
                image: imageBase64
            })
        });
    }, [scriptUrl, storageProvider, notionToken, notionDatabaseId]);

    const deleteLink = useCallback(async (url: string) => {
        if (storageProvider === 'notion') {
            if (!notionToken || !notionDatabaseId) {
                throw new Error('Укажите Notion Token и Database ID в настройках');
            }
            storage.removeSavedUrl(url);
            setSavedLinks(prev => prev.filter(link => link.url !== url));
            await notionService.deleteLink(notionToken, notionDatabaseId, url);
            setTimeout(() => loadLinks(), 500);
            return;
        }

        // Google Sheets
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        storage.removeSavedUrl(url);
        setSavedLinks(prev => prev.filter(link => link.url !== url));

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                url
            })
        });

        setTimeout(() => loadLinks(), 500);
    }, [scriptUrl, storageProvider, notionToken, notionDatabaseId, loadLinks]);

    const filterLinks = useCallback((query: string) => {
        if (!query) return savedLinks;
        const lowerQuery = query.toLowerCase();
        return savedLinks.filter(link =>
            link.title.toLowerCase().includes(lowerQuery) ||
            link.description.toLowerCase().includes(lowerQuery) ||
            link.url.toLowerCase().includes(lowerQuery) ||
            link.category.toLowerCase().includes(lowerQuery) ||
            link.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }, [savedLinks]);

    return {
        savedLinks,
        loading,
        error,
        loadLinks,
        saveLink,
        updateLink,
        deleteLink,
        filterLinks,
        setError
    };
};

export default useLinks;
