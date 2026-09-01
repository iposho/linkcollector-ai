/** Нормализует URL для сравнения: убирает hash и utm-метки, приводит host к нижнему регистру,
 *  убирает трейлинг-слеш только у корня (для путей вида /path/ слеш значим). */
export function normalizeUrl(raw: string): string {
  const input = (raw || '').trim();
  if (!input) return input;
  try {
    const u = new URL(input);
    u.hash = '';
    const params = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      if (/^(utm_|fbclid|gclid)/i.test(k)) continue;
      params.append(k, v);
    }
    u.search = params.toString();
    if (u.pathname === '/') u.pathname = '';
    return u.toString();
  } catch {
    return input.replace(/\/+$/, '');
  }
}

/** Домен без www — для статистики и отображения. */
export function domainOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}
