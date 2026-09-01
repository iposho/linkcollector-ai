import { PageMetadata } from "../../types";
import {
    AnalysisResult,
    analyzeWithRetry,
    buildAnalysisPrompt,
} from "./aiAnalysisCore";
import { fetchOpenAiCompatContent, validateOpenAiCompatKey } from "./openAiCompatClient";

const SAMBANOVA_API_URL = "https://api.sambanova.ai/v1/chat/completions";

export const analyzePageContent = async (
    metadata: PageMetadata,
    apiKey: string,
    categories: string[] = [],
    model: string = "DeepSeek-V3.1"
): Promise<AnalysisResult> => {
    if (!apiKey) {
        throw new Error("SambaNova API key not configured");
    }

    const prompt = buildAnalysisPrompt(metadata, categories);

    return analyzeWithRetry(
        "SambaNova",
        () =>
            // response_format у SambaNova пока ведёт себя нестабильно, поэтому парсим JSON сами
            fetchOpenAiCompatContent({
                url: SAMBANOVA_API_URL,
                apiKey,
                model,
                prompt,
                providerLabel: "SambaNova",
            }),
        metadata,
    );
};

export const validateSambaNovaApiKey = async (
    apiKey: string,
    model: string = "DeepSeek-V3.1"
): Promise<{ success: boolean; error?: string }> =>
    validateOpenAiCompatKey({ url: SAMBANOVA_API_URL, apiKey, model });
