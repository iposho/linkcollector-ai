import { SavedLink } from '../../types';

/** Minimal link shape for import (url required, rest optional). */
export interface ImportableLink {
  url: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  image?: string;
  icon?: string;
  date?: string;
}

const DEFAULT_FAVICON = 'https://www.google.com/s2/favicons?domain=example.com&sz=128';
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

/** Normalize to SavedLink-like object for saving (with required fields). */
export function toSavePayload(link: ImportableLink): {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  category: string;
  tags: string[];
  notes: string;
} {
  let favicon = link.icon || DEFAULT_FAVICON;
  try {
    const u = new URL(link.url);
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch (_) {}
  return {
    url: link.url,
    title: (link.title || link.url).slice(0, 500),
    description: (link.description || '').slice(0, 2000),
    image: link.image || PLACEHOLDER_IMAGE,
    favicon,
    category: link.category || 'Прочее',
    tags: Array.isArray(link.tags) ? link.tags.slice(0, 20) : [],
    notes: (link.notes || '').slice(0, 2000),
  };
}

export type ImportResult = { ok: true; links: ImportableLink[] } | { ok: false; error: string };

/** Parse JSON file (array of link objects). */
export function parseJsonImport(text: string): ImportResult {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : [data]);
    const links: ImportableLink[] = [];
    for (const item of arr) {
      const url = item.url || item.URL;
      if (!url || typeof url !== 'string') continue;
      links.push({
        url: String(url).trim(),
        title: item.title != null ? String(item.title) : undefined,
        description: item.description != null ? String(item.description) : undefined,
        category: item.category != null ? String(item.category) : undefined,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
        notes: item.notes != null ? String(item.notes) : undefined,
        image: (item.image || item.icon) ? String(item.image || item.icon) : undefined,
        icon: item.icon ? String(item.icon) : undefined,
        date: item.date ? String(item.date) : undefined,
      });
    }
    return { ok: true, links };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Parse CSV (header: url, title, description, category, tags, notes). */
export function parseCsvImport(text: string): ImportResult {
  try {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return { ok: false, error: 'CSV должен содержать заголовок и хотя бы одну строку' };
    const header = lines[0].toLowerCase();
    const sep = header.includes(';') ? ';' : ',';
    const cols = lines[0].split(sep).map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const idx = (name: string) => {
      const i = cols.indexOf(name);
      return i >= 0 ? i : cols.findIndex((c) => c.includes(name));
    };
    const urlIdx = idx('url') >= 0 ? idx('url') : idx('link') >= 0 ? idx('link') : 0;
    const titleIdx = idx('title') >= 0 ? idx('title') : idx('name') >= 0 ? idx('name') : 1;
    const descIdx = idx('description') >= 0 ? idx('description') : idx('desc') >= 0 ? idx('desc') : -1;
    const catIdx = idx('category') >= 0 ? idx('category') : -1;
    const tagsIdx = idx('tags') >= 0 ? idx('tags') : -1;
    const notesIdx = idx('notes') >= 0 ? idx('notes') : -1;

    const links: ImportableLink[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const parts: string[] = [];
      let inQuoted = false;
      let cur = '';
      for (let j = 0; j < row.length; j++) {
        const ch = row[j];
        if (ch === '"' || ch === "'") {
          inQuoted = !inQuoted;
          continue;
        }
        if (!inQuoted && ch === sep) {
          parts.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      parts.push(cur.trim());
      const url = (parts[urlIdx] || '').replace(/^["']|["']$/g, '').trim();
      if (!url) continue;
      links.push({
        url,
        title: titleIdx >= 0 && parts[titleIdx] !== undefined ? parts[titleIdx].replace(/^["']|["']$/g, '') : undefined,
        description: descIdx >= 0 && parts[descIdx] !== undefined ? parts[descIdx].replace(/^["']|["']$/g, '') : undefined,
        category: catIdx >= 0 && parts[catIdx] !== undefined ? parts[catIdx].replace(/^["']|["']$/g, '') : undefined,
        tags: tagsIdx >= 0 && parts[tagsIdx] ? parts[tagsIdx].replace(/^["']|["']$/g, '').split(sep).map((t) => t.trim()).filter(Boolean) : undefined,
        notes: notesIdx >= 0 && parts[notesIdx] !== undefined ? parts[notesIdx].replace(/^["']|["']$/g, '') : undefined,
      });
    }
    return { ok: true, links };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Parse Chrome/Firefox bookmarks HTML export. */
export function parseBookmarksHtml(html: string): ImportResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const anchors = doc.querySelectorAll('a[href]');
    const links: ImportableLink[] = [];
    const seen = new Set<string>();
    anchors.forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href.startsWith('place:') || href.startsWith('javascript:') || seen.has(href)) return;
      seen.add(href);
      const title = (a.textContent || '').trim().slice(0, 500) || undefined;
      const addDate = a.getAttribute('add_date');
      const date = addDate ? new Date(parseInt(addDate, 10) * 1000).toISOString() : undefined;
      links.push({ url: href, title: title || undefined, date });
    });
    return { ok: true, links };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function parseImportFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const name = (file.name || '').toLowerCase();
      if (name.endsWith('.json')) {
        resolve(parseJsonImport(text));
      } else if (name.endsWith('.csv')) {
        resolve(parseCsvImport(text));
      } else if (name.endsWith('.html') || name.endsWith('.htm')) {
        resolve(parseBookmarksHtml(text));
      } else {
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
          resolve(parseJsonImport(text));
        } else if (text.includes('<') && text.includes('</a>')) {
          resolve(parseBookmarksHtml(text));
        } else {
          resolve(parseCsvImport(text));
        }
      }
    };
    reader.onerror = () => resolve({ ok: false, error: 'Не удалось прочитать файл' });
    reader.readAsText(file, 'UTF-8');
  });
}
