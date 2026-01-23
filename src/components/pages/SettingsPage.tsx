import React, { useState } from 'react';
import { Trash2, Copy, Check, Info, Database } from 'lucide-react';
import { AppSettings } from '../../../types';
import { Header, Button, Modal } from '../common';

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

    const apiCodeExample = `fetch('${settings.scriptUrl || 'https://script.google.com/macros/s/.../exec'}')
  .then(res => res.json())
  .then(data => console.log(data.data));`;

    return (
        <div className="w-[450px] bg-white flex flex-col min-h-[100%]">
            <Header
                title="Настройки"
                onBack={onBack}
                variant="default"
            />

            <div className="p-6 space-y-5 flex-1 bg-slate-50/30 overflow-y-auto">
                {/* Script URL Input */}
                <div className="space-y-2">
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
                        Сюда будут отправляться POST-запросы с данными
                    </p>
                </div>

                {/* API Info Block */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
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

                {/* AI Toggle */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <span className="text-sm font-bold text-slate-700">ИИ-анализ (Cerebras)</span>
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
