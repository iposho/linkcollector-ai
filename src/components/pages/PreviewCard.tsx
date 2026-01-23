import React from 'react';
import { PageMetadata } from '../../../types';
import { getPlaceholderImage } from '../../utils/imageUtils';

interface PreviewCardProps {
    metadata: PageMetadata;
    onClick?: () => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({ metadata, onClick }) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        console.error('Ошибка загрузки изображения:', metadata.image);
        (e.target as HTMLImageElement).src = getPlaceholderImage();
    };

    return (
        <div
            className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm"
            onClick={onClick}
        >
            {metadata.image ? (
                <img
                    src={metadata.image}
                    className="w-full h-32 object-cover bg-slate-100"
                    alt="Preview"
                    onError={handleImageError}
                />
            ) : (
                <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-400 text-xs">Нет изображения</span>
                </div>
            )}
            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <img src={metadata.favicon} className="w-4 h-4" alt="ico" />
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        {metadata.url}
                    </span>
                </div>
                <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                    {metadata.title}
                </h3>
            </div>
        </div>
    );
};

export default PreviewCard;
