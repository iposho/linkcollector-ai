import { SavedLink } from '../../types';
import { domainOf } from './urlUtils';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Собирает автономную HTML-страницу со списком ссылок (для «поделиться подборкой»). */
export function buildShareHtml(links: SavedLink[]): string {
  const cards = links
    .map((l) => {
      const tags = (l.tags || [])
        .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
        .join('');
      const image =
        l.image && !l.image.includes('picsum.photos')
          ? `<img class="thumb" src="${escapeHtml(l.image)}" alt="" loading="lazy" />`
          : '';
      return `<li class="card">
  ${image}
  <div class="body">
    <a class="title" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.title || l.url)}</a>
    ${l.description ? `<p class="desc">${escapeHtml(l.description)}</p>` : ''}
    <div class="meta">
      <span class="cat">${escapeHtml(l.category || 'Прочее')}</span>
      ${tags}
      <span class="domain">${escapeHtml(domainOf(l.url))}</span>
      <span>${escapeHtml(new Date(l.date).toLocaleDateString('ru-RU'))}</span>
    </div>
  </div>
</li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LinkCollector — подборка</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f1f5f9; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 13px; margin: 0 0 24px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; display: flex; gap: 14px; }
  .thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
  .body { min-width: 0; flex: 1; }
  .title { display: block; font-weight: 700; font-size: 15px; color: #1d4ed8; text-decoration: none; line-height: 1.35; }
  .title:hover { text-decoration: underline; }
  .desc { color: #334155; font-size: 13px; margin: 6px 0 10px; line-height: 1.45; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11px; color: #64748b; }
  .cat { background: #eef2ff; color: #4338ca; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .tag { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 999px; }
  .domain { font-weight: 600; color: #475569; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>🔖 LinkCollector — подборка</h1>
    <p class="sub">${links.length} ссыл${plural(links.length)} · ${escapeHtml(new Date().toLocaleString('ru-RU'))}</p>
    <ul>
${cards}
    </ul>
  </div>
</body>
</html>`;
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ки';
  return 'ок';
}

/** Открывает подборку в новой вкладке как автономную HTML-страницу. */
export function openSharePage(links: SavedLink[]): void {
  const html = buildShareHtml(links);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Даём вкладке время загрузить документ, затем освобождаем URL
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
