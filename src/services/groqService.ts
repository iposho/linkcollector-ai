import { PageMetadata } from "../../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Извлекает и парсит JSON из ответа модели (убирает markdown-обёртки и лишний текст).
 */
function parseJsonResponse(raw: string): { category?: string; tags?: string[]; summary?: string } {
    let s = raw.trim();
    const codeBlock = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/im;
    const match = s.match(codeBlock);
    if (match) s = match[1].trim();
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
    model: string = "llama-3.3-70b-versatile"
) => {
    try {
        if (!apiKey) {
            throw new Error("Groq API key not configured");
        }

        const categoriesList =
            categories.length > 0
                ? categories.join(", ")
                : '"Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"';

        const prompt = `Проанализируй страницу и верни ответ в формате JSON:
URL: ${metadata.url}
Title: ${metadata.title}
Description: ${metadata.description}

Верни JSON объект с полями:
- category: одна из наиболее подходящих категорий из этого списка: [${categoriesList}]
- tags: массив из 3-5 тегов на русском языке (ключевые слова страницы)
- summary: краткое резюме страницы на русском языке (1-2 предложения)

Ответ должен быть только валидным JSON, без дополнительного текста.`;

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 2048,
                temperature: 0.8,
                // Не используем response_format: json_object — часть моделей (напр. qwen3-32b) даёт json_validate_failed.
                // Ответ парсим через parseJsonResponse (поддержка markdown-обёрток и вырезка {...}).
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Empty response from Groq API");
        }

        const parsed = parseJsonResponse(content);

        return {
            category: parsed.category || "Прочее",
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
            summary: parsed.summary || metadata.description || "Без описания",
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Groq Analysis Error:", message);
        throw new Error(message);
    }
};

/**
 * Проверяет Groq API ключ минимальным запросом.
 */
export const validateGroqApiKey = async (
    apiKey: string,
    model: string = "llama-3.3-70b-versatile"
): Promise<{ success: boolean; error?: string }> => {
    if (!apiKey) {
        return { success: false, error: "API ключ не введён" };
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 1,
            }),
        });

        if (response.ok) {
            return { success: true };
        }
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Ошибка API: ${response.status}`;
        return { success: false, error: errorMessage };
    } catch (error) {
        console.error("Groq Validation Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Ошибка сети" };
    }
};
