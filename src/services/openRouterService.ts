import { PageMetadata } from "../../types";
import {
    AnalysisResult,
    analyzeWithRetry,
    buildAnalysisPrompt,
} from "./aiAnalysisCore";
import { fetchOpenAiCompatContent, validateOpenAiCompatKey } from "./openAiCompatClient";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = "openrouter/free"
): Promise<AnalysisResult> => {
    if (!apiKey) {
        throw new Error("OpenRouter API key not configured");
    }

    const prompt = buildAnalysisPrompt(metadata, categories);

    return analyzeWithRetry(
        "OpenRouter",
        () =>
            fetchOpenAiCompatContent({
                url: OPENROUTER_API_URL,
                apiKey,
                model,
                prompt,
                providerLabel: "OpenRouter",
                temperature: 0.9,
                extraHeaders: {
                    "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
                },
                extraBody: { response_format: { type: "json_object" } },
            }),
        metadata,
    );
};

export const validateOpenRouterApiKey = async (
    apiKey: string,
    model: string = "openrouter/free"
): Promise<{ success: boolean; error?: string }> =>
    validateOpenAiCompatKey({ url: OPENROUTER_API_URL, apiKey, model });
