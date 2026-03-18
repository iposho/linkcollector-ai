import { useState, useCallback } from 'react';
import { PageMetadata } from '../../types';
import { getPlaceholderImage } from '../utils/imageUtils';

declare const chrome: any;

export interface CaptureOptions {
    tabId?: number;
    linkUrl?: string | null;
}

export const useCapture = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const captureTab = useCallback(async (options?: CaptureOptions): Promise<PageMetadata | null> => {
        setLoading(true);
        setError(null);

        try {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                let tab: any;
                if (options?.tabId) {
                    try {
                        tab = await chrome.tabs.get(options.tabId);
                    } catch {
                        tab = null;
                    }
                }
                if (!tab) {
                    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tabs.length === 0) tabs = await chrome.tabs.query({ active: true });
                    if (tabs.length === 0) {
                        tabs = await chrome.tabs.query({});
                        tabs.sort((a: any, b: any) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
                    }
                    tab = tabs[0];
                }

                if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
                    throw new Error("Невозможно извлечь данные с этой страницы");
                }

                const linkUrl = options?.linkUrl || null;

                if (linkUrl) {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (href: string) => {
                            const a = document.querySelector('a[href="' + href + '"]') || document.querySelector('a[href="' + href + '/"]');
                            const text = (a?.textContent?.trim()) ? a.textContent.trim().slice(0, 500) : null;
                            return { linkUrl: href, linkText: text };
                        },
                        args: [linkUrl],
                    });
                    const r = results?.[0]?.result;
                    const title = (r?.linkText) || linkUrl;
                    try {
                        const u = new URL(linkUrl);
                        const favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
                        setLoading(false);
                        return {
                            url: linkUrl,
                            title,
                            description: '',
                            image: getPlaceholderImage(),
                            favicon,
                        };
                    } catch {
                        setLoading(false);
                        return {
                            url: linkUrl,
                            title,
                            description: '',
                            image: getPlaceholderImage(),
                            favicon: 'https://www.google.com/s2/favicons?sz=128',
                        };
                    }
                }

                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const getMeta = (name: string) =>
                            document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
                            document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || "";

                        const ogImage = getMeta('og:image');

                        const isValidImage = ogImage &&
                            ogImage.trim() !== '' &&
                            !ogImage.includes('{LINK}') &&
                            !ogImage.includes('{') &&
                            (ogImage.startsWith('http') || ogImage.startsWith('data:') || ogImage.startsWith('/'));

                        return {
                            url: window.location.href,
                            title: document.title,
                            description: getMeta('og:description') || getMeta('description'),
                            image: isValidImage ? ogImage : null,
                            hasOgImage: !!isValidImage,
                            favicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=128`
                        };
                    }
                });

                let extracted = results[0].result as PageMetadata & { hasOgImage?: boolean };

                const hasValidImage = extracted.image &&
                    extracted.image !== null &&
                    extracted.image.trim() !== '' &&
                    !extracted.image.includes('picsum.photos') &&
                    !extracted.image.includes('{LINK}') &&
                    !extracted.image.includes('{') &&
                    (extracted.image.startsWith('http') || extracted.image.startsWith('data:') || extracted.image.startsWith('/'));

                if (!hasValidImage && typeof chrome !== 'undefined' && chrome.runtime) {
                    try {
                        const response = await Promise.race([
                            new Promise<any>((resolve, reject) => {
                                chrome.runtime.sendMessage(
                                    { action: 'captureScreenshot', tabId: tab.id },
                                    (response: any) => {
                                        if (chrome.runtime.lastError) {
                                            reject(new Error(chrome.runtime.lastError.message));
                                        } else if (response) {
                                            resolve(response);
                                        } else {
                                            reject(new Error('No response from background script'));
                                        }
                                    }
                                );
                            }),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Screenshot timeout')), 5000)
                            )
                        ]);

                        if (response && response.success && response.imageUrl) {
                            extracted.image = response.imageUrl;
                        } else {
                            throw new Error(response?.error || 'Screenshot failed');
                        }
                    } catch (screenshotError) {
                        console.error('Не удалось сделать скриншот:', screenshotError);
                        extracted.image = getPlaceholderImage();
                    }
                } else if (!hasValidImage) {
                    extracted.image = getPlaceholderImage();
                }

                delete extracted.hasOgImage;

                return extracted;
            } else {
                // Mock for development
                await new Promise(resolve => setTimeout(resolve, 1000));
                return {
                    url: "https://example.com",
                    title: "Пример страницы",
                    description: "Это демонстрационное описание страницы.",
                    image: "https://picsum.photos/seed/1/800/400",
                    favicon: "https://www.google.com/favicon.ico"
                };
            }
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        captureTab,
        loading,
        error,
        setError
    };
};

export default useCapture;
