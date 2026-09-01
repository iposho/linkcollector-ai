import React, { useState, useEffect, useMemo, useCallback } from "react";
import { List } from "react-window";
import type { RowComponentProps } from "react-window";
import {
  Search,
  FolderOpen,
  RefreshCcw,
  ArrowUpDown,
  FileJson,
  FileText,
  FileSpreadsheet,
  Upload,
  MoreHorizontal,
  BarChart3,
  Share2,
  Rows3,
  Rows2,
} from "lucide-react";
import { SavedLink } from "../../../types";
import { Header, Button, Modal } from "../common";
import { LinkCard, type ListDensity } from "./LinkCard";
import { LinkListSkeleton } from "./LinkCardSkeleton";
import {
  exportLinksAsJson,
  exportLinksAsMarkdown,
  exportLinksAsCsv,
  linksToMarkdown,
} from "../../utils/exportUtils";
import { parseImportFile, type ImportableLink } from "../../utils/importUtils";
import { markLinkRead, markAllRead } from "../../utils/storage";
import { openSharePage } from "../../utils/shareUtils";
import { StatsModal } from "./StatsModal";

interface LinkListPageProps {
  links: SavedLink[];
  loading: boolean;
  onEdit: (link: SavedLink) => void;
  onDelete: (url: string) => Promise<void>;
  onRefresh: () => void;
  onBack: () => void;
  onImport?: (links: ImportableLink[]) => Promise<void>;
}

type SortOption = "newest" | "oldest" | "title";

const TOAST_DURATION_MS = {
  info: 1800,
  undo: 5200,
  error: 2200,
} as const;

const LIST_STATE_KEY = "linkcollector:list_state:v1";

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;

// Estimated height of each link card (including gap)
const ITEM_HEIGHT = 140;

// Row props passed through react-window
interface RowData {
  links: SavedLink[];
  onEdit: (link: SavedLink) => void;
  onDeleteClick: (url: string) => void;
  onCopy: (url: string) => void;
  onOpen: (url: string) => void;
  density: ListDensity;
}

// Row component for virtualized list
const VirtualRow = ({
  index,
  style,
  links,
  onEdit,
  onDeleteClick,
  onCopy,
  onOpen,
  density,
}: RowComponentProps<RowData>) => {
  const link = links[index];
  if (!link) return null;

  return (
    <div
      style={{ ...style, paddingRight: 16, paddingLeft: 16, paddingBottom: 12 }}
    >
      <LinkCard
        link={link}
        density={density}
        onOpen={onOpen}
        onEdit={() => onEdit(link)}
        onDelete={() => onDeleteClick(link.url)}
        onCopy={onCopy}
      />
    </div>
  );
};

export const LinkListPage: React.FC<LinkListPageProps> = ({
  links,
  loading,
  onEdit,
  onDelete,
  onRefresh,
  onBack,
  onImport,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    url: string | null;
  }>({ isOpen: false, url: null });
  const [deleting, setDeleting] = useState(false);
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    links: ImportableLink[] | null;
    error: string | null;
  }>({ isOpen: false, links: null, error: null });
  const [importing, setImporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [density, setDensity] = useState<ListDensity>(() =>
    window.localStorage.getItem("linkcollector:list_density:v1") === "compact"
      ? "compact"
      : "comfortable",
  );
  const [toast, setToast] = useState<{
    message: string;
    actionText?: string;
    actionKey?: string;
    onAction?: () => void;
  } | null>(null);
  const [hiddenUrls, setHiddenUrls] = useState<Set<string>>(() => new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const categoryMenuRef = React.useRef<HTMLDivElement>(null);
  const deletedRef = React.useRef<Map<string, SavedLink>>(new Map());
  const toastTimeoutRef = React.useRef<number | null>(null);
  const toastRef = React.useRef<typeof toast>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Restore list state (search + sort) between popup opens
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIST_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        searchQuery?: string;
        sortBy?: SortOption;
        category?: string;
      };
      if (typeof parsed.searchQuery === "string")
        setSearchQuery(parsed.searchQuery);
      if (
        parsed.sortBy === "newest" ||
        parsed.sortBy === "oldest" ||
        parsed.sortBy === "title"
      )
        setSortBy(parsed.sortBy);
      if (typeof parsed.category === "string")
        setSelectedCategory(parsed.category);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist list state (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          LIST_STATE_KEY,
          JSON.stringify({ searchQuery, sortBy, category: selectedCategory }),
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchQuery, sortBy, selectedCategory]);

  // Persist density
  useEffect(() => {
    window.localStorage.setItem("linkcollector:list_density:v1", density);
  }, [density]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setExportMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [exportMenuOpen]);

  // Если ссылка снова появилась в данных (импорт/повторное сохранение), не прячем её из-за старого undo-состояния
  useEffect(() => {
    if (hiddenUrls.size === 0) return;
    const existing = new Set(links.map((l) => l.url));
    setHiddenUrls((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const url of next) {
        if (existing.has(url)) {
          next.delete(url);
          deletedRef.current.delete(url);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [links, hiddenUrls.size]);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(e.target as Node)
      )
        setCategoryMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [categoryMenuOpen]);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of links) {
      if (!l.category) continue;
      counts.set(l.category, (counts.get(l.category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [links]);

  const topCategories = useMemo(
    () => allCategories.slice(0, 6),
    [allCategories],
  );
  const otherCategories = useMemo(
    () => allCategories.slice(6),
    [allCategories],
  );

  // Если сохранённый фильтр устарел (категория исчезла из датасета) — сбрасываем на "Все",
  // иначе пользователь увидит пустой список при наличии ссылок.
  useEffect(() => {
    if (selectedCategory === "all") return;
    const selected = selectedCategory.trim().toLowerCase();
    if (!selected) {
      setSelectedCategory("all");
      return;
    }
    const exists = allCategories.some(
      (c) => c.trim().toLowerCase() === selected,
    );
    if (!exists) setSelectedCategory("all");
  }, [allCategories, selectedCategory]);

  const filteredAndSortedLinks = useMemo(() => {
    let result = links.filter((l) => !hiddenUrls.has(l.url));

    // Category chip filter
    if (selectedCategory !== "all") {
      const cat = selectedCategory.toLowerCase();
      result = result.filter((link) => link.category.toLowerCase() === cat);
    }

    // Text search filter
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        (link) =>
          link.title.toLowerCase().includes(query) ||
          link.description.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.category.toLowerCase().includes(query) ||
          link.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "title":
          return a.title.localeCompare(b.title, "ru");
        default:
          return 0;
      }
    });

    return result;
  }, [links, hiddenUrls, selectedCategory, debouncedQuery, sortBy]);

  const handleDeleteClick = useCallback((url: string) => {
    setDeleteModal({ isOpen: true, url });
  }, []);

  const showToast = useCallback(
    (
      message: string,
      opts?: {
        actionText?: string;
        actionKey?: string;
        onAction?: (() => void) | null;
        durationMs?: number;
      },
    ) => {
      // quiet‑режим: если сообщение и экшен не меняются, просто продлеваем таймер без перерендера
      const current = toastRef.current;
      const sameMessage =
        current?.message === message &&
        current?.actionText === opts?.actionText &&
        current?.actionKey === opts?.actionKey;

      if (!sameMessage) {
        setToast({
          message,
          actionText: opts?.actionText,
          actionKey: opts?.actionKey,
          onAction: opts?.onAction ?? undefined,
        });
      }

      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      const d = opts?.durationMs ?? TOAST_DURATION_MS.info;
      toastTimeoutRef.current = window.setTimeout(() => setToast(null), d);
    },
    [],
  );

  const handleCopy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        showToast("Скопировано");
      } catch {
        showToast("Не удалось скопировать", {
          durationMs: TOAST_DURATION_MS.error,
        });
      }
    },
    [showToast],
  );

  const restoreDeleted = useCallback(
    async (url: string) => {
      const link = deletedRef.current.get(url);
      if (!link) return;
      if (!onImport) {
        showToast("Нельзя восстановить без импорта", {
          durationMs: TOAST_DURATION_MS.error,
        });
        return;
      }
      try {
        await onImport([
          {
            url: link.url,
            title: link.title,
            description: link.description,
            category: link.category,
            tags: link.tags,
            notes: link.notes,
            image: link.image,
            icon: link.icon,
            date: link.date,
          },
        ]);
        deletedRef.current.delete(url);
        setHiddenUrls((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
        showToast("Удаление отменено", { durationMs: TOAST_DURATION_MS.info });
        onRefresh();
      } catch (e) {
        showToast("Не удалось восстановить", {
          durationMs: TOAST_DURATION_MS.error,
        });
      }
    },
    [onImport, onRefresh, showToast],
  );

  const confirmDelete = async () => {
    const url = deleteModal.url;
    if (!url) return;

    setDeleteModal({ isOpen: false, url: null });
    const link = links.find((l) => l.url === url);
    if (link) deletedRef.current.set(url, link);
    setHiddenUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });

    // Коммитим удаление сразу (иначе при закрытии popup таймер не успевает отработать)
    setDeleting(true);
    try {
      await onDelete(url);
    } catch (e) {
      setHiddenUrls((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
      deletedRef.current.delete(url);
      showToast("Не удалось удалить", { durationMs: TOAST_DURATION_MS.error });
      setDeleting(false);
      return;
    } finally {
      setDeleting(false);
    }

    showToast("Удалено", {
      actionText: onImport ? "Отменить" : undefined,
      actionKey: onImport ? url : undefined,
      durationMs: TOAST_DURATION_MS.undo,
      onAction: onImport
        ? () => {
            restoreDeleted(url);
          }
        : null,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onImport) return;
    const result = await parseImportFile(file);
    if (result.ok) {
      setImportModal({ isOpen: true, links: result.links, error: null });
      return;
    }
    // Без strict-режима TS не сужает false-ветку дискриминанта — используем in-проверку
    setImportModal({
      isOpen: true,
      links: null,
      error: "error" in result ? result.error : "Ошибка импорта",
    });
  };

  const confirmImport = async () => {
    if (!importModal.links?.length || !onImport) {
      setImportModal({ isOpen: false, links: null, error: null });
      return;
    }
    setImporting(true);
    try {
      await onImport(importModal.links);
      setImportModal({ isOpen: false, links: null, error: null });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось импортировать ссылки";
      console.error("Import links error:", message);
      setImportModal((prev) => ({
        isOpen: true,
        links: prev.links,
        error: message || "Ошибка импорта",
      }));
    } finally {
      setImporting(false);
    }
  };

  // Check if virtualization should be enabled
  const useVirtualization =
    filteredAndSortedLinks.length > VIRTUALIZATION_THRESHOLD;

  // Высота карточки зависит от плотности (для виртуализации)
  const itemHeight = density === "compact" ? 92 : ITEM_HEIGHT;

  // Calculate available height for the list (viewport‑relative, учитывая header, панель поиска и footer)
  const listHeight = 386;

  return (
    <div className="w-[450px] min-h-[600px] max-h-[80vh] bg-white flex flex-col overflow-hidden border border-slate-100 rounded-2xl shadow-lg">
      <Header
        title="Сохранённые ссылки"
        onBack={onBack}
        rightContent={
          <div ref={menuRef} className="flex items-center gap-0.5 relative">
            {onImport && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.html,.htm"
                className="hidden"
                onChange={handleImportFile}
              />
            )}
            <button
              onClick={() =>
                setDensity((d) => (d === "compact" ? "comfortable" : "compact"))
              }
              className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              title={density === "compact" ? "Обычная плотность" : "Компактный вид"}
              aria-label="Переключить плотность списка"
            >
              {density === "compact" ? (
                <Rows2 className="w-5 h-5" />
              ) : (
                <Rows3 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setStatsOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              title="Статистика"
              aria-label="Статистика"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              title="Обновить"
              aria-label="Обновить список"
            >
              <RefreshCcw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExportMenuOpen((v) => !v);
              }}
              className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              title="Импорт и экспорт"
              aria-label="Открыть меню импорта и экспорта"
              aria-expanded={exportMenuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Ещё</span>
            </button>
            {exportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 py-1.5 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg z-50"
                role="menu"
                aria-label="Импорт и экспорт ссылок"
              >
                {onImport && (
                  <div className="pb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleImportClick();
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                      Импорт ссылок
                    </button>
                    <p className="px-3 pb-1 text-[10px] text-slate-400">
                      Импорт JSON / CSV / HTML
                    </p>
                  </div>
                )}
                {onImport && filteredAndSortedLinks.length > 0 && (
                  <div className="my-1 h-px bg-slate-100" />
                )}
                {filteredAndSortedLinks.length > 0 && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        exportLinksAsJson(filteredAndSortedLinks);
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileJson className="w-4 h-4 shrink-0" />
                      Скачать JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportLinksAsMarkdown(filteredAndSortedLinks);
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      Скачать Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportLinksAsCsv(filteredAndSortedLinks);
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      Скачать CSV
                    </button>
                    <div className="my-1 h-px bg-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        openSharePage(filteredAndSortedLinks);
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      Поделиться подборкой
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setExportMenuOpen(false);
                        try {
                          await navigator.clipboard.writeText(
                            linksToMarkdown(filteredAndSortedLinks),
                          );
                          showToast("Markdown скопирован");
                        } catch {
                          showToast("Не удалось скопировать", {
                            durationMs: TOAST_DURATION_MS.error,
                          });
                        }
                      }}
                      className="w-full flex items-center gap-2 py-2 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      Скопировать Markdown
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
            aria-label="Поиск по ссылкам"
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
            {useVirtualization && " ⚡"}
          </span>
        </div>

        {topCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pt-1 scrollbar-thin items-center">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Все
            </button>
            {topCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}

            {otherCategories.length > 0 && (
              <div ref={categoryMenuRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryMenuOpen((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors whitespace-nowrap ${
                    otherCategories.includes(selectedCategory)
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={categoryMenuOpen}
                  aria-label="Выбрать другую категорию"
                >
                  Ещё…
                </button>
                {categoryMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 py-1.5 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-[240px] overflow-auto"
                    role="menu"
                    aria-label="Другие категории"
                  >
                    {otherCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 py-2 px-3 text-left text-xs font-medium hover:bg-slate-50 ${
                          selectedCategory === cat
                            ? "text-indigo-700"
                            : "text-slate-700"
                        }`}
                        role="menuitem"
                      >
                        <span className="truncate">{cat}</span>
                        {selectedCategory === cat && (
                          <span className="text-[10px] font-bold text-indigo-600">
                            Выбрано
                          </span>
                        )}
                      </button>
                    ))}
                    <div className="my-1 h-px bg-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setCategoryMenuOpen(false);
                      }}
                      className="w-full py-2 px-3 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                      role="menuitem"
                    >
                      Сбросить фильтр
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Links List */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            <LinkListSkeleton count={6} />
          </div>
        ) : filteredAndSortedLinks.length === 0 ? (
          searchQuery ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-slate-500">
              <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-bold mb-1">Ничего не найдено</p>
              <p className="text-xs mb-4 max-w-[260px]">
                Попробуйте изменить запрос или поискать по другому слову.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Сбросить поиск
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <FolderOpen className="w-12 h-12 mb-4 text-slate-200" />
              <h2 className="text-sm font-bold text-slate-800 mb-1">
                Здесь появятся ваши ссылки
              </h2>
              <p className="text-xs text-slate-500 mb-4 max-w-[260px]">
                Сохраняйте статьи, инструменты и любые страницы, чтобы вернуться
                к ним позже.
              </p>
              <Button size="sm" onClick={onBack} className="mt-1">
                Добавить первую ссылку
              </Button>
            </div>
          )
        ) : useVirtualization ? (
          // Virtualized list for large datasets (>50 items)
          <List
            rowCount={filteredAndSortedLinks.length}
            rowHeight={itemHeight}
            defaultHeight={listHeight}
            rowComponent={VirtualRow}
            rowProps={{
              links: filteredAndSortedLinks,
              onEdit,
              onDeleteClick: handleDeleteClick,
              onCopy: handleCopy,
              onOpen: markLinkRead,
              density,
            }}
            className="scrollbar-thin"
          />
        ) : (
          // Regular list for small datasets
          <div className="p-4 space-y-3">
            {filteredAndSortedLinks.map((link) => (
              <LinkCard
                key={link.url}
                link={link}
                density={density}
                onOpen={markLinkRead}
                onEdit={() => onEdit(link)}
                onDelete={() => handleDeleteClick(link.url)}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="p-4 border-t bg-white">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex gap-2">
          <Button
            onClick={onBack}
            className="flex-1 shadow-none rounded-xl bg-indigo-600 hover:bg-indigo-700"
            size="md"
          >
            Добавить ссылку
          </Button>
        </div>
      </footer>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, url: null })}
        onConfirm={confirmDelete}
        title="Удалить ссылку?"
        description="Это действие нельзя отменить. Ссылка будет удалена из хранилища."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={importModal.isOpen}
        onClose={() =>
          setImportModal({ isOpen: false, links: null, error: null })
        }
        onConfirm={
          importModal.links && importModal.links.length > 0
            ? confirmImport
            : () => setImportModal({ isOpen: false, links: null, error: null })
        }
        title={importModal.error ? "Ошибка импорта" : "Импорт ссылок"}
        description={
          importModal.error
            ? importModal.error
            : importModal.links
              ? `Найдено ссылок: ${importModal.links.length}. Добавить в хранилище?`
              : ""
        }
        confirmText={
          importModal.links && importModal.links.length > 0
            ? "Импортировать"
            : "OK"
        }
        loading={importing}
      />

      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]"
          aria-live="polite"
        >
          <div className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3">
            <span>{toast.message}</span>
            {toast.actionText && toast.onAction && (
              <button
                type="button"
                onClick={toast.onAction}
                className="text-xs font-black text-white underline underline-offset-4 hover:opacity-90"
              >
                {toast.actionText}
              </button>
            )}
          </div>
        </div>
      )}

      <StatsModal
        isOpen={statsOpen}
        links={links}
        onClose={() => setStatsOpen(false)}
        onMarkAllRead={() => {
          markAllRead(links.map((l) => l.url));
          showToast("Все ссылки отмечены прочитанными");
        }}
      />
    </div>
  );
};

export default LinkListPage;
