import React from 'react';
import { Copy as CopyIcon, ExternalLink, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { SavedLink } from '../../../types';

interface LinkCardProps {
    link: SavedLink;
    onEdit: () => void;
    onDelete: () => void;
    onCopy?: (url: string) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, onEdit, onDelete, onCopy }) => {
    return (
        <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-shadow transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-sm text-slate-800 line-clamp-2 flex-1">
                            {link.title}
                        </h3>
                        <div className="flex gap-1 flex-shrink-0 min-w-[72px] justify-end">
                            {onCopy && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCopy(link.url);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    title="Копировать ссылку"
                                    aria-label="Копировать ссылку"
                                >
                                    <CopyIcon className="w-4 h-4 text-slate-600" />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                title="Редактировать"
                                aria-label="Редактировать ссылку"
                            >
                                <SettingsIcon className="w-4 h-4 text-indigo-600" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                title="Удалить"
                                aria-label="Удалить ссылку"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono truncate mb-2">
                        {link.url}
                    </p>

                    {link.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {link.description}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                            {link.category}
                        </span>
                        {link.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                                #{tag}
                            </span>
                        ))}
                        {link.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{link.tags.length - 3}</span>
                        )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1 text-indigo-600">
                            <ExternalLink className="w-3 h-3" />
                            <span>Открыть страницу</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                            {new Date(link.date).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
};

export default LinkCard;
