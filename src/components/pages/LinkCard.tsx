import React from 'react';
import { Copy as CopyIcon, ExternalLink, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { SavedLink } from '../../../types';

export type ListDensity = 'comfortable' | 'compact';

interface LinkCardProps {
    link: SavedLink;
    onEdit: () => void;
    onDelete: () => void;
    onCopy?: (url: string) => void;
    onOpen?: (url: string) => void;
    density?: ListDensity;
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, onEdit, onDelete, onCopy, onOpen, density = 'comfortable' }) => {
    const compact = density === 'compact';
    return (
        <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen?.(link.url)}
            className={`block bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${compact ? 'p-3' : 'p-4'}`}
            aria-label={`Открыть: ${link.title}`}
        >
            <div className="flex items-start gap-3">
                {link.image && (
                    <img
                        src={link.image}
                        alt={link.title}
                        width={64}
                        height={64}
                        loading="lazy"
                        className={`object-cover rounded-lg flex-shrink-0 ${compact ? 'w-10 h-10 rounded-md' : 'w-16 h-16'}`}
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-bold text-slate-800 flex-1 ${compact ? 'text-[13px] leading-snug line-clamp-1' : 'text-sm line-clamp-2'}`}>
                            {link.title}
                        </h3>
                        <div className={`flex gap-1 flex-shrink-0 justify-end ${compact ? 'min-w-[60px]' : 'min-w-[72px]'}`}>
                            {onCopy && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCopy(link.url);
                                    }}
                                    className={`flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
                                    title="Копировать ссылку"
                                    aria-label="Копировать ссылку"
                                >
                                    <CopyIcon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-600`} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className={`flex items-center justify-center hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
                                title="Редактировать"
                                aria-label="Редактировать ссылку"
                            >
                                <SettingsIcon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-indigo-600`} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className={`flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
                                title="Удалить"
                                aria-label="Удалить ссылку"
                            >
                                <Trash2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-600`} />
                            </button>
                        </div>
                    </div>

                    <p className={`text-slate-400 font-mono truncate mb-2 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                        {link.url}
                    </p>

                    {!compact && link.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {link.description}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                            {link.category}
                        </span>
                        {link.tags.slice(0, compact ? 2 : 3).map((tag, idx) => (
                            <span key={idx} className={`px-2 py-0.5 bg-slate-100 text-slate-600 rounded ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                                #{tag}
                            </span>
                        ))}
                        {link.tags.length > (compact ? 2 : 3) && (
                            <span className={`text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>+{link.tags.length - (compact ? 2 : 3)}</span>
                        )}
                    </div>

                    {!compact && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1 text-indigo-600">
                                <ExternalLink className="w-3 h-3" />
                                <span>Открыть страницу</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                                {new Date(link.date).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};

export default LinkCard;
