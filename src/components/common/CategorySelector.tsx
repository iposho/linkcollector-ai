import React, { useState } from 'react';
import { FolderOpen, Plus, Check } from 'lucide-react';

interface CategorySelectorProps {
    category: string;
    categories: string[];
    onCategoryChange: (category: string) => void;
    onAddCategory: (category: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    category,
    categories,
    onCategoryChange,
    onAddCategory
}) => {
    const [showNewInput, setShowNewInput] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            onAddCategory(newCategory.trim());
            setNewCategory('');
            setShowNewInput(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newCategory.trim()) {
            handleAddCategory();
        } else if (e.key === 'Escape') {
            setShowNewInput(false);
            setNewCategory('');
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                <FolderOpen className="w-3 h-3" /> Категория
            </label>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <select
                        value={category}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm appearance-none"
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <button
                    onClick={() => setShowNewInput(!showNewInput)}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                    title="Добавить категорию"
                    aria-label="Добавить новую категорию"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {showNewInput && (
                <div className="relative animate-in fade-in slide-in-from-top-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Название новой категории (Enter для добавления, Esc для отмены)..."
                        className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <button
                        onClick={handleAddCategory}
                        className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Добавить"
                        aria-label="Подтвердить добавление категории"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CategorySelector;
