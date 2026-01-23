import { useState, useCallback } from 'react';
import { SavedLink } from '../../types';
import * as storage from '../utils/storage';
import { compressImage, imageToBase64 } from '../utils/imageUtils';

interface UseLinksOptions {
    scriptUrl: string;
}

export const useLinks = ({ scriptUrl }: UseLinksOptions) => {
    const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLinks = useCallback(async () => {
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
    }, [scriptUrl]);

    const saveLink = useCallback(async (linkData: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
        category: string;
        tags: string[];
        notes: string;
    }) => {
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        // Process image
        let imageBase64 = linkData.image;
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
                timestamp: new Date().toISOString()
            })
        });

        if (!wasAlreadySaved) {
            storage.addSavedUrl(linkData.url);
        }
    }, [scriptUrl]);

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
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        let imageBase64 = linkData.image;
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

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                url: originalUrl,
                ...linkData,
                image: imageBase64
            })
        });
    }, [scriptUrl]);

    const deleteLink = useCallback(async (url: string) => {
        if (!scriptUrl) {
            throw new Error('Укажите Script URL в настройках');
        }

        // Update local state immediately
        storage.removeSavedUrl(url);
        setSavedLinks(prev => prev.filter(link => link.url !== url));

        // Send delete request
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                url
            })
        });

        // Reload to sync
        setTimeout(() => loadLinks(), 500);
    }, [scriptUrl, loadLinks]);

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
