import { PageMetadata } from "../../types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Извлекает и парсит JSON из ответа модели (убирает markdown-обёртки и лишний текст).
 */
function parseJsonResponse(raw: string): { category?: string; tags?: string[]; summary?: string } {
    let s = raw.trim();
    // Убираем обёртку ```json ... ``` или ``` ... ```
    const codeBlock = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/im;
    const match = s.match(codeBlock);
    if (match) s = match[1].trim();
    // Ищем первый { и последний } — на случай текста до/после JSON
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        s = s.slice(first, last + 1);
    }
    return JSON.parse(s) as { category?: string; tags?: string[]; summary?: string };
}

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = 'gemini-2.5-flash'
) => {
    try {
        if (!apiKey) {
            throw new Error("Google Gemini API key not configured");
        }

        const categoriesList = categories.length > 0 ? categories.join(', ') : '"Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"';

        const prompt = `Проанализируй страницу и верни ответ в формате JSON:
URL: ${metadata.url}
Title: ${metadata.title}
Description: ${metadata.description}

Верни JSON объект с полями:
- category: выбери наиболее подходящую категорию из списка [${categoriesList}]. Если ни одна не подходит, предложи НОВУЮ категорию (1–3 слова, по-русски), не слишком узкую.
- tags: массив из 3-5 тегов на русском языке (ключевые слова страницы)
- summary: краткое резюме страницы на русском языке (1-2 предложения)

Ответ должен быть только валидным JSON, без дополнительного текста.`;

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
            throw new Error(`Gemini: ${msg}`);
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

        const parsed = parseJsonResponse(content);

        return {
            category: parsed.category || "Прочее",
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
            summary: parsed.summary || metadata.description || "Без описания"
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Gemini Analysis Error:", message);
        throw new Error(message);
    }
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
