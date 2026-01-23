import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Database,
  X,
  Info,
  Trash2
} from 'lucide-react';
import { PageMetadata, AppStatus, SavedLink } from './types';
import { analyzePageContent } from './src/services/cerebrasService';

// Components
import { Header, Button, Modal } from './src/components/common';
import {
  LinkForm,
  SuccessScreen,
  SettingsPage,
  LinkListPage,
  LinkEditorPage
} from './src/components/pages';

// Hooks
import { useSettings } from './src/hooks/useSettings';
import { useLinks } from './src/hooks/useLinks';
import { useCapture } from './src/hooks/useCapture';

// Utils
import { isUrlSaved, removeSavedUrl as removeUrlFromStorage } from './src/utils/storage';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [category, setCategory] = useState<string>("Прочее");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Hooks
  const { settings, setSettings, saveSettings, categories, addCategory, clearCache, syncCategories } = useSettings();
  const { savedLinks, loading: linksLoading, error: linksError, loadLinks, saveLink, updateLink, deleteLink, setError: setLinksError } = useLinks({ scriptUrl: settings.scriptUrl });
  const { captureTab, loading: captureLoading, error: captureError, setError: setCaptureError } = useCapture();

  // Combined error
  const error = linksError || captureError;
  const setError = (err: string | null) => {
    setLinksError(err);
    setCaptureError(err);
  };

  // Capture current tab on mount
  const handleCapture = useCallback(async () => {
    setStatus(AppStatus.EXTRACTING);
    setError(null);

    const extracted = await captureTab();
    if (!extracted) {
      setStatus(AppStatus.ERROR);
      setError('Не удалось получить данные вкладки');
      return;
    }

    setMetadata(extracted);
    const isAlreadySaved = isUrlSaved(extracted.url);

    if (isAlreadySaved) {
      setStatus(AppStatus.ALREADY_EXISTS);
    }

    if (settings.autoAiAnalysis) {
      setStatus(isAlreadySaved ? AppStatus.ALREADY_EXISTS : AppStatus.ANALYZING);
      const aiData = await analyzePageContent(extracted, settings.cerebrasApiKey, categories);
      setCategory(aiData.category);
      setTags(aiData.tags);
      setNotes(aiData.summary);
    }

    setStatus(isAlreadySaved ? AppStatus.ALREADY_EXISTS : AppStatus.IDLE);
  }, [captureTab, settings.autoAiAnalysis, settings.cerebrasApiKey, categories]);

  useEffect(() => {
    handleCapture();
    // Load links on mount to sync categories early
    loadLinks().then(links => {
      if (links) syncCategories(links);
    });
  }, []);

  // Handlers
  const handleSave = async () => {
    if (!metadata || !settings.scriptUrl) {
      if (!settings.scriptUrl) {
        setError("Укажите Script URL в настройках");
        setStatus(AppStatus.SETTINGS);
      }
      return;
    }

    setStatus(AppStatus.SAVING);
    try {
      await saveLink({
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        favicon: metadata.favicon,
        category,
        tags,
        notes
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Ошибка при отправке в Google Sheets");
      setStatus(AppStatus.IDLE);
    }
  };

  const handleEdit = (link: SavedLink) => {
    setEditingLink(link);
    setMetadata({
      url: link.url,
      title: link.title,
      description: link.description,
      image: link.image,
      favicon: link.icon
    });
    setCategory(link.category);
    setTags(link.tags);
    setNotes(link.notes);
    setStatus(AppStatus.EDITING);
  };

  const handleUpdate = async () => {
    if (!metadata || !editingLink) return;

    setStatus(AppStatus.SAVING);
    try {
      await updateLink(editingLink.url, {
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        favicon: metadata.favicon,
        category,
        tags,
        notes,
        date: editingLink.date
      });
      setStatus(AppStatus.LIST);
      setEditingLink(null);
      setTimeout(() => loadLinks(), 500);
    } catch (err: any) {
      setError(err.message || "Ошибка при обновлении ссылки");
      setStatus(AppStatus.EDITING);
    }
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    setStatus(AppStatus.IDLE);
  };

  const handleClearCache = () => {
    clearCache();
  };

  const handleOpenList = async () => {
    setStatus(AppStatus.LIST); // Show list screen immediately with skeleton
    loadLinks(); // Load links in background (skeleton will show while loading)
  };

  const handleRemoveFromSaved = () => {
    if (metadata) {
      removeUrlFromStorage(metadata.url);
      setStatus(AppStatus.IDLE);
      setShowRemoveModal(false);
    }
  };

  const handleAddCategory = (name: string) => {
    const added = addCategory(name);
    if (added) {
      setCategory(added);
    }
  };

  // Render based on status
  if (status === AppStatus.SETTINGS) {
    return (
      <SettingsPage
        settings={settings}
        onSettingsChange={setSettings}
        onSave={handleSaveSettings}
        onClearCache={handleClearCache}
        onBack={() => setStatus(AppStatus.IDLE)}
      />
    );
  }

  if (status === AppStatus.SUCCESS) {
    return (
      <SuccessScreen
        onClose={() => {
          setStatus(AppStatus.IDLE);
          handleCapture();
        }}
      />
    );
  }

  if (status === AppStatus.LIST) {
    return (
      <LinkListPage
        links={savedLinks}
        loading={linksLoading}
        onEdit={handleEdit}
        onDelete={deleteLink}
        onRefresh={loadLinks}
        onBack={() => setStatus(AppStatus.IDLE)}
      />
    );
  }

  if (status === AppStatus.EDITING && metadata && editingLink) {
    return (
      <LinkEditorPage
        metadata={metadata}
        editingLink={editingLink}
        category={category}
        categories={categories}
        tags={tags}
        notes={notes}
        saving={false}
        onCategoryChange={setCategory}
        onAddCategory={handleAddCategory}
        onTagsChange={setTags}
        onNotesChange={setNotes}
        onSave={handleUpdate}
        onBack={() => { setStatus(AppStatus.LIST); setEditingLink(null); }}
      />
    );
  }

  // Main view
  return (
    <div className="w-[450px] min-h-[600px] max-h-[600px] bg-white flex flex-col overflow-hidden border border-slate-100">
      <Header
        title="LinkCollector"
        onOpenList={handleOpenList}
        onSettings={() => setStatus(AppStatus.SETTINGS)}
      />

      <main className="flex-1 p-5 space-y-5 overflow-y-auto bg-slate-50/50">
        {status === AppStatus.EXTRACTING || status === AppStatus.ANALYZING ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
              {status === AppStatus.EXTRACTING ? 'Захватываем страницу...' : 'Cerebras анализирует...'}
            </p>
          </div>
        ) : metadata ? (
          <>
            {status === AppStatus.ALREADY_EXISTS && (
              <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 animate-in fade-in zoom-in-95">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Вы уже сохраняли эту ссылку ранее!</p>
                  <p className="text-[10px] text-indigo-600 mt-1 mb-3">
                    Вы можете отредактировать и сохранить обновленную версию, или удалить из сохраненных.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRemoveModal(true)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Удалить из сохраненных
                  </Button>
                </div>
              </div>
            )}

            <LinkForm
              metadata={metadata}
              category={category}
              categories={categories}
              tags={tags}
              notes={notes}
              onCategoryChange={setCategory}
              onAddCategory={handleAddCategory}
              onTagsChange={setTags}
              onNotesChange={setNotes}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold text-center px-10">
              {error || "Не удалось захватить данные страницы"}
            </p>
            <Button onClick={handleCapture} className="mt-5" size="sm">
              Обновить
            </Button>
          </div>
        )}
      </main>

      <footer className="p-5 border-t bg-white flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!metadata || status === AppStatus.SAVING || !settings.scriptUrl}
          loading={status === AppStatus.SAVING}
          icon={<Database className="w-5 h-5" />}
          className="flex-[1.3]"
          size="lg"
        >
          СОХРАНИТЬ
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.close()}
          disabled={status === AppStatus.SAVING}
          icon={<X className="w-5 h-5" />}
          className="flex-1"
          size="lg"
        >
          ОТМЕНИТЬ
        </Button>
      </footer>

      {error && status !== AppStatus.ERROR && (
        <div className="px-5 py-2 bg-red-600 text-white text-[10px] font-black flex items-center justify-between">
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)} aria-label="Закрыть">×</button>
        </div>
      )}

      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={handleRemoveFromSaved}
        title="Удалить из сохраненных?"
        description="Ссылка будет удалена из локального списка сохраненных."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
};

export default App;
