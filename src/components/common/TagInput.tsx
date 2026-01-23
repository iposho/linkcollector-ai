import React, { useState } from 'react';
import { Tag, Trash2, Plus } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    onTagsChange,
    placeholder = 'Добавить тег (Enter)...'
}) => {
    const [newTag, setNewTag] = useState('');

    const handleAddTag = () => {
        if (newTag.trim()) {
            onTagsChange([...new Set([...tags, newTag.trim()])]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                <Tag className="w-3 h-3" /> Теги
            </label>

            {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100 flex items-center gap-1.5 animate-in zoom-in-90"
                        >
                            #{tag.toUpperCase()}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-red-500 transition-colors"
                                aria-label={`Удалить тег ${tag}`}
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-[10px] text-slate-400 italic mb-2 px-1">
                    Добавьте теги для быстрого поиска
                </p>
            )}

            <div className="relative">
                <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Plus className="absolute right-4 top-3.5 w-4 h-4 text-slate-300" />
            </div>
        </div>
    );
};

export default TagInput;
