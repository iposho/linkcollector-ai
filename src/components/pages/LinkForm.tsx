import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { PageMetadata } from '../../../types';
import { TagInput, CategorySelector, Button } from '../common';
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
    onReAnalyze?: () => void;
    reAnalyzing?: boolean;
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
    onNotesChange,
    onReAnalyze,
    reAnalyzing = false
}) => {
    return (
        <>
            <PreviewCard metadata={metadata} />

            {onReAnalyze && (
                <section className="mt-2 mb-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-800">Анализ содержимого</p>
                            <p className="text-[11px] text-slate-500">
                                ИИ помогает подобрать категорию, теги и краткое резюме страницы.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onReAnalyze}
                            disabled={reAnalyzing}
                            loading={reAnalyzing}
                            icon={<Sparkles className="w-3.5 h-3.5" />}
                            className="shrink-0"
                        >
                            {reAnalyzing ? 'Анализ...' : 'Повторить'}
                        </Button>
                    </div>
                </section>
            )}

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
