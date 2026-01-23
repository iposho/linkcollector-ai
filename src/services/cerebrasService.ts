import { PageMetadata } from "../../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

export const analyzePageContent = async (metadata: PageMetadata) => {
  try {
    const apiKey = process.env.CEREBRAS_API_KEY || process.env.API_KEY;

    if (!apiKey) {
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
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b', // Бесплатная модель от Cerebras
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 512,
        temperature: 0.7,
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

    // Парсим JSON ответ
    const parsed = JSON.parse(content);

    // Валидация и нормализация ответа
    return {
      category: parsed.category || "Прочее",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
      summary: parsed.summary || metadata.description || "Без описания"
    };
  } catch (error) {
    console.error("Cerebras Analysis Error:", error);
    return {
      category: "Прочее",
      tags: ["web"],
      summary: metadata.description || "Без описания"
    };
  }
};
