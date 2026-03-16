import React, { useState } from 'react';
import { Trash2, Copy, Check, Info, Database, ShieldCheck, ShieldAlert, BookOpen } from 'lucide-react';
import { AppSettings, StorageProvider, AiProvider } from '../../../types';
import { Header, Button, Modal } from '../common';
import { validateCerebrasApiKey } from '../../services/cerebrasService';
import { validateGeminiApiKey } from '../../services/geminiService';
import { validateConnection as validateNotionConnection } from '../../services/notionService';

interface SettingsPageProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onSave: () => void;
    onClearCache: () => void;
    onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    settings,
    onSettingsChange,
    onSave,
    onClearCache,
    onBack
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
        if (!settings.cerebrasApiKey) {
            setValidationResult({ success: false, message: 'Сначала введите API ключ' });
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            const result = await validateCerebrasApiKey(settings.cerebrasApiKey, settings.cerebrasModel);
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
                {/* Storage Provider Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Хранилище ссылок
                    </label>
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
                </div>

                {/* Google Sheets Settings */}
                {settings.storageProvider === 'google_sheets' && (
                    <>
                        {/* Script URL Input */}
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Google Apps Script URL
                            </label>
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

                {/* AI Toggle */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <span className="text-sm font-bold text-slate-700">ИИ-анализ</span>
                        <p className="text-[11px] text-slate-500">Автоматически подбирать теги</p>
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
                            <div className="flex bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'cerebras' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${settings.aiProvider === 'cerebras'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Cerebras
                                </button>
                                <button
                                    onClick={() => {
                                        onSettingsChange({ ...settings, aiProvider: 'google_gemini' });
                                        setValidationResult(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${settings.aiProvider === 'google_gemini'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Google Gemini
                                </button>
                            </div>
                        </div>

                        {/* Cerebras Settings */}
                        {settings.aiProvider === 'cerebras' && (
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Cerebras API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.cerebrasApiKey || ''}
                                        onChange={(e) => {
                                            onSettingsChange({ ...settings, cerebrasApiKey: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="csk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Модель Cerebras
                                    </label>
                                    <select
                                        value={settings.cerebrasModel || 'llama3.1-8b'}
                                        onChange={(e) => onSettingsChange({ ...settings, cerebrasModel: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="llama3.1-8b">llama3.1-8b</option>
                                        <option value="gpt-oss-120b">gpt-oss-120b</option>
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
                                    Получить ключ: <a href="https://cloud.cerebras.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">cloud.cerebras.ai</a> (бесплатно)
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
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
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
                    </div>
                )}


                {/* Clear Cache */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="mb-3">
                        <span className="text-sm font-bold text-red-800">Очистка кэша</span>
                        <p className="text-[11px] text-red-600">Удалить все сохраненные данные</p>
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
                <Button onClick={onSave} className="w-full" size="lg">
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
