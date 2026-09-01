import { SavedLink } from '../../types';

export function exportLinksAsJson(links: SavedLink[], filename?: string): void {
  const json = JSON.stringify(links, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `linkcollector-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export function exportLinksAsCsv(links: SavedLink[], filename?: string): void {
  const escapeCsv = (value: string): string => {
    const s = value ?? '';
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ['date', 'url', 'title', 'description', 'category', 'tags', 'notes'];
  const rows = links.map((l) =>
    [
      l.date,
      l.url,
      l.title,
      l.description,
      l.category,
      (l.tags || []).join('; '),
      l.notes,
    ]
      .map(escapeCsv)
      .join(','),
  );

  // BOM нужен, чтобы Excel корректно открыл кириллицу
  const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `linkcollector-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export function linksToMarkdown(links: SavedLink[]): string {
  const lines: string[] = ['# LinkCollector — экспорт', '', `Дата: ${new Date().toLocaleString('ru')}`, '', '---', ''];

  for (const link of links) {
    lines.push(`## [${link.title || link.url}](${link.url})`);
    if (link.description) lines.push(link.description);
    if (link.category) lines.push(`**Категория:** ${link.category}`);
    if (link.tags && link.tags.length) lines.push(`**Теги:** ${link.tags.join(', ')}`);
    if (link.notes) lines.push(`**Заметки:** ${link.notes}`);
    if (link.date) lines.push(`*Сохранено: ${new Date(link.date).toLocaleString('ru')}*`);
    lines.push('', '');
  }

  return lines.join('\n');
}

export function exportLinksAsMarkdown(links: SavedLink[], filename?: string): void {
  const md = linksToMarkdown(links);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `linkcollector-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}
