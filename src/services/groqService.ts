import { PageMetadata } from "../../types";
import {
    AnalysisResult,
    analyzeWithRetry,
    buildAnalysisPrompt,
} from "./aiAnalysisCore";
import { fetchOpenAiCompatContent, validateOpenAiCompatKey } from "./openAiCompatClient";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = "openai/gpt-oss-120b"
): Promise<AnalysisResult> => {
    if (!apiKey) {
        throw new Error("Groq API key not configured");
    }

    const prompt = buildAnalysisPrompt(metadata, categories);

    return analyzeWithRetry(
        "Groq",
        () =>
            fetchOpenAiCompatContent({
                url: GROQ_API_URL,
                apiKey,
                model,
                prompt,
                providerLabel: "Groq",
                // Не используем response_format: json_object — часть моделей (напр. qwen/qwen3.6-27b)
                // даёт json_validate_failed. Ответ парсим через parseJsonResponse.
            }),
        metadata,
    );
};

/**
 * Проверяет Groq API ключ минимальным запросом.
 */
export const validateGroqApiKey = async (
    apiKey: string,
    model: string = "openai/gpt-oss-120b"
): Promise<{ success: boolean; error?: string }> =>
    validateOpenAiCompatKey({ url: GROQ_API_URL, apiKey, model });
