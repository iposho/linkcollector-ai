import React, { useMemo, useState } from 'react';
import { ExternalLink, LifeBuoy, Shield, Sparkles, Database, FileDown, FileUp, Wrench, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { Header, Button } from '../common';
import type { AppSettings } from '../../../types';
import { validateConnection as validateNotionConnection } from '../../services/notionService';
import { validateOpenRouterApiKey } from '../../services/openRouterService';
import { validateGeminiApiKey } from '../../services/geminiService';
import { validateGroqApiKey } from '../../services/groqService';
import { validateSambaNovaApiKey } from '../../services/sambanovaService';
import { validateCerebrasApiKey } from '../../services/cerebrasService';

interface HelpPageProps {
    onBack: () => void;
    onOpenSettings: () => void;
    settings: AppSettings;
}

const FAQItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <details className="group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <summary className="list-none cursor-pointer select-none flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-slate-900">{title}</span>
                <span className="mt-0.5 text-slate-400 group-open:text-slate-500">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">–</span>
                </span>
            </summary>
            <div className="mt-2 text-xs text-slate-600 leading-relaxed break-words">
                {children}
            </div>
        </details>
    );
};

export const HelpPage: React.FC<HelpPageProps> = ({ onBack, onOpenSettings, settings }) => {
    const [diag, setDiag] = useState<{ kind: 'notion' | 'ai' | 'script' | 'all'; loading: boolean; ok?: boolean; message?: string } | null>(null);

    const userGuideUrl = useMemo(() => {
        const ch = typeof globalThis !== 'undefined' && (globalThis as any).chrome;
        return typeof ch?.runtime?.getURL === 'function' ? ch.runtime.getURL('user-guide.html') : 'user-guide.html';
    }, []);

    const canCheckNotion = !!(settings.notionToken && settings.notionDatabaseId);
    const canCheckScript = !!settings.scriptUrl;
    const isSheets = settings.storageProvider === 'google_sheets';
    const isNotion = settings.storageProvider === 'notion';
    const canCheckAi = useMemo(() => {
        if (!settings.autoAiAnalysis) return false;
        if (settings.aiProvider === 'google_gemini') return !!settings.geminiApiKey;
        if (settings.aiProvider === 'groq') return !!settings.groqApiKey;
        if (settings.aiProvider === 'openrouter') return !!settings.openRouterApiKey;
        if (settings.aiProvider === 'sambanova') return !!settings.sambanovaApiKey;
        if (settings.aiProvider === 'cerebras') return !!(settings.cerebrasApiKey || settings.openRouterApiKey);
        return false;
    }, [settings]);

    const providerLabel = useMemo(() => {
        if (!settings.autoAiAnalysis) return 'ИИ выключен';
        if (settings.aiProvider === 'google_gemini') return 'Gemini';
        if (settings.aiProvider === 'groq') return 'Groq';
        if (settings.aiProvider === 'openrouter') return 'OpenRouter';
        if (settings.aiProvider === 'sambanova') return 'SambaNova';
        if (settings.aiProvider === 'cerebras') return 'Cerebras/OpenRouter';
        return 'ИИ';
    }, [settings]);

    const runCheckNotion = async () => {
        setDiag({ kind: 'notion', loading: true });
        const r = await validateNotionConnection(settings.notionToken, settings.notionDatabaseId);
        setDiag({
            kind: 'notion',
            loading: false,
            ok: r.success,
            message: r.success ? 'Соединение с Notion установлено' : (r.error || 'Ошибка подключения'),
        });
    };

    const checkScriptUrl = async (): Promise<{ ok: boolean; message: string }> => {
        if (!settings.scriptUrl) return { ok: false, message: 'Script URL не настроен' };
        const controller = new AbortController();
        const timeoutMs = 8000;
        const t = window.setTimeout(() => controller.abort(), timeoutMs);
        let res: Response;
        try {
            res = await fetch(settings.scriptUrl, { method: 'GET', signal: controller.signal });
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') {
                return { ok: false, message: `Таймаут ${timeoutMs / 1000}с` };
            }
            throw e;
        } finally {
            window.clearTimeout(t);
        }
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();
        if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
        let json: any = null;
        try {
            json = JSON.parse(text);
        } catch {
            const looksHtml = /<html|<!doctype html/i.test(text);
            return { ok: false, message: looksHtml ? 'Ответ HTML (проверьте URL развертывания)' : 'Ответ не JSON' };
        }
        const hasExpectedShape =
            typeof json === 'object' &&
            json &&
            (typeof json.success === 'boolean' || Array.isArray(json.data) || typeof json.count === 'number');
        if (!hasExpectedShape) {
            return { ok: false, message: 'JSON неожидаемого формата' };
        }
        if (typeof json.success === 'boolean' && json.success === false) {
            return { ok: false, message: json.error || 'success=false' };
        }
        if (contentType && !contentType.includes('application/json')) {
            // иногда GAS отдаёт application/json; но если не так — всё равно ок при валидном JSON
        }
        return { ok: true, message: 'Script URL отвечает' };
    };

    const validateAi = async (): Promise<{ success: boolean; error?: string }> => {
        if (settings.aiProvider === 'google_gemini') {
            return await validateGeminiApiKey(settings.geminiApiKey, settings.geminiModel);
        }
        if (settings.aiProvider === 'groq') {
            return await validateGroqApiKey(settings.groqApiKey, settings.groqModel);
        }
        if (settings.aiProvider === 'openrouter') {
            return await validateOpenRouterApiKey(settings.openRouterApiKey, settings.openRouterModel);
        }
        if (settings.aiProvider === 'sambanova') {
            return await validateSambaNovaApiKey(settings.sambanovaApiKey, settings.sambanovaModel);
        }
        if (settings.aiProvider === 'cerebras') {
            if (settings.cerebrasApiKey) {
                return await validateCerebrasApiKey(settings.cerebrasApiKey, settings.cerebrasModel);
            }
            return await validateOpenRouterApiKey(settings.openRouterApiKey, settings.openRouterModel);
        }
        return { success: false, error: 'Неизвестный провайдер' };
    };

    const runCheckAi = async () => {
        setDiag({ kind: 'ai', loading: true });
        try {
            const r = await validateAi();
            setDiag({
                kind: 'ai',
                loading: false,
                ok: r.success,
                message: r.success ? 'ИИ‑ключ валиден' : (r.error || 'Ошибка проверки'),
            });
        } catch (e) {
            setDiag({
                kind: 'ai',
                loading: false,
                ok: false,
                message: e instanceof Error ? e.message : 'Ошибка проверки',
            });
        }
    };

    const runCheckScript = async () => {
        setDiag({ kind: 'script', loading: true });
        try {
            const r = await checkScriptUrl();
            setDiag({ kind: 'script', loading: false, ok: r.ok, message: r.message });
        } catch (e) {
            setDiag({ kind: 'script', loading: false, ok: false, message: e instanceof Error ? e.message : 'Ошибка сети' });
        }
    };

    const runCheckAll = async () => {
        const parts: string[] = [];
        let allOk = true;

        setDiag({ kind: 'all', loading: true });

        // Script URL (только если выбрано Google Sheets)
        if (!isSheets) {
            parts.push('Script URL: пропущено');
        } else if (canCheckScript) {
            try {
                const r = await checkScriptUrl();
                parts.push(`Script URL: ${r.ok ? 'ок' : r.message}`);
                if (!r.ok) allOk = false;
            } catch (e) {
                parts.push(`Script URL: ${e instanceof Error ? e.message : 'ошибка сети'}`);
                allOk = false;
            }
        } else {
            parts.push('Script URL: не настроен');
            allOk = false;
        }

        // Notion (только если выбрано Notion)
        if (!isNotion) {
            parts.push('Notion: пропущено');
        } else if (canCheckNotion) {
            const r = await validateNotionConnection(settings.notionToken, settings.notionDatabaseId);
            if (r.success) {
                parts.push('Notion: ок');
            } else {
                parts.push(`Notion: ${r.error || 'ошибка подключения'}`);
                allOk = false;
            }
        } else {
            parts.push('Notion: не настроен');
            allOk = false;
        }

        // AI (только если включён ИИ-анализ)
        if (!settings.autoAiAnalysis) {
            parts.push('ИИ: пропущено');
        } else if (canCheckAi) {
            try {
                const r = await validateAi();
                if (r.success) {
                    parts.push(`ИИ (${providerLabel}): ок`);
                } else {
                    parts.push(`ИИ (${providerLabel}): ${r.error || 'ошибка проверки'}`);
                    allOk = false;
                }
            } catch (e) {
                parts.push(`ИИ (${providerLabel}): ${e instanceof Error ? e.message : 'ошибка проверки'}`);
                allOk = false;
            }
        } else {
            parts.push(`ИИ (${providerLabel}): не настроен`);
            allOk = false;
        }

        setDiag({
            kind: 'all',
            loading: false,
            ok: allOk,
            message: parts.join(' · '),
        });
    };

    return (
        <div className="w-[450px] min-h-[600px] max-h-[80vh] bg-white flex flex-col overflow-hidden border border-slate-100 rounded-2xl shadow-lg">
            <Header
                title="Справка и FAQ"
                onBack={onBack}
                variant="default"
            />

            <main className="flex-1 overflow-y-auto bg-slate-50/30 p-6 space-y-5">
                <section className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-2xl bg-white/10">
                            <LifeBuoy className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-black leading-tight">Как это работает</h2>
                            <p className="text-xs text-white/80 mt-1">
                                Откройте страницу → нажмите иконку расширения → проверьте категорию/теги → сохраните в выбранное хранилище.
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button variant="secondary" size="sm" onClick={onOpenSettings} className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                                    Открыть настройки
                                </Button>
                                <a
                                    href={userGuideUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-white/90 hover:text-white underline-offset-4 hover:underline px-2"
                                >
                                    Руководство <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <a
                                    href="https://docs.google.com/spreadsheets/d/18Wr4hs97QaFEC3UN4Tj8-N3DUK2i4epbaFRSeot9uxA/copy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-white/90 hover:text-white underline-offset-4 hover:underline px-2"
                                >
                                    Шаблон таблицы <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Wrench className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-black">Быстрый старт</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Шаг 1</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">Настройте хранилище</p>
                            <p className="text-xs text-slate-600 mt-1">
                                В <span className="font-bold">Настройках</span> выберите Google Sheets или Notion и заполните необходимые поля.
                            </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Шаг 2</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">Сохраните страницу</p>
                            <p className="text-xs text-slate-600 mt-1">
                                Откройте нужную вкладку и нажмите иконку расширения — данные подтянутся автоматически.
                            </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Шаг 3</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">Управляйте списком</p>
                            <p className="text-xs text-slate-600 mt-1">
                                В списке доступны поиск, сортировка, редактирование, удаление, импорт и экспорт.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Database className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-black">FAQ</h3>
                    </div>

                    <FAQItem title="Куда сохраняются ссылки?">
                        Вы выбираете хранилище в настройках: <span className="font-bold">Google Sheets</span> (через Apps Script URL) или <span className="font-bold">Notion</span> (через Token + Database ID).
                    </FAQItem>

                    <FAQItem title="Почему кнопка «Сохранить» неактивна?">
                        Чаще всего не заполнены настройки хранилища: для Google Sheets нужен <span className="font-mono">Script URL</span>, для Notion — <span className="font-mono">Token</span> и <span className="font-mono">Database ID</span>.
                    </FAQItem>

                    <FAQItem title="ИИ-анализ не работает — что проверить?">
                        <div className="space-y-2">
                            <p>
                                Проверьте, что в настройках включён <span className="font-bold">ИИ-анализ</span> и указан API‑ключ выбранного провайдера.
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Для Gemini — ключ Google AI Studio</li>
                                <li>Для Groq — ключ Groq Console</li>
                                <li>Для OpenRouter — ключ OpenRouter</li>
                                <li>Для SambaNova — ключ SambaNova Cloud</li>
                            </ul>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> ИИ лишь предлагает значения — вы всегда можете отредактировать их вручную.
                            </p>
                        </div>
                    </FAQItem>

                    <FAQItem title="Расширение не может захватить данные страницы">
                        Некоторые страницы недоступны для расширений (например, <span className="font-mono">chrome://</span> и страницы расширений). Откройте обычный сайт и попробуйте снова.
                    </FAQItem>

                    <FAQItem title="Какие есть горячие клавиши?">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><span className="font-mono font-bold">Alt+L</span> — сохранить текущую страницу</li>
                            <li><span className="font-mono font-bold">Alt+Shift+L</span> — открыть список ссылок</li>
                        </ul>
                        <p className="text-[11px] text-slate-500 mt-2">
                            На иконке расширения показывается число непрочитанных ссылок. Ссылка считается прочитанной после первого открытия из списка.
                        </p>
                    </FAQItem>

                    <FAQItem title="Импорт/экспорт: что поддерживается?">
                        <div className="space-y-2">
                            <p className="flex items-center gap-2">
                                <FileUp className="w-4 h-4 text-slate-500" />
                                Импорт: <span className="font-bold">JSON / CSV / HTML</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <FileDown className="w-4 h-4 text-slate-500" />
                                Экспорт: <span className="font-bold">JSON / CSV / Markdown</span>
                            </p>
                        </div>
                    </FAQItem>

                    <FAQItem title="Где хранятся настройки и ключи? Это безопасно?">
                        <div className="space-y-2">
                            <p className="flex items-start gap-2">
                                <Shield className="w-4 h-4 text-slate-500" />
                                <span className="min-w-0">
                                    Настройки сохраняются <span className="font-bold">локально</span> в браузере (Chrome Storage).
                                </span>
                            </p>
                            <p>
                                При желании вы можете очистить локальные данные в разделе «Очистка кэша» в настройках.
                            </p>
                        </div>
                    </FAQItem>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-black">Диагностика</h3>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-xs text-slate-600">
                            Быстро проверяйте соединения, не уходя в настройки.
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={runCheckAll}
                                disabled={diag?.loading}
                            >
                                Проверить всё
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={runCheckScript}
                                disabled={!canCheckScript || diag?.loading}
                            >
                                Проверить Script URL
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={runCheckNotion}
                                disabled={!canCheckNotion || diag?.loading}
                            >
                                Проверить Notion
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={runCheckAi}
                                disabled={!canCheckAi || diag?.loading}
                            >
                                Проверить ИИ‑ключ ({providerLabel})
                            </Button>
                        </div>

                        {diag && !diag.loading && (
                            <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 border ${diag.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                {diag.ok ? (
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                )}
                                <div className="text-xs leading-relaxed min-w-0">
                                    <p className="font-bold">
                                        {diag.kind === 'script'
                                            ? 'Script URL'
                                            : diag.kind === 'notion'
                                                ? 'Notion'
                                                : diag.kind === 'ai'
                                                    ? 'ИИ'
                                                    : 'Все проверки'}
                                    </p>
                                    <p className="opacity-90 break-words">{diag.message}</p>
                                    {!diag.ok && (
                                        <button
                                            type="button"
                                            onClick={onOpenSettings}
                                            className="mt-2 text-xs font-bold underline underline-offset-4"
                                        >
                                            Открыть настройки
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {diag?.loading && (
                            <div className="mt-3 text-xs text-slate-500 animate-pulse">
                                Проверяем…
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-amber-900">Совет</p>
                    <p className="text-xs text-amber-800 mt-1">
                        Если вы часто сохраняете ссылки, включите ИИ-анализ и выберите более быстрый провайдер/модель — так категории и теги будут заполняться почти мгновенно.
                    </p>
                </section>
            </main>
        </div>
    );
};

export default HelpPage;

