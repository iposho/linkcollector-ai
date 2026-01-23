// Image processing utilities

export const compressImage = async (imageDataUrl: string, maxWidth: number = 600): Promise<string> => {
    try {
        if (!imageDataUrl.startsWith('data:')) {
            return imageDataUrl;
        }

        if (imageDataUrl.includes('picsum.photos')) {
            return imageDataUrl;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                if (width >= img.width) {
                    resolve(imageDataUrl);
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(compressedDataUrl);
            };

            img.onerror = () => {
                console.warn('Ошибка загрузки изображения для сжатия, возвращаем оригинал');
                resolve(imageDataUrl);
            };

            img.src = imageDataUrl;
        });
    } catch (error) {
        console.error('Ошибка при сжатии изображения:', error);
        return imageDataUrl;
    }
};

export const imageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
        if (imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        if (imageUrl.includes('picsum.photos')) {
            return imageUrl;
        }

        let response: Response;
        try {
            response = await fetch(imageUrl);
        } catch (fetchError) {
            console.warn('Fetch failed, trying XHR:', fetchError);
            try {
                const blob = await new Promise<Blob>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', imageUrl, true);
                    xhr.responseType = 'blob';
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            resolve(xhr.response);
                        } else {
                            reject(new Error(`HTTP ${xhr.status}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('XHR network error'));
                    xhr.send();
                });

                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('FileReader error'));
                    reader.readAsDataURL(blob);
                });
            } catch (xhrError) {
                console.warn('XHR also failed:', xhrError);
                return imageUrl;
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();

        if (blob.size === 0) {
            throw new Error('Empty blob');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return imageUrl;
    }
};

export const getPlaceholderImage = (): string => {
    return `https://picsum.photos/seed/${Math.random()}/800/400`;
};
