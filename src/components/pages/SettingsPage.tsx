import React, { useState } from 'react';
import { Trash2, Copy, Check, Info, Database, ShieldCheck, ShieldAlert, BookOpen, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { AppSettings, StorageProvider, AiProvider, SavedLink } from '../../../types';
import { Header, Button, Modal } from '../common';
import { validateOpenRouterApiKey } from '../../services/openRouterService';
import { validateCerebrasApiKey } from '../../services/cerebrasService';
import { validateGeminiApiKey } from '../../services/geminiService';
import { validateGroqApiKey } from '../../services/groqService';
import { validateSambaNovaApiKey } from '../../services/sambanovaService';
import { exportLinksAsJson, exportLinksAsCsv, exportLinksAsMarkdown } from '../../utils/exportUtils';
import { validateConnection as validateNotionConnection } from '../../services/notionService';

interface SettingsPageProps {
    settings: AppSettings;
    links: SavedLink[];
    onSettingsChange: (settings: AppSettings) => void;
    onSave: () => void;
    onClearCache: () => void;
    onBack: () => void;
    onHelp?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    settings,
    links,
    onSettingsChange,
    onSave,
    onClearCache,
    onBack,
    onHelp
}) => {
    const [copied, setCopied] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isNotionValidating, setIsNotionValidating] = useState(false);
    const [notionValidationResult, setNotionValidationResult] = useState<{ success: boolean; message: string } | null>(null);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleClearCache = () => {
        setShowClearModal(true);
    };

    const confirmClearCache = () => {
        onClearCache();
        setShowClearModal(false);
    };

    const handleTestConnection = async () => {
        if (settings.aiProvider === 'google_gemini' && !settings.geminiApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ' });
            return;
        }
        if (settings.aiProvider === 'groq' && !settings.groqApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ' });
            return;
        }
        if (settings.aiProvider === 'openrouter' && !settings.openRouterApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ' });
            return;
        }
        if (settings.aiProvider === 'sambanova' && !settings.sambanovaApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ' });
            return;
        }
        if (settings.aiProvider === 'cerebras' && !settings.openRouterApiKey && !settings.cerebrasApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ (OpenRouter или Cerebras)' });
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            let result: { success: boolean; error?: string };
            if (settings.aiProvider === 'openrouter') {
                result = await validateOpenRouterApiKey(settings.openRouterApiKey, settings.openRouterModel);
            } else if (settings.aiProvider === 'sambanova') {
                result = await validateSambaNovaApiKey(settings.sambanovaApiKey, settings.sambanovaModel);
            } else if (settings.aiProvider === 'cerebras') {
                if (settings.cerebrasApiKey) {
                    result = await validateCerebrasApiKey(settings.cerebrasApiKey, settings.cerebrasModel);
                } else {
                    result = await validateOpenRouterApiKey(settings.openRouterApiKey, settings.openRouterModel);
                }
            } else if (settings.aiProvider === 'google_gemini') {
                result = await validateGeminiApiKey(settings.geminiApiKey, settings.geminiModel);
            } else {
                result = await validateGroqApiKey(settings.groqApiKey, settings.groqModel);
            }
            if (result.success) {
                setValidationResult({ success: true, message: 'Соединение установлено!' });
            } else {
                setValidationResult({ success: false, message: result.error || 'Ошибка проверки' });
            }
        } catch (err) {
            setValidationResult({ success: false, message: 'Ошибка сети' });
        } finally {
            setIsValidating(false);
        }
    };

    const handleTestNotionConnection = async () => {
        if (!settings.notionToken || !settings.notionDatabaseId) {
            setNotionValidationResult({ success: false, message: 'Заполните Token и Database ID' });
            return;
        }

        setIsNotionValidating(true);
        setNotionValidationResult(null);

        try {
            const result = await validateNotionConnection(settings.notionToken, settings.notionDatabaseId);
            if (result.success) {
                setNotionValidationResult({ success: true, message: 'Соединение установлено!' });
            } else {
                setNotionValidationResult({ success: false, message: result.error || 'Ошибка проверки' });
            }
        } catch (err) {
            setNotionValidationResult({ success: false, message: 'Ошибка сети' });
        } finally {
            setIsNotionValidating(false);
        }
    };

    const handleProviderChange = (provider: StorageProvider) => {
        onSettingsChange({ ...settings, storageProvider: provider });
        setNotionValidationResult(null);
    };

    const apiCodeExample = `fetch('${settings.scriptUrl || 'https://script.google.com/macros/s/.../exec'}')
  .then(res => res.json())
  .then(data => console.log(data.data));`;

    return (
        <div className="w-[450px] min-h-[600px] max-h-[600px] bg-white flex flex-col overflow-hidden">
            <Header
                title="Настройки"
                onBack={onBack}
                variant="default"
            />

            <div className="p-6 space-y-5 flex-1 bg-slate-50/30 overflow-y-auto">
                {onHelp && (
                    <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div>
                        <p className="text-sm font-black text-slate-900">Нужна помощь?</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Ответы на частые вопросы и быстрый старт.
                        </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={onHelp}>
                        Справка
                    </Button>
                    </div>
                )}

                {/* Storage */}
                <section className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Хранилище ссылок</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Выберите, куда сохранять ссылки и откуда читать список.
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                        <button
                            onClick={() => handleProviderChange('google_sheets')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${settings.storageProvider === 'google_sheets'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Database className="w-3.5 h-3.5" />
                            Google Sheets
                        </button>
                        <button
                            onClick={() => handleProviderChange('notion')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${settings.storageProvider === 'notion'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Notion
                        </button>
                    </div>
                </section>

                {/* Google Sheets Settings */}
                {settings.storageProvider === 'google_sheets' && (
                    <>
                        {/* Script URL Input */}
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900">Google Apps Script URL</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        URL вашего веб‑приложения Apps Script (заканчивается на <span className="font-mono">/exec</span>).
                                    </p>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={settings.scriptUrl}
                                onChange={(e) => onSettingsChange({ ...settings, scriptUrl: e.target.value })}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 italic">
                                Сюда будут отправляться POST-запросы с данными. <a href="https://docs.google.com/spreadsheets/d/18Wr4hs97QaFEC3UN4Tj8-N3DUK2i4epbaFRSeot9uxA/copy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Скопировать шаблон таблицы</a>
                            </p>
                        </div>

                        {/* API Info Block */}
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Database className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm font-bold text-indigo-800">API: Получение списка ссылок</span>
                            </div>
                            <p className="text-[11px] text-indigo-600 mb-3">
                                Используйте GET запрос для получения всех сохраненных ссылок
                            </p>
                            <div className="bg-slate-900 rounded-lg p-3 relative">
                                <code className="text-[10px] text-green-400 font-mono block whitespace-pre-wrap break-all">
                                    {apiCodeExample}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(apiCodeExample)}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                                    title="Копировать код"
                                    aria-label="Копировать код"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-indigo-500 mt-2 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Ответ: {"{"} success: true, count: number, data: [...] {"}"}
                            </p>
                        </div>
                    </>
                )}

                {/* Notion Settings */}
                {settings.storageProvider === 'notion' && (
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div>
                            <h3 className="text-xs font-black text-slate-900">Интеграция Notion</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Токен и Database ID сохраняются локально в браузере.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Notion Integration Token
                            </label>
                            <input
                                type="password"
                                value={settings.notionToken || ''}
                                onChange={(e) => {
                                    onSettingsChange({ ...settings, notionToken: e.target.value });
                                    setNotionValidationResult(null);
                                }}
                                placeholder="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Database ID
                            </label>
                            <input
                                type="text"
                                value={settings.notionDatabaseId || ''}
                                onChange={(e) => {
                                    onSettingsChange({ ...settings, notionDatabaseId: e.target.value });
                                    setNotionValidationResult(null);
                                }}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleTestNotionConnection}
                                loading={isNotionValidating}
                                className="text-[11px] h-9"
                                icon={!isNotionValidating && <ShieldCheck className="w-3.5 h-3.5" />}
                            >
                                Проверить соединение
                            </Button>

                            {notionValidationResult && (
                                <div className={`flex items-center gap-1.5 text-[11px] font-medium animate-in fade-in slide-in-from-left-2 ${notionValidationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {notionValidationResult.success ? (
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                    ) : (
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                    )}
                                    <span className="truncate max-w-[150px]">{notionValidationResult.message}</span>
                                </div>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-400 italic">
                            Создать интеграцию: <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">notion.so/my-integrations</a>
                        </p>

                        {/* Notion Setup Instructions */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-[10px] text-amber-800 font-bold mb-1">Как настроить:</p>
                            <ol className="text-[10px] text-amber-700 space-y-1 list-decimal list-inside">
                                <li>Создайте Internal Integration на <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">notion.so/my-integrations</a></li>
                                <li>Создайте базу данных в Notion с колонками: Title, URL, Description, Category, Tags, Notes, Image, Icon, Date</li>
                                <li>Подключите интеграцию к базе данных (⋯ → Connections)</li>
                                <li>Скопируйте Token и Database ID в поля выше</li>
                            </ol>
                        </div>
                    </div>
                )}

                {/* AI */}
                <section className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">ИИ-анализ</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Автоматически предлагает категорию, теги и резюме страницы.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Включить ИИ-анализ</span>
                            <p className="text-[11px] text-slate-500">Ключи для разных провайдеров сохраняются отдельно</p>
                        </div>
                        <button
                            onClick={() => onSettingsChange({ ...settings, autoAiAnalysis: !settings.autoAiAnalysis })}
                            className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoAiAnalysis ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            role="switch"
                            aria-checked={settings.autoAiAnalysis}
                            aria-label="Включить ИИ-анализ"
                        >
                            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoAiAnalysis ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* AI Provider Settings */}
                    {settings.autoAiAnalysis && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        {/* AI Provider Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Провайдер ИИ
                            </label>
                            <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'openrouter' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${(settings.aiProvider === 'openrouter' || settings.aiProvider === 'cerebras')
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    OpenRouter
                                </button>
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'google_gemini' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${settings.aiProvider === 'google_gemini'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Gemini
                                </button>
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'groq' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${settings.aiProvider === 'groq'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Groq
                                </button>
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'sambanova' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${settings.aiProvider === 'sambanova'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    SambaNova
                                </button>
                            </div>
                        </div>

                        {/* OpenRouter Settings (бесплатные модели) */}
                        {(settings.aiProvider === 'openrouter' || settings.aiProvider === 'cerebras') && (
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        OpenRouter API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.openRouterApiKey || ''}
                                        onChange={(e) => {
                                            onSettingsChange({ ...settings, openRouterApiKey: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="sk-or-v1-..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Модель (бесплатные)
                                    </label>
                                    <select
                                        value={settings.openRouterModel || 'openrouter/free'}
                                        onChange={(e) => onSettingsChange({ ...settings, openRouterModel: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="openrouter/free">Free Models Router (авто)</option>
                                        <option value="z-ai/glm-5.2:free">GLM 5.2</option>
                                        <option value="minimax/minimax-m3:free">MiniMax M3</option>
                                        <option value="google/gemma-4-31b-it:free">Gemma 4 31B</option>
                                        <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra 550B</option>
                                        <option value="nvidia/nemotron-3-super-120b-a12b:free">Nemotron 3 Super 120B</option>
                                        <option value="thinkingmachines/inkling:free">Inkling</option>
                                        <option value="thinkingmachines/inkling-small:free">Inkling Small</option>
                                        <option value="liquid/lfm-2.5-2.6b:free">LFM2.5 2.6B</option>
                                        <option value="nvidia/nemotron-3.5-lightning:free">Nemotron 3.5 Lightning</option>
                                        <option value="poolside/laguna-s-2.1:free">Laguna S 2.1</option>
                                        <option value="minimax/minimax-m2.7:free">MiniMax M2.7</option>
                                        <option value="google/gemma-4-26b-a4b-it:free">Gemma 4 26B A4B</option>
                                        <option value="cohere/north-mini-code:free">North Mini Code</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleTestConnection}
                                        loading={isValidating}
                                        className="text-[11px] h-9"
                                        icon={!isValidating && <ShieldCheck className="w-3.5 h-3.5" />}
                                    >
                                        Проверить соединение
                                    </Button>

                                    {validationResult && (
                                        <div className={`flex items-center gap-1.5 text-[11px] font-medium animate-in fade-in slide-in-from-left-2 ${validationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {validationResult.success ? (
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                            ) : (
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                            )}
                                            <span className="truncate max-w-[150px]">{validationResult.message}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-slate-400 italic">
                                    Ключ: <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">openrouter.ai</a> — только бесплатные модели (:free); лимиты зависят от купленных кредитов: <a href="https://openrouter.ai/settings/limits" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">openrouter.ai/settings/limits</a>
                                </p>
                            </div>
                        )}

                        {/* SambaNova Settings */}
                        {settings.aiProvider === 'sambanova' && (
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        SambaNova API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.sambanovaApiKey || ''}
                                        onChange={(e) => {
                                            onSettingsChange({ ...settings, sambanovaApiKey: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="sn-api-key-..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Модель
                                    </label>
                                    <select
                                        value={settings.sambanovaModel || 'DeepSeek-V3.1'}
                                        onChange={(e) => onSettingsChange({ ...settings, sambanovaModel: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="DeepSeek-V3.1">DeepSeek-V3.1 (RPM 20 / TPD 200k)</option>
                                        <option value="Meta-Llama-3.3-70B-Instruct">Meta-Llama-3.3-70B-Instruct (RPM 20 / TPD 200k)</option>
                                        <option value="gpt-oss-120b">gpt-oss-120b (RPM 20 / TPD 200k)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleTestConnection}
                                        loading={isValidating}
                                        className="text-[11px] h-9"
                                        icon={!isValidating && <ShieldCheck className="w-3.5 h-3.5" />}
                                    >
                                        Проверить соединение
                                    </Button>
                                    {validationResult && (
                                        <div className="flex items-center gap-1 text-xs">
                                            {validationResult.success ? (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <Check className="w-3 h-3" />
                                                    {validationResult.message}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-rose-600">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    {validationResult.message}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-slate-400 italic">
                                    Получить ключ: <a href="https://cloud.sambanova.ai/apis" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">cloud.sambanova.ai</a>
                                </p>
                            </div>
                        )}

                        {/* Google Gemini Settings */}
                        {settings.aiProvider === 'google_gemini' && (
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Google Gemini API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.geminiApiKey || ''}
                                        onChange={(e) => {
                                            onSettingsChange({ ...settings, geminiApiKey: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="AIzaSy..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Модель Gemini
                                    </label>
                                    <select
                                        value={settings.geminiModel || 'gemini-2.5-flash'}
                                        onChange={(e) => onSettingsChange({ ...settings, geminiModel: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={async () => {
                                            if (!settings.geminiApiKey) {
                                                setValidationResult({ success: false, message: 'Сначала введите API ключ' });
                                                return;
                                            }
                                            setIsValidating(true);
                                            setValidationResult(null);
                                            try {
                                                const result = await validateGeminiApiKey(settings.geminiApiKey, settings.geminiModel);
                                                if (result.success) {
                                                    setValidationResult({ success: true, message: 'Соединение установлено!' });
                                                } else {
                                                    setValidationResult({ success: false, message: result.error || 'Ошибка проверки' });
                                                }
                                            } catch (err) {
                                                setValidationResult({ success: false, message: 'Ошибка сети' });
                                            } finally {
                                                setIsValidating(false);
                                            }
                                        }}
                                        loading={isValidating}
                                        className="text-[11px] h-9"
                                        icon={!isValidating && <ShieldCheck className="w-3.5 h-3.5" />}
                                    >
                                        Проверить соединение
                                    </Button>

                                    {validationResult && (
                                        <div className={`flex items-center gap-1.5 text-[11px] font-medium animate-in fade-in slide-in-from-left-2 ${validationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {validationResult.success ? (
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                            ) : (
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                            )}
                                            <span className="truncate max-w-[150px]">{validationResult.message}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-slate-400 italic">
                                    Получить ключ: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">aistudio.google.com</a> (бесплатно)
                                </p>
                            </div>
                        )}

                        {/* Groq Settings */}
                        {settings.aiProvider === 'groq' && (
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Groq API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.groqApiKey || ''}
                                        onChange={(e) => {
                                            onSettingsChange({ ...settings, groqApiKey: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Модель Groq
                                    </label>
                                    <select
                                        value={settings.groqModel || 'openai/gpt-oss-120b'}
                                        onChange={(e) => onSettingsChange({ ...settings, groqModel: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="canopylabs/orpheus-v1-english">Orpheus v1 English (RPM 10 · TPM 1.2K)</option>
                                        <option value="canopylabs/orpheus-arabic-saudi">Orpheus Arabic Saudi (RPM 10 · TPM 1.2K)</option>
                                        <option value="groq/compound">Groq Compound (RPM 30 · TPM 70K)</option>
                                        <option value="groq/compound-mini">Groq Compound Mini (RPM 30 · TPM 70K)</option>
                                        <option value="meta-llama/llama-prompt-guard-2-22m">Llama Prompt Guard 22M (RPM 30 · TPM 15K)</option>
                                        <option value="meta-llama/llama-prompt-guard-2-86m">Llama Prompt Guard 86M (RPM 30 · TPM 15K)</option>
                                        <option value="openai/gpt-oss-120b">GPT-OSS 120B (RPM 30 · TPM 8K)</option>
                                        <option value="openai/gpt-oss-20b">GPT-OSS 20B (RPM 30 · TPM 8K)</option>
                                        <option value="openai/gpt-oss-safeguard-20b">GPT-OSS Safeguard 20B (RPM 30 · TPM 8K)</option>
                                        <option value="qwen/qwen3.6-27b">Qwen3.6 27B (RPM 30 · TPM 8K)</option>
                                        <option value="qwen/qwen3.8-27b">Qwen3.8 27B (RPM 30 · TPM 8K)</option>
                                        <option value="whisper-large-v3">Whisper Large V3 (RPM 20 · ASH 7.2K)</option>
                                        <option value="whisper-large-v3-turbo">Whisper Large V3 Turbo (RPM 20 · ASH 7.2K)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleTestConnection}
                                        loading={isValidating}
                                        className="text-[11px] h-9"
                                        icon={!isValidating && <ShieldCheck className="w-3.5 h-3.5" />}
                                    >
                                        Проверить соединение
                                    </Button>

                                    {validationResult && (
                                        <div className={`flex items-center gap-1.5 text-[11px] font-medium animate-in fade-in slide-in-from-left-2 ${validationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {validationResult.success ? (
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                            ) : (
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                            )}
                                            <span className="truncate max-w-[150px]">{validationResult.message}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-slate-400 italic">
                                    Получить ключ: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.groq.com</a> (бесплатный лимит)
                                </p>
                            </div>
                        )}
                    </div>
                    )}
                </section>


                {/* Export Data */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                    <div className="mb-3">
                        <span className="text-sm font-bold text-slate-900">Экспорт данных</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Скачать все сохранённые ссылки ({links.length}) в файл.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={links.length === 0}
                            onClick={() => exportLinksAsJson(links)}
                            icon={<FileJson className="w-4 h-4" />}
                            className="w-full"
                        >
                            JSON
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={links.length === 0}
                            onClick={() => exportLinksAsCsv(links)}
                            icon={<FileSpreadsheet className="w-4 h-4" />}
                            className="w-full"
                        >
                            CSV
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={links.length === 0}
                            onClick={() => exportLinksAsMarkdown(links)}
                            icon={<FileText className="w-4 h-4" />}
                            className="w-full"
                        >
                            MD
                        </Button>
                    </div>
                </div>

                {/* Clear Cache */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="mb-3">
                        <span className="text-sm font-bold text-red-800">Очистка кэша</span>
                        <p className="text-[11px] text-red-600">
                            Удалит все сохранённые ссылки, категории и настройки (включая API-ключи) из локального хранилища.
                        </p>
                    </div>
                    <Button
                        variant="danger"
                        onClick={handleClearCache}
                        icon={<Trash2 className="w-4 h-4" />}
                        className="w-full"
                    >
                        Очистить кэш
                    </Button>
                </div>
            </div>

            <footer className="p-5 border-t">
                <Button onClick={onSave} className="w-full" size="md">
                    Сохранить
                </Button>
            </footer>

            <Modal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={confirmClearCache}
                title="Очистить кэш?"
                description="Это удалит все сохраненные ссылки, категории и настройки. Действие нельзя отменить."
                confirmText="Очистить"
                variant="danger"
            />
        </div>
    );
};

export default SettingsPage;
