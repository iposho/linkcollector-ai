import { PageMetadata } from "../../types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
- category: одна из наиболее подходящих категорий из этого списка: [${categoriesList}]
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
                    maxOutputTokens: 512,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error("Empty response from Gemini API");
        }

        const parsed = JSON.parse(content);

        return {
            category: parsed.category || "Прочее",
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
            summary: parsed.summary || metadata.description || "Без описания"
        };
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            category: "Прочее",
            tags: ["web"],
            summary: metadata.description || "Без описания"
        };
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
