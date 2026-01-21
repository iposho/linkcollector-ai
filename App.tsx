
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Tag, 
  FolderOpen, 
  ExternalLink, 
  CheckCircle2, 
  Loader2, 
  Search,
  Save,
  Trash2,
  AlertCircle,
  Settings as SettingsIcon,
  ChevronLeft,
  Info,
  Globe,
  Database,
  Copy,
  Check
} from 'lucide-react';
import { PageMetadata, AppStatus, AppSettings } from './types';
import { analyzePageContent } from './services/cerebrasService';

declare const chrome: any;

const DEFAULT_CATEGORIES = ["Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [category, setCategory] = useState<string>("Прочее");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => ({
    spreadsheetId: localStorage.getItem('gs_id') || '',
    scriptUrl: localStorage.getItem('gs_script_url') || '',
    autoAiAnalysis: localStorage.getItem('auto_ai') !== 'false',
    folderName: localStorage.getItem('folder_name') || 'Reading List'
  }));

  const addCategory = (categoryName: string) => {
    if (categoryName.trim() && !categories.includes(categoryName.trim())) {
      const updated = [...categories, categoryName.trim()];
      setCategories(updated);
      localStorage.setItem('categories', JSON.stringify(updated));
      setCategory(categoryName.trim());
      setNewCategory("");
    }
  };

  const getSavedUrls = (): string[] => {
    const saved = localStorage.getItem('saved_links');
    return saved ? JSON.parse(saved) : [];
  };

  const removeSavedUrl = (url: string) => {
    const savedUrls = getSavedUrls();
    const updatedUrls = savedUrls.filter(u => u !== url);
    localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
    setStatus(AppStatus.IDLE);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const imageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      // Если уже base64, возвращаем как есть
      if (imageUrl.startsWith('data:')) {
        return imageUrl;
      }
      
      // Пропускаем placeholder изображения
      if (imageUrl.includes('picsum.photos')) {
        return imageUrl; // Возвращаем URL для placeholder
      }

      // Пробуем загрузить через fetch (в расширении Chrome это должно работать благодаря host_permissions)
      let response: Response;
      try {
        response = await fetch(imageUrl);
      } catch (fetchError) {
        // Если fetch не работает, пробуем через XHR
        console.warn('Fetch failed, trying XHR:', fetchError);
        try {
          const blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', imageUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
              if (xhr.status === 200) {
                resolve(xhr.response);
              } else {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.send();
          });
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(blob);
          });
        } catch (xhrError) {
          console.warn('XHR also failed:', xhrError);
          return imageUrl; // Возвращаем оригинальный URL
        }
      }

      // Проверяем статус ответа
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Проверяем, что blob не пустой
      if (blob.size === 0) {
        throw new Error('Empty blob');
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      // В случае ошибки возвращаем оригинальный URL
      return imageUrl;
    }
  };

  const captureCurrentTab = useCallback(async () => {
    setStatus(AppStatus.EXTRACTING);
    setError(null);

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Пытаемся получить активную вкладку из текущего окна
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Если не нашли, ищем последнюю активную вкладку из всех окон
        if (tabs.length === 0) {
          tabs = await chrome.tabs.query({ active: true });
        }
        
        // Если все еще нет, берем последнюю вкладку
        if (tabs.length === 0) {
          tabs = await chrome.tabs.query({});
          tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        }
        
        const tab = tabs[0];
        
        if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
          throw new Error("Невозможно извлечь данные с этой страницы");
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const getMeta = (name: string) => 
              document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
              document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || "";
            
            return {
              url: window.location.href,
              title: document.title,
              description: getMeta('og:description') || getMeta('description'),
              image: getMeta('og:image') || `https://picsum.photos/seed/${Math.random()}/800/400`,
              favicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=128`
            };
          }
        });

        const extracted = results[0].result as PageMetadata;
        setMetadata(extracted);

        const isAlreadySaved = getSavedUrls().includes(extracted.url);
        if (isAlreadySaved) {
          setStatus(AppStatus.ALREADY_EXISTS);
        }

        if (settings.autoAiAnalysis) {
          setStatus(isAlreadySaved ? AppStatus.ALREADY_EXISTS : AppStatus.ANALYZING);
          const aiData = await analyzePageContent(extracted);
          setCategory(aiData.category);
          setTags(aiData.tags);
          setNotes(aiData.summary);
        }
        
        if (!isAlreadySaved || !settings.autoAiAnalysis) {
          setStatus(isAlreadySaved ? AppStatus.ALREADY_EXISTS : AppStatus.IDLE);
        } else {
          setStatus(AppStatus.ALREADY_EXISTS);
        }
      } else {
        // Mock для разработки
        setTimeout(() => {
          setMetadata({
            url: "https://example.com",
            title: "Пример страницы",
            description: "Это демонстрационное описание страницы.",
            image: "https://picsum.photos/seed/1/800/400",
            favicon: "https://www.google.com/favicon.ico"
          });
          setStatus(AppStatus.IDLE);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message);
      setStatus(AppStatus.ERROR);
    }
  }, [settings.autoAiAnalysis]);

  useEffect(() => {
    captureCurrentTab();
  }, [captureCurrentTab]);

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
      // Конвертируем изображение в base64
      let imageBase64 = metadata.image;
      if (metadata.image && !metadata.image.startsWith('data:') && !metadata.image.includes('picsum.photos')) {
        try {
          imageBase64 = await imageToBase64(metadata.image);
        } catch (err) {
          console.warn('Не удалось конвертировать изображение в base64:', err);
          // В случае ошибки используем оригинальный URL
          imageBase64 = metadata.image;
        }
      }

      const response = await fetch(settings.scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Важно для Apps Script Web App
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metadata,
          image: imageBase64, // Отправляем base64 версию
          category,
          tags,
          notes,
          timestamp: new Date().toISOString()
        })
      });

      const savedUrls = getSavedUrls();
      const wasAlreadySaved = savedUrls.includes(metadata.url);
      
      // Удаляем URL если он уже был, чтобы избежать дубликатов, затем добавляем снова
      const updatedUrls = savedUrls.filter(url => url !== metadata.url);
      updatedUrls.push(metadata.url);
      localStorage.setItem('saved_links', JSON.stringify(updatedUrls));
      
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      setError("Ошибка при отправке в Google Sheets");
      setStatus(AppStatus.IDLE);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('gs_id', settings.spreadsheetId);
    localStorage.setItem('gs_script_url', settings.scriptUrl);
    localStorage.setItem('auto_ai', String(settings.autoAiAnalysis));
    localStorage.setItem('folder_name', settings.folderName);
    setStatus(AppStatus.IDLE);
  };

  const clearCache = () => {
    if (confirm('Вы уверены, что хотите очистить весь кэш расширения? Это удалит все сохраненные ссылки, категории и настройки.')) {
      // Очищаем все данные из localStorage
      localStorage.removeItem('saved_links');
      localStorage.removeItem('categories');
      localStorage.removeItem('gs_id');
      localStorage.removeItem('gs_script_url');
      localStorage.removeItem('auto_ai');
      localStorage.removeItem('folder_name');
      
      // Сбрасываем состояние
      setCategories(DEFAULT_CATEGORIES);
      setSettings({
        spreadsheetId: '',
        scriptUrl: '',
        autoAiAnalysis: true,
        folderName: 'Reading List'
      });
      
      alert('Кэш успешно очищен!');
    }
  };

  if (status === AppStatus.SETTINGS) {
    return (
      <div className="w-[450px] bg-white flex flex-col h-auto max-h-[600px]">
        <header className="px-5 py-4 bg-slate-900 text-white flex items-center gap-3">
          <button onClick={() => setStatus(AppStatus.IDLE)} className="p-2 hover:bg-white/10 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold">Настройки</h1>
        </header>
        <div className="p-6 space-y-5 flex-1 bg-slate-50/30 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Google Apps Script URL</label>
            <input 
              type="text"
              value={settings.scriptUrl}
              onChange={(e) => setSettings({...settings, scriptUrl: e.target.value})}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400 italic">Сюда будут отправляться POST-запросы с данными</p>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-bold text-indigo-800">API: Получение списка ссылок</span>
                <p className="text-[11px] text-indigo-600 mt-1">Используйте GET запрос для получения всех сохраненных ссылок</p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 relative">
              <code className="text-[10px] text-green-400 font-mono block whitespace-pre-wrap break-all">
{`fetch('${settings.scriptUrl || 'https://script.google.com/macros/s/.../exec'}')
  .then(res => res.json())
  .then(data => console.log(data.data));`}
              </code>
              <button
                onClick={() => copyToClipboard(`fetch('${settings.scriptUrl || 'https://script.google.com/macros/s/.../exec'}')
  .then(res => res.json())
  .then(data => console.log(data.data));`)}
                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                title="Копировать код"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-indigo-500 mt-2">Ответ: {"{"} success: true, count: number, data: [...] {"}"}</p>
          </div>

          <div className="space-y-2 hidden">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Название вкладки</label>
            <input 
              type="text"
              value={settings.folderName}
              onChange={(e) => setSettings({...settings, folderName: e.target.value})}
              placeholder="Reading List"
              disabled
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm shadow-sm outline-none text-slate-400 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-sm font-bold text-slate-700">ИИ-анализ (Cerebras)</span>
              <p className="text-[11px] text-slate-500">Автоматически подбирать теги</p>
            </div>
            <button 
              onClick={() => setSettings({...settings, autoAiAnalysis: !settings.autoAiAnalysis})}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoAiAnalysis ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoAiAnalysis ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-bold text-red-800">Очистка кэша</span>
                <p className="text-[11px] text-red-600">Удалить все сохраненные данные</p>
              </div>
            </div>
            <button 
              onClick={clearCache}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Очистить кэш
            </button>
          </div>
        </div>
        <footer className="p-5 border-t">
          <button onClick={saveSettings} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg">
            Сохранить
          </button>
        </footer>
      </div>
    );
  }

  if (status === AppStatus.SUCCESS) {
    return (
      <div className="w-[450px] p-10 flex flex-col items-center justify-center bg-white h-auto">
        <div className="bg-green-50 p-6 rounded-full mb-6 border border-green-100">
          <CheckCircle2 className="text-green-500 w-16 h-16" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Готово!</h2>
        <p className="text-slate-500 text-center mt-3">Ссылка улетела в Google Sheets.</p>
        <button 
          onClick={() => { setStatus(AppStatus.IDLE); captureCurrentTab(); }}
          className="mt-10 w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div className="w-[450px] h-auto max-h-[600px] bg-white flex flex-col overflow-hidden border border-slate-100">
      <header className="px-5 py-4 bg-indigo-600 text-white flex justify-between items-center shadow-lg relative z-10">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 opacity-80" />
          <h1 className="font-black text-lg">LinkCollector AI</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStatus(AppStatus.SETTINGS)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

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
                  <p className="text-[10px] text-indigo-600 mt-1 mb-3">Вы можете отредактировать категорию, теги и заметки, затем сохранить обновленную версию, или удалить ссылку из сохраненных.</p>
                  <button
                    onClick={() => {
                      if (metadata && confirm('Вы уверены, что хотите удалить эту ссылку из сохраненных?')) {
                        removeSavedUrl(metadata.url);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить из сохраненных
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <img src={metadata.image} className="w-full h-32 object-cover bg-slate-100" alt="Preview" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <img src={metadata.favicon} className="w-4 h-4" alt="ico" />
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{metadata.url}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">{metadata.title}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                  <FolderOpen className="w-3 h-3" /> Категория
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
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
                  <div className="relative">
                    <input 
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if(e.key === 'Enter' && newCategory.trim()) {
                          addCategory(newCategory);
                        }
                      }}
                      placeholder="Создать новую категорию (Enter)..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => newCategory.trim() && addCategory(newCategory)}
                      className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                  <Tag className="w-3 h-3" /> Теги
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(t => (
                    <span key={t} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100 flex items-center gap-1.5 animate-in zoom-in-90">
                      #{t.toUpperCase()}
                      <button onClick={() => setTags(tags.filter(tag => tag !== t))} className="hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter' && newTag.trim()) {
                        setTags([...new Set([...tags, newTag.trim()])]);
                        setNewTag("");
                      }
                    }}
                    placeholder="Добавить тег (Enter)..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Plus className="absolute right-4 top-3.5 w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                  <Search className="w-3 h-3" /> Описание / Резюме
                </label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[100px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  placeholder="Добавьте свои заметки..."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold text-center px-10">{error || "Не удалось захватить данные страницы"}</p>
            <button onClick={captureCurrentTab} className="mt-5 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Обновить</button>
          </div>
        )}
      </main>

      <footer className="p-5 border-t bg-white flex gap-3">
        <button 
          onClick={handleSave}
          disabled={!metadata || status === AppStatus.SAVING || !settings.scriptUrl}
          className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm rounded-2xl shadow-xl transition-all active:scale-95"
        >
          {status === AppStatus.SAVING ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Database className="w-5 h-5" /> СОХРАНИТЬ</>}
        </button>
        <button 
          onClick={() => metadata && window.open(metadata.url, '_blank')}
          className="px-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-100"
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </footer>

      {error && status !== AppStatus.ERROR && (
        <div className="px-5 py-2 bg-red-600 text-white text-[10px] font-black flex items-center justify-between">
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default App;
