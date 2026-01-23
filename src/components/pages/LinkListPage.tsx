import React, { useState, useEffect, useMemo, useCallback, forwardRef } from 'react';
import { List, RowComponentProps } from 'react-window';
import { Search, FolderOpen, RefreshCcw, ArrowUpDown } from 'lucide-react';
import { SavedLink } from '../../../types';
import { Header, Button, Modal } from '../common';
import { LinkCard } from './LinkCard';
import { LinkListSkeleton } from './LinkCardSkeleton';

interface LinkListPageProps {
    links: SavedLink[];
    loading: boolean;
    onEdit: (link: SavedLink) => void;
    onDelete: (url: string) => Promise<void>;
    onRefresh: () => void;
    onBack: () => void;
}

type SortOption = 'newest' | 'oldest' | 'title';

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;

// Estimated height of each link card (including gap)
const ITEM_HEIGHT = 140;

// Row props passed through react-window
interface RowData {
    links: SavedLink[];
    onEdit: (link: SavedLink) => void;
    onDeleteClick: (url: string) => void;
}

// Row component for virtualized list
const VirtualRow = forwardRef<HTMLDivElement, RowComponentProps<RowData>>(
    ({ index, style, ...rowProps }, ref) => {
        // Access our custom props - they're spread into the component
        const data = (rowProps as any).data as RowData | undefined;
        if (!data) return null;

        const link = data.links[index];
        if (!link) return null;

        return (
            <div ref={ref} style={{ ...style, paddingRight: 16, paddingLeft: 16, paddingBottom: 12 }}>
                <LinkCard
                    link={link}
                    onEdit={() => data.onEdit(link)}
                    onDelete={() => data.onDeleteClick(link.url)}
                />
            </div>
        );
    }
);
VirtualRow.displayName = 'VirtualRow';

export const LinkListPage: React.FC<LinkListPageProps> = ({
    links,
    loading,
    onEdit,
    onDelete,
    onRefresh,
    onBack
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; url: string | null }>({ isOpen: false, url: null });
    const [deleting, setDeleting] = useState(false);

    // Debounced search
    const [debouncedQuery, setDebouncedQuery] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredAndSortedLinks = useMemo(() => {
        let result = links;

        // Filter
        if (debouncedQuery) {
            const query = debouncedQuery.toLowerCase();
            result = result.filter(link =>
                link.title.toLowerCase().includes(query) ||
                link.description.toLowerCase().includes(query) ||
                link.url.toLowerCase().includes(query) ||
                link.category.toLowerCase().includes(query) ||
                link.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'oldest':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'title':
                    return a.title.localeCompare(b.title, 'ru');
                default:
                    return 0;
            }
        });

        return result;
    }, [links, debouncedQuery, sortBy]);

    const handleDeleteClick = useCallback((url: string) => {
        setDeleteModal({ isOpen: true, url });
    }, []);

    const confirmDelete = async () => {
        if (deleteModal.url) {
            setDeleting(true);
            try {
                await onDelete(deleteModal.url);
            } finally {
                setDeleting(false);
                setDeleteModal({ isOpen: false, url: null });
            }
        }
    };

    // Check if virtualization should be enabled
    const useVirtualization = filteredAndSortedLinks.length > VIRTUALIZATION_THRESHOLD;

    // Calculate available height for the list (600px total - header ~56px - search ~90px - footer ~68px)
    const listHeight = 386;

    return (
        <div className="w-[450px] min-h-[600px] max-h-[600px] bg-white flex flex-col overflow-hidden border border-slate-100">
            <Header
                title="Мои ссылки"
                onBack={onBack}
                rightContent={
                    <button
                        onClick={onRefresh}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Обновить"
                        aria-label="Обновить список"
                    >
                        <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                }
            />

            {/* Search and Sort Bar */}
            <div className="p-4 bg-slate-50 border-b space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по ссылкам..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Сортировка"
                    >
                        <option value="newest">Сначала новые</option>
                        <option value="oldest">Сначала старые</option>
                        <option value="title">По названию</option>
                    </select>
                    <span className="text-xs text-slate-400">
                        {filteredAndSortedLinks.length} из {links.length}
                        {useVirtualization && ' ⚡'}
                    </span>
                </div>
            </div>

            {/* Links List */}
            <main className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="p-4 space-y-3 overflow-y-auto h-full">
                        <LinkListSkeleton count={4} />
                    </div>
                ) : filteredAndSortedLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-bold text-center">
                            {searchQuery ? 'Ничего не найдено' : 'Нет сохраненных ссылок'}
                        </p>
                    </div>
                ) : useVirtualization ? (
                    // Virtualized list for large datasets (>50 items)
                    <List
                        rowCount={filteredAndSortedLinks.length}
                        rowHeight={ITEM_HEIGHT}
                        defaultHeight={listHeight}
                        rowComponent={VirtualRow}
                        rowProps={{
                            data: {
                                links: filteredAndSortedLinks,
                                onEdit,
                                onDeleteClick: handleDeleteClick
                            }
                        }}
                        className="scrollbar-thin"
                    />
                ) : (
                    // Regular list for small datasets
                    <div className="p-4 space-y-3 overflow-y-auto h-full">
                        {filteredAndSortedLinks.map((link) => (
                            <LinkCard
                                key={link.url}
                                link={link}
                                onEdit={() => onEdit(link)}
                                onDelete={() => handleDeleteClick(link.url)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <footer className="p-4 border-t bg-white">
                <Button onClick={onBack} className="w-full">
                    Вернуться к сохранению
                </Button>
            </footer>

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, url: null })}
                onConfirm={confirmDelete}
                title="Удалить ссылку?"
                description="Это действие нельзя отменить. Ссылка будет удалена из Google Sheets."
                confirmText="Удалить"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
};

export default LinkListPage;
