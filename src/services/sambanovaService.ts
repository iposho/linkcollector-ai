import { PageMetadata } from "../../types";

const SAMBANOVA_API_URL = "https://api.sambanova.ai/v1/chat/completions";

function parseJsonResponse(raw: string): { category?: string; tags?: string[]; summary?: string } {
    let s = raw.trim();
    const codeBlock = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/im;
    const match = s.match(codeBlock);
    if (match) s = match[1].trim();
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
        s = s.slice(first, last + 1);
    }
    return JSON.parse(s) as { category?: string; tags?: string[]; summary?: string };
}

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = "DeepSeek-R1-0528"
): Promise<{ category: string; tags: string[]; summary: string }> => {
    try {
        if (!apiKey) {
            throw new Error("SambaNova API key not configured");
        }

        const categoriesList =
            categories.length > 0
                ? categories.join(", ")
                : '"Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"';

        const prompt = `Проанализируй страницу и верни ответ в формате JSON (строго в формате JSON, без пояснений и текста вне объекта):
URL: ${metadata.url}
Title: ${metadata.title}
Description: ${metadata.description}

Верни JSON объект с полями:
- category: одна из наиболее подходящих категорий из этого списка: [${categoriesList}]
- tags: массив из 3-5 тегов на русском языке (ключевые слова страницы)
- summary: краткое резюме страницы на русском языке (1-2 предложения)

Ответ должен быть только валидным JSON, без дополнительного текста.`;

        const response = await fetch(SAMBANOVA_API_URL, {
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
                // response_format у SambaNova пока ведёт себя нестабильно, поэтому парсим JSON сами
            }),
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
            throw new Error(`SambaNova: ${msg}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("SambaNova: пустой ответ. Проверьте квоту и ключ API.");
        }

        const parsed = parseJsonResponse(content);
        return {
            category: parsed.category || "Прочее",
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
            summary: parsed.summary || metadata.description || "Без описания",
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("SambaNova Analysis Error:", message);
        throw new Error(message);
    }
};

export const validateSambaNovaApiKey = async (
    apiKey: string,
    model: string = "DeepSeek-R1-0528"
): Promise<{ success: boolean; error?: string }> => {
    if (!apiKey) {
        return { success: false, error: "API ключ не введён" };
    }
    try {
        const response = await fetch(SAMBANOVA_API_URL, {
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
        const err = await response.json().catch(() => ({}));
        return {
            success: false,
            error: (err as { error?: { message?: string } })?.error?.message || `Ошибка API: ${response.status}`,
        };
    } catch (error) {
        console.error("SambaNova Validation Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Ошибка сети" };
    }
};

