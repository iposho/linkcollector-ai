import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { PageMetadata, SavedLink } from '../../../types';
import { Header, Button, Modal } from '../common';
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
    editingLink,
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
    const initialStateRef = useRef({
        category,
        tags,
        notes
    });

    const [showLeaveModal, setShowLeaveModal] = useState(false);

    useEffect(() => {
        initialStateRef.current = { category, tags, notes };
        setShowLeaveModal(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingLink.url]);

    const hasUnsavedChanges = useMemo(() => {
        const initial = initialStateRef.current;
        return (
            initial.category !== category ||
            initial.notes !== notes ||
            JSON.stringify(initial.tags) !== JSON.stringify(tags)
        );
    }, [category, notes, tags]);

    const handleBackClick = () => {
        if (hasUnsavedChanges) {
            setShowLeaveModal(true);
            return;
        }
        onBack();
    };

    const handleConfirmLeave = () => {
        setShowLeaveModal(false);
        onBack();
    };

    const pageTitle = 'Редактирование ссылки';

    return (
        <div className="w-[450px] min-h-[600px] max-h-[600px] bg-white flex flex-col overflow-hidden border border-slate-100">
            <Header
                title={pageTitle}
                onBack={handleBackClick}
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

            <footer className="p-4 border-t bg-white">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex gap-2">
                    <Button
                        onClick={onSave}
                        disabled={saving}
                        loading={saving}
                        icon={<Save className="w-5 h-5" />}
                        className="flex-1 shadow-none rounded-xl bg-indigo-600 hover:bg-indigo-700"
                        size="md"
                    >
                        Сохранить изменения
                    </Button>
                </div>
            </footer>

            <Modal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onConfirm={handleConfirmLeave}
                title="Выйти без сохранения?"
                description="Изменения в категории, тегах и заметках не будут сохранены."
                confirmText="Выйти"
                variant="danger"
            />
        </div>
    );
};

export default LinkEditorPage;
