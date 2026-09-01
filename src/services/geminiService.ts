import { PageMetadata } from "../../types";
import {
    AnalysisResult,
    ProviderApiError,
    analyzeWithRetry,
    buildAnalysisPrompt,
} from "./aiAnalysisCore";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function fetchGeminiContent(
    prompt: string,
    apiKey: string,
    model: string,
): Promise<string> {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
                responseJsonSchema: {
                    type: 'object',
                    properties: {
                        category: { type: 'string', description: 'Категория из списка; если подходящей нет — новая короткая категория (1–3 слова)' },
                        tags: { type: 'array', items: { type: 'string' }, description: '3-5 тегов' },
                        summary: { type: 'string', description: 'Краткое резюме 1-2 предложения' }
                    },
                    required: ['category', 'tags', 'summary']
                }
            }
        })
    });

    if (!response.ok) {
        const raw = await response.text();
        let msg = raw;
        try {
            const err = JSON.parse(raw);
            msg = err.error?.message || err.message || raw || `HTTP ${response.status}`;
        } catch {
            msg = raw || `HTTP ${response.status}`;
        }
        throw new ProviderApiError(`Gemini: ${msg}`, response.status);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;

    if (!content) {
        const blockReason = candidate?.finishReason || data.promptFeedback?.blockReason;
        if (blockReason) {
            throw new Error(`Gemini: ответ заблокирован (${blockReason}). Попробуйте другую страницу или модель.`);
        }
        throw new Error("Gemini: пустой ответ. Проверьте квоту и ключ API.");
    }

    return content;
}

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = 'gemini-2.5-flash'
): Promise<AnalysisResult> => {
    if (!apiKey) {
        throw new Error("Google Gemini API key not configured");
    }

    const prompt = buildAnalysisPrompt(metadata, categories);

    return analyzeWithRetry(
        "Gemini",
        () => fetchGeminiContent(prompt, apiKey, model),
        metadata,
    );
};

/**
 * Validates the Google Gemini API key by making a minimal request
 */
export const validateGeminiApiKey = async (apiKey: string, model: string = 'gemini-2.5-flash'): Promise<{ success: boolean; error?: string }> => {
    if (!apiKey) {
        return { success: false, error: "API ключ не введён" };
    }

    try {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: 'hi' }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 1,
                }
            })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `Ошибка API: ${response.status}`;
            return { success: false, error: errorMessage };
        }
    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Ошибка сети" };
    }
};
