/**
 * @deprecated Скрыт из UI, заменён на OpenRouter. Оставлен для обратной совместимости — не удалять.
 */
import { PageMetadata } from "../../types";
import { AnalysisResult, analyzeWithRetry, buildAnalysisPrompt } from "./aiAnalysisCore";
import { fetchOpenAiCompatContent, validateOpenAiCompatKey } from "./openAiCompatClient";

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
  categories?: string[],
  model?: string,
): Promise<AnalysisResult> => {
  const key = apiKey || process.env.CEREBRAS_API_KEY || process.env.API_KEY;

  if (!key) {
    console.error("Cerebras Analysis Error:", "Cerebras API key not found");
    return {
      category: "Прочее",
      tags: ["web"],
      summary: metadata.description || "Без описания",
    };
  }

  const prompt = buildAnalysisPrompt(metadata, categories);

  try {
    return await analyzeWithRetry(
      "Cerebras",
      () =>
        fetchOpenAiCompatContent({
          url: CEREBRAS_API_URL,
          apiKey: key,
          model: model || DEFAULT_CEREBRAS_MODEL,
          prompt,
          providerLabel: "Cerebras",
          temperature: 0.7,
          extraBody: { response_format: { type: "json_object" } },
        }),
      metadata,
    );
  } catch (error) {
    // Сохраняем прежнее поведение: Cerebras не бросает ошибку наружу, а отдаёт заглушку.
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
): Promise<{ success: boolean; error?: string }> =>
  validateOpenAiCompatKey({
    url: CEREBRAS_API_URL,
    apiKey,
    model,
    acceptStatuses: [400],
  });
