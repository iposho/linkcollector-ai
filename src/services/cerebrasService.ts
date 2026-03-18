/**
 * @deprecated Скрыт из UI, заменён на OpenRouter (openRouterService.ts).
 * Оставлен для обратной совместимости — не удалять, пока у пользователей может быть aiProvider === 'cerebras'.
 */
import { PageMetadata } from "../../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

export const analyzePageContent = async (metadata: PageMetadata, apiKey: string, categories: string[] = [], model: string = 'llama3.1-8b') => {
  try {
    if (!apiKey) {
      throw new Error("Cerebras API key not configured");
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

    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2048,
        temperature: 0.9,
        response_format: { type: 'json_object' }
      })
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

    const parsed = JSON.parse(content);

    return {
      category: parsed.category || "Прочее",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
      summary: parsed.summary || metadata.description || "Без описания"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Cerebras Analysis Error:", message);
    throw new Error(message);
  }
};

/**
 * Validates the Cerebras API key by making a minimal request
 */
export const validateCerebrasApiKey = async (apiKey: string, model: string = 'llama3.1-8b'): Promise<{ success: boolean; error?: string }> => {
  if (!apiKey) {
    return { success: false, error: "API ключ не введён" };
  }

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: 'hi'
          }
        ],
        max_tokens: 1, // Minimal tokens for validation
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
    console.error("Cerebras Validation Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Ошибка сети" };
  }
};
