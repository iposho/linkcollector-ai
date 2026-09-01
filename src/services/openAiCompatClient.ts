import { ProviderApiError } from "./aiAnalysisCore";

interface ChatCompletionOptions {
  url: string;
  apiKey: string;
  model: string;
  prompt: string;
  providerLabel: string;
  maxTokens?: number;
  temperature?: number;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

async function parseErrorBody(raw: string, status: number): Promise<string> {
  try {
    const err = JSON.parse(raw);
    return err.error?.message || err.message || raw || `HTTP ${status}`;
  } catch {
    return raw || `HTTP ${status}`;
  }
}

/**
 * Вызывает chat/completions у OpenAI-совместимого провайдера (Groq, SambaNova,
 * OpenRouter, Cerebras) и возвращает сырой текст ответа модели.
 */
export async function fetchOpenAiCompatContent(
  options: ChatCompletionOptions,
): Promise<string> {
  const response = await fetch(options.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: options.model,
      messages: [{ role: "user", content: options.prompt }],
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.8,
      ...options.extraBody,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    const msg = await parseErrorBody(raw, response.status);
    throw new ProviderApiError(`${options.providerLabel}: ${msg}`, response.status);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(
      `${options.providerLabel}: пустой ответ. Проверьте квоту и ключ API.`,
    );
  }
  return content;
}

interface ValidateKeyOptions {
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  /** Доп. коды статуса, которые считаем успешной валидацией (напр. Cerebras принимает 400). */
  acceptStatuses?: number[];
}

/** Минимальный запрос для проверки API-ключа у OpenAI-совместимого провайдера. */
export async function validateOpenAiCompatKey(
  options: ValidateKeyOptions,
): Promise<{ success: boolean; error?: string }> {
  if (!options.apiKey) {
    return { success: false, error: "API ключ не введён" };
  }
  try {
    const response = await fetch(options.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        ...options.extraHeaders,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });

    if (response.ok || options.acceptStatuses?.includes(response.status)) {
      return { success: true };
    }
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string }; message?: string }).error
        ?.message ||
      (errorData as { message?: string }).message ||
      `Ошибка API: ${response.status}`;
    return { success: false, error: errorMessage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка сети",
    };
  }
}
