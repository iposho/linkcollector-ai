/**
 * @deprecated Скрыт из UI, заменён на OpenRouter. Оставлен для обратной совместимости — не удалять.
 */
import { PageMetadata } from "../../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

// Доступные модели Cerebras
export const CEREBRAS_MODELS = [
  { id: "llama3.1-8b", name: "Llama 3.1 8B" },
  { id: "qwen-3-235b-a22b-instruct-2507", name: "Qwen 3 235B A22B Instruct" },
  { id: "zai-glm-4.7", name: "ZAI GLM 4.7" },
] as const;

export const DEFAULT_CEREBRAS_MODEL = "llama3.1-8b";

export const analyzePageContent = async (
  metadata: PageMetadata,
  apiKey?: string,
  _categories?: string[],
  model?: string,
) => {
  try {
    const key = apiKey || process.env.CEREBRAS_API_KEY || process.env.API_KEY;

    if (!key) {
      throw new Error("Cerebras API key not found");
    }

    const prompt = `Проанализируй страницу и верни ответ в формате JSON:
URL: ${metadata.url}
Title: ${metadata.title}
Description: ${metadata.description}

Верни JSON объект с полями:
- category: одна из категорий: "Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"
- tags: массив из 3-5 тегов на русском языке
- summary: краткое резюме страницы на русском языке (2-3 предложения)

Ответ должен быть только валидным JSON, без дополнительного текста.`;

    const response = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || DEFAULT_CEREBRAS_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from Cerebras API");
    }

    // Парсим JSON ответ
    const parsed = JSON.parse(content);

    // Валидация и нормализация ответа
    return {
      category: parsed.category || "Прочее",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
      summary: parsed.summary || metadata.description || "Без описания",
    };
  } catch (error) {
    console.error("Cerebras Analysis Error:", error);
    return {
      category: "Прочее",
      tags: ["web"],
      summary: metadata.description || "Без описания",
    };
  }
};

export const validateCerebrasApiKey = async (
  apiKey: string,
  model: string = DEFAULT_CEREBRAS_MODEL,
): Promise<{ success: boolean; error?: string }> => {
  if (!apiKey) {
    return { success: false, error: "API ключ не введён" };
  }

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 10,
      }),
    });

    if (response.ok || response.status === 400) {
      return { success: true };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error:
        (errorData as { error?: { message?: string }; message?: string }).error
          ?.message ||
        (errorData as { message?: string }).message ||
        `Ошибка API: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка сети",
    };
  }
};
