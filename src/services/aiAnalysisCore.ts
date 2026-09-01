import { PageMetadata } from "../../types";

export interface AnalysisResult {
  category: string;
  tags: string[];
  summary: string;
}

interface ParsedAnalysis {
  category?: string;
  tags?: string[];
  summary?: string;
}

/** Единый промпт для всех провайдеров — категория/теги/резюме по метаданным страницы. */
export function buildAnalysisPrompt(
  metadata: PageMetadata,
  categories: string[] = [],
): string {
  const categoriesList =
    categories.length > 0
      ? categories.join(", ")
      : '"Разработка", "Дизайн", "Маркетинг", "ИИ", "Бизнес", "Прочее"';

  return `Проанализируй страницу и верни ответ в формате JSON:
URL: ${metadata.url}
Title: ${metadata.title}
Description: ${metadata.description}

Верни JSON объект с полями:
- category: выбери наиболее подходящую категорию из списка [${categoriesList}]. Если ни одна не подходит, предложи НОВУЮ категорию (1–3 слова, по-русски), не слишком узкую.
- tags: массив из 3-5 тегов на русском языке (ключевые слова страницы)
- summary: краткое резюме страницы на русском языке (1-2 предложения)

Ответ должен быть только валидным JSON, без дополнительного текста.`;
}

/**
 * Извлекает и парсит JSON из ответа модели (убирает markdown-обёртки и лишний текст).
 * Бросает SyntaxError при невалидном JSON — это retryable-ошибка для analyzeWithRetry.
 */
export function parseJsonResponse(raw: string): ParsedAnalysis {
  let s = raw.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/im;
  const match = s.match(codeBlock);
  if (match) s = match[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return JSON.parse(s) as ParsedAnalysis;
}

export function normalizeAnalysisResult(
  parsed: ParsedAnalysis,
  metadata: PageMetadata,
): AnalysisResult {
  return {
    category: parsed.category || "Прочее",
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ["web"],
    summary: parsed.summary || metadata.description || "Без описания",
  };
}

/** HTTP-ошибка от API провайдера с сохранённым статус-кодом (для решения о ретрае). */
export class ProviderApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ProviderApiError";
    this.status = status;
  }
}

/** Сетевые сбои, невалидный JSON и временные ошибки API (429/5xx) стоит повторить один раз. */
function isRetryableError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true;
  if (error instanceof TypeError) return true; // fetch network failure
  if (error instanceof ProviderApiError) {
    return error.status === 429 || (error.status !== undefined && error.status >= 500);
  }
  return false;
}

/**
 * Общий раннер анализа: вызывает fetchContent, парсит и нормализует ответ.
 * При сетевой ошибке / невалидном JSON / 429 / 5xx делает один повтор.
 */
export async function analyzeWithRetry(
  providerLabel: string,
  fetchContent: () => Promise<string>,
  metadata: PageMetadata,
  attempts = 2,
): Promise<AnalysisResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const content = await fetchContent();
      const parsed = parseJsonResponse(content);
      return normalizeAnalysisResult(parsed, metadata);
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isRetryableError(err)) break;
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`${providerLabel} Analysis Error:`, message);
  throw new Error(message);
}
