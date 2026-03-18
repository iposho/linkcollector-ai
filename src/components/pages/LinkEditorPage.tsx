import React from 'react';
import { Save } from 'lucide-react';
import { PageMetadata, SavedLink } from '../../../types';
import { Header, Button } from '../common';
import { LinkForm } from './LinkForm';

interface LinkEditorPageProps {
    metadata: PageMetadata;
    editingLink: SavedLink;
    category: string;
    categories: string[];
    tags: string[];
    notes: string;
    saving: boolean;
    onCategoryChange: (category: string) => void;
    onAddCategory: (category: string) => void;
    onTagsChange: (tags: string[]) => void;
    onNotesChange: (notes: string) => void;
    onSave: () => void;
    onBack: () => void;
    onReAnalyze?: () => void;
    reAnalyzing?: boolean;
}

export const LinkEditorPage: React.FC<LinkEditorPageProps> = ({
    metadata,
    category,
    categories,
    tags,
    notes,
    saving,
    onCategoryChange,
    onAddCategory,
    onTagsChange,
    onNotesChange,
    onSave,
    onBack,
    onReAnalyze,
    reAnalyzing = false
}) => {
    return (
        <div className="w-[450px] min-h-[600px] max-h-[600px] bg-white flex flex-col overflow-hidden border border-slate-100">
            <Header
                title="Редактирование"
                onBack={onBack}
            />

            <main className="flex-1 p-5 space-y-5 overflow-y-auto bg-slate-50/50">
                <LinkForm
                    metadata={metadata}
                    category={category}
                    categories={categories}
                    tags={tags}
                    notes={notes}
                    onCategoryChange={onCategoryChange}
                    onAddCategory={onAddCategory}
                    onTagsChange={onTagsChange}
                    onNotesChange={onNotesChange}
                    onReAnalyze={onReAnalyze}
                    reAnalyzing={reAnalyzing}
                />
            </main>

            <footer className="p-5 border-t bg-white flex gap-3">
                <Button
                    onClick={onSave}
                    disabled={saving}
                    loading={saving}
                    icon={<Save className="w-5 h-5" />}
                    className="flex-1"
                    size="lg"
                >
                    СОХРАНИТЬ ИЗМЕНЕНИЯ
                </Button>
            </footer>
        </div>
    );
};

export default LinkEditorPage;
