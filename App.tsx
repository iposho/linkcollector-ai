import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Database,
  X,
  Info,
  Trash2
} from 'lucide-react';
import { PageMetadata, AppStatus, SavedLink, AppSettings } from './types';
import { analyzePageContent as cerebrasAnalyze } from './src/services/cerebrasService'; // deprecated: скрыт из UI, оставлен для совместимости
import { analyzePageContent as openRouterAnalyze } from './src/services/openRouterService';
import { analyzePageContent as geminiAnalyze } from './src/services/geminiService';
import { analyzePageContent as groqAnalyze } from './src/services/groqService';
import { analyzePageContent as sambaAnalyze } from './src/services/sambanovaService';

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
import { useCapture, type CaptureOptions } from './src/hooks/useCapture';

// Utils
import { isUrlSaved, initFromChromeStorage } from './src/utils/storage';
import { toSavePayload, type ImportableLink } from './src/utils/importUtils';

/** Короткое имя модели для отображения «Модель X анализирует...» */
function getAnalyzingModelLabel(settings: AppSettings): string {
  const p = settings.aiProvider;
  const m = (s: string | undefined) => s || '';
  if (p === 'google_gemini') {
    const id = m(settings.geminiModel);
    if (id === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
    if (id === 'gemini-2.5-flash-lite') return 'Gemini 2.5 Flash-Lite';
    if (id === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
    return id || 'Gemini';
  }
  if (p === 'groq') {
    const id = m(settings.groqModel);
    const labels: Record<string, string> = {
      'llama-3.3-70b-versatile': 'Llama 3.3 70B',
      'llama-3.1-8b-instant': 'Llama 3.1 8B',
      'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B',
      'openai/gpt-oss-120b': 'GPT-OSS 120B',
      'openai/gpt-oss-20b': 'GPT-OSS 20B',
      'openai/gpt-oss-safeguard-20b': 'GPT-OSS Safeguard 20B',
      'qwen/qwen3-32b': 'Qwen3 32B',
      'moonshotai/kimi-k2-instruct': 'Kimi K2',
      'moonshotai/kimi-k2-instruct-0905': 'Kimi K2 (0905)',
      'groq/compound': 'Groq Compound',
      'groq/compound-mini': 'Groq Compound Mini',
      'allam-2-7b': 'Allam 2 7B',
      'meta-llama/llama-prompt-guard-2-86m': 'Llama Prompt Guard 86M',
      'meta-llama/llama-prompt-guard-2-22m': 'Llama Prompt Guard 22M',
      'canopylabs/orpheus-v1-english': 'Orpheus English',
      'canopylabs/orpheus-arabic-saudi': 'Orpheus Arabic',
    };
    return labels[id] || id.split('/').pop()?.replace(/-/g, ' ') || id;
  }
  if (p === 'openrouter' || p === 'cerebras') {
    const id = m(settings.openRouterModel);
    const labels: Record<string, string> = {
      'stepfun/step-3.5-flash:free': 'Step 3.5 Flash',
      'openrouter/hunter-alpha': 'Hunter Alpha',
      'arcee-ai/trinity-large-preview:free': 'Trinity Large',
      'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 3 Super',
      'openrouter/healer-alpha': 'Healer Alpha',
      'z-ai/glm-4.5-air:free': 'GLM 4.5 Air',
      'nvidia/nemotron-3-nano-30b-a3b:free': 'Nemotron 3 Nano 30B',
      'arcee-ai/trinity-mini:free': 'Trinity Mini',
      'nvidia/nemotron-nano-12b-v2-vl:free': 'Nemotron Nano 12B VL',
      'nvidia/nemotron-nano-9b-v2:free': 'Nemotron Nano 9B V2',
      'qwen/qwen3-coder:free': 'Qwen3 Coder 480B',
      'qwen/qwen3-next-80b-a3b-instruct:free': 'Qwen3 Next 80B',
      'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B',
      'openai/gpt-oss-120b:free': 'gpt-oss-120b',
      'liquid/lfm-2.5-1.2b-thinking:free': 'LFM2.5-1.2B',
      'mistralai/mistral-small-3.1-24b-instruct:free': 'Mistral Small 3.1 24B',
    };
    return labels[id] || id.split('/').pop()?.replace(/:free$/, '').replace(/-/g, ' ') || id;
  }
  if (p === 'sambanova') {
    const id = m(settings.sambanovaModel);
    const labels: Record<string, string> = {
      'DeepSeek-R1-0528': 'DeepSeek R1-0528',
      'DeepSeek-R1-Distill-Llama-70B': 'DeepSeek R1 Distill Llama 70B',
      'DeepSeek-V3-0324': 'DeepSeek V3-0324',
      'Deepseek-V3.1': 'DeepSeek V3.1',
      'Meta-Llama-3.3-70B-Instruct': 'Llama 3.3 70B',
      'Meta-Llama-3.1-8B-Instruct': 'Llama 3.1 8B',
    };
    return labels[id] || id || 'SambaNova';
  }
  return 'ИИ';
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [category, setCategory] = useState<string>("Прочее");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [reAnalyzing, setReAnalyzing] = useState(false);

  // Hooks
  const { settings, setSettings, saveSettings, categories, addCategory, clearCache, syncCategories } = useSettings();
  const { savedLinks, loading: linksLoading, error: linksError, loadLinks, saveLink, updateLink, deleteLink, setError: setLinksError } = useLinks({
    scriptUrl: settings.scriptUrl,
    storageProvider: settings.storageProvider,
    notionToken: settings.notionToken,
    notionDatabaseId: settings.notionDatabaseId,
  });
  const { captureTab, loading: captureLoading, error: captureError, setError: setCaptureError } = useCapture();

  // Combined error
  const error = linksError || captureError;
  const setError = (err: string | null) => {
    setLinksError(err);
    setCaptureError(err);
  };

  // Capture current tab (or context-menu tab/link) on mount
  const handleCapture = useCallback(async (options?: CaptureOptions) => {
    setStatus(AppStatus.EXTRACTING);
    setError(null);

    const extracted = await captureTab(options);
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
      try {
        let aiData;
        if (settings.aiProvider === 'google_gemini') {
          aiData = await geminiAnalyze(extracted, settings.geminiApiKey, categories, settings.geminiModel);
        } else if (settings.aiProvider === 'groq') {
          aiData = await groqAnalyze(extracted, settings.groqApiKey, categories, settings.groqModel);
        } else if (settings.aiProvider === 'openrouter') {
          aiData = await openRouterAnalyze(extracted, settings.openRouterApiKey, categories, settings.openRouterModel);
        } else if (settings.aiProvider === 'sambanova') {
          aiData = await sambaAnalyze(extracted, settings.sambanovaApiKey, categories, settings.sambanovaModel);
        } else if (settings.aiProvider === 'cerebras') {
          if (settings.cerebrasApiKey) {
            aiData = await cerebrasAnalyze(extracted, settings.cerebrasApiKey, categories, settings.cerebrasModel);
          } else {
            aiData = await openRouterAnalyze(extracted, settings.openRouterApiKey, categories, settings.openRouterModel);
          }
        } else {
          aiData = await cerebrasAnalyze(extracted, settings.cerebrasApiKey, categories, settings.cerebrasModel);
        }
        setCategory(aiData.category);
        setTags(aiData.tags);
        setNotes(aiData.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка ИИ-анализа');
        setStatus(AppStatus.IDLE);
        return;
      }
    }

    setStatus(isAlreadySaved ? AppStatus.ALREADY_EXISTS : AppStatus.IDLE);
  }, [captureTab, settings.autoAiAnalysis, settings.cerebrasApiKey, settings.cerebrasModel, settings.geminiApiKey, settings.geminiModel, settings.groqApiKey, settings.groqModel, settings.openRouterApiKey, settings.openRouterModel, settings.sambanovaApiKey, settings.sambanovaModel, settings.aiProvider, categories]);

  const handleReAnalyze = useCallback(async () => {
    if (!metadata) return;
    const hasAi =
      (settings.aiProvider === 'google_gemini' && settings.geminiApiKey) ||
      (settings.aiProvider === 'groq' && settings.groqApiKey) ||
      (settings.aiProvider === 'openrouter' && settings.openRouterApiKey) ||
      (settings.aiProvider === 'sambanova' && settings.sambanovaApiKey) ||
      (settings.aiProvider === 'cerebras' && (settings.openRouterApiKey || settings.cerebrasApiKey));
    if (!hasAi) {
      setError('Укажите API ключ ИИ в настройках');
      return;
    }
    setReAnalyzing(true);
    setError(null);
    try {
      let aiData;
      if (settings.aiProvider === 'google_gemini') {
        aiData = await geminiAnalyze(metadata, settings.geminiApiKey, categories, settings.geminiModel);
      } else if (settings.aiProvider === 'groq') {
        aiData = await groqAnalyze(metadata, settings.groqApiKey, categories, settings.groqModel);
      } else if (settings.aiProvider === 'openrouter') {
        aiData = await openRouterAnalyze(metadata, settings.openRouterApiKey, categories, settings.openRouterModel);
      } else if (settings.aiProvider === 'sambanova') {
        aiData = await sambaAnalyze(metadata, settings.sambanovaApiKey, categories, settings.sambanovaModel);
      } else if (settings.aiProvider === 'cerebras') {
        if (settings.cerebrasApiKey) {
          aiData = await cerebrasAnalyze(metadata, settings.cerebrasApiKey, categories, settings.cerebrasModel);
        } else {
          aiData = await openRouterAnalyze(metadata, settings.openRouterApiKey, categories, settings.openRouterModel);
        }
      } else {
        aiData = await cerebrasAnalyze(metadata, settings.cerebrasApiKey, categories, settings.cerebrasModel);
      }
      setCategory(aiData.category);
      setTags(aiData.tags);
      setNotes(aiData.summary);
    } catch (err: any) {
      setError(err?.message || 'Ошибка ИИ-анализа');
    } finally {
      setReAnalyzing(false);
    }
  }, [metadata, settings, categories]);

  useEffect(() => {
    const runCapture = (contextOptions?: CaptureOptions) => {
      handleCapture(contextOptions);
      loadLinks().then(links => {
        if (links) syncCategories(links);
      });
    };

    const ch = typeof globalThis !== 'undefined' && (globalThis as any).chrome;
    const afterSync = () => {
      if (ch?.storage?.session) {
        ch.storage.session.get('linkcollector_context_save', (data: { linkcollector_context_save?: { tabId: number; linkUrl?: string | null } }) => {
          const p = data?.linkcollector_context_save;
          if (p?.tabId) {
            ch.storage.session.remove('linkcollector_context_save');
            runCapture({ tabId: p.tabId, linkUrl: p.linkUrl ?? undefined });
          } else {
            runCapture();
          }
        });
      } else {
        runCapture();
      }
    };

    initFromChromeStorage(afterSync);
  }, []);

  // Handlers
  const handleSave = async () => {
    const isGoogleSheets = settings.storageProvider === 'google_sheets';
    const isNotion = settings.storageProvider === 'notion';

    const missingConfig = isGoogleSheets
      ? !settings.scriptUrl
      : isNotion
        ? (!settings.notionToken || !settings.notionDatabaseId)
        : true;

    if (!metadata || missingConfig) {
      if (missingConfig) {
        setError(isNotion
          ? 'Укажите Notion Token и Database ID в настройках'
          : 'Укажите Script URL в настройках'
        );
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
      setError(err.message || "Ошибка при сохранении ссылки");
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

  const handleRemoveFromSaved = async () => {
    if (metadata) {
      try {
        setStatus(AppStatus.SAVING);
        await deleteLink(metadata.url);
        setStatus(AppStatus.IDLE);
      } catch (err: any) {
        setError(err.message || 'Ошибка удаления');
        setStatus(AppStatus.IDLE);
      } finally {
        setShowRemoveModal(false);
      }
    }
  };

  const handleAddCategory = (name: string) => {
    const added = addCategory(name);
    if (added) {
      setCategory(added);
    }
  };

  const handleImport = useCallback(
    async (links: ImportableLink[]) => {
      const existingUrls = new Set(savedLinks.map((l) => l.url));
      for (const link of links) {
        if (existingUrls.has(link.url)) continue;
        const payload = toSavePayload(link);
        await saveLink(payload);
        existingUrls.add(link.url);
      }
    },
    [saveLink, savedLinks]
  );

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
          window.close();
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
        onImport={handleImport}
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
        onReAnalyze={handleReAnalyze}
        reAnalyzing={reAnalyzing}
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
              {status === AppStatus.EXTRACTING ? 'Захватываем страницу...' : `${getAnalyzingModelLabel(settings)} анализирует...`}
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

            {error && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 mb-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Проблема с ИИ-анализом</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {error}
                  </p>
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
              onReAnalyze={handleReAnalyze}
              reAnalyzing={reAnalyzing}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold text-center px-10">
              {error || "Не удалось захватить данные страницы"}
            </p>
            <Button onClick={() => handleCapture()} className="mt-5" size="sm">
              Обновить
            </Button>
          </div>
        )}
      </main>

      <footer className="p-5 border-t bg-white flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!metadata || status === AppStatus.SAVING || (settings.storageProvider === 'google_sheets' && !settings.scriptUrl) || (settings.storageProvider === 'notion' && (!settings.notionToken || !settings.notionDatabaseId))}
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
