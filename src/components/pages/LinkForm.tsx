import React from 'react';
import { RotateCcw, Search, Sparkles } from 'lucide-react';
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
    aiChangedKeys?: Array<'category' | 'tags' | 'notes'>;
    onUndoAi?: () => void;
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
    reAnalyzing = false,
    aiChangedKeys,
    onUndoAi
}) => {
    const keyLabels: Record<'category' | 'tags' | 'notes', string> = {
        category: 'Категория',
        tags: 'Теги',
        notes: 'Резюме',
    };
    const hasAiChanges = !!aiChangedKeys?.length;

    return (
        <>
            <PreviewCard metadata={metadata} />

            {onReAnalyze && (
                <section className="mt-2 mb-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="text-left min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-800">Анализ содержимого</p>
                                    {hasAiChanges && (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                            Обновлено ИИ
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            ИИ подбирает категорию, теги и резюме по содержимому страницы — вы всегда можете отредактировать их вручную.
                        </p>

                        {hasAiChanges && (
                            <div className="flex flex-wrap gap-1.5">
                                {aiChangedKeys!.map((k) => (
                                    <span
                                        key={k}
                                        className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                                    >
                                        {keyLabels[k]}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                            {!!onUndoAi && hasAiChanges && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={onUndoAi}
                                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="whitespace-nowrap"
                                >
                                    Откатить изменения ИИ
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={onReAnalyze}
                                disabled={reAnalyzing}
                                loading={reAnalyzing}
                                icon={<Sparkles className="w-3.5 h-3.5" />}
                                className="whitespace-nowrap"
                            >
                                {reAnalyzing ? 'Анализ...' : 'Повторить'}
                            </Button>
                        </div>
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
