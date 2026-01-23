import React from 'react';
import { Search } from 'lucide-react';
import { PageMetadata } from '../../../types';
import { TagInput, CategorySelector } from '../common';
import { PreviewCard } from './PreviewCard';

interface LinkFormProps {
    metadata: PageMetadata;
    category: string;
    categories: string[];
    tags: string[];
    notes: string;
    onCategoryChange: (category: string) => void;
    onAddCategory: (category: string) => void;
    onTagsChange: (tags: string[]) => void;
    onNotesChange: (notes: string) => void;
}

export const LinkForm: React.FC<LinkFormProps> = ({
    metadata,
    category,
    categories,
    tags,
    notes,
    onCategoryChange,
    onAddCategory,
    onTagsChange,
    onNotesChange
}) => {
    return (
        <>
            <PreviewCard metadata={metadata} />

            <div className="space-y-4">
                <CategorySelector
                    category={category}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    onAddCategory={onAddCategory}
                />

                <TagInput
                    tags={tags}
                    onTagsChange={onTagsChange}
                />

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                        <Search className="w-3 h-3" /> Описание / Резюме
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[100px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                        placeholder="Добавьте свои заметки..."
                    />
                </div>
            </div>
        </>
    );
};

export default LinkForm;
