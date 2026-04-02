import { SavedLink } from '../../types';

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const getHeaders = (token: string): Record<string, string> => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
});

// Helper: map Notion page → SavedLink
const mapNotionPageToSavedLink = (page: any): SavedLink => {
    const props = page.properties;

    const getText = (prop: any): string => {
        if (!prop) return '';
        if (prop.title) return prop.title.map((t: any) => t.plain_text).join('');
        if (prop.rich_text) return prop.rich_text.map((t: any) => t.plain_text).join('');
        if (prop.url) return prop.url || '';
        return '';
    };

    const getDate = (prop: any): string => {
        if (!prop?.date?.start) return new Date().toISOString();
        return prop.date.start;
    };

    const getMultiSelect = (prop: any): string[] => {
        if (!prop?.multi_select) return [];
        return prop.multi_select.map((s: any) => s.name);
    };

    const getSelect = (prop: any): string => {
        return prop?.select?.name || 'Прочее';
    };

    return {
        date: getDate(props.Date),
        url: getText(props.URL) || props.URL?.url || '',
        title: getText(props.Title),
        description: getText(props.Description),
        category: getSelect(props.Category),
        tags: getMultiSelect(props.Tags),
        notes: getText(props.Notes),
        image: getText(props.Image),
        icon: getText(props.Icon),
    };
};

// Helper: build Notion properties from link data
const buildNotionProperties = (data: {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    category: string;
    tags: string[];
    notes: string;
    date?: string;
}) => ({
    Title: {
        title: [{ text: { content: data.title || '' } }],
    },
    URL: {
        url: data.url || null,
    },
    Description: {
        rich_text: [{ text: { content: (data.description || '').slice(0, 2000) } }],
    },
    Category: {
        select: { name: data.category || 'Прочее' },
    },
    Tags: {
        multi_select: (data.tags || []).map(tag => ({ name: tag })),
    },
    Notes: {
        rich_text: [{ text: { content: (data.notes || '').slice(0, 2000) } }],
    },
    Image: {
        rich_text: [{ text: { content: (data.image || '').slice(0, 2000) } }],
    },
    Icon: {
        rich_text: [{ text: { content: (data.favicon || '').slice(0, 2000) } }],
    },
    Date: {
        date: { start: data.date || new Date().toISOString() },
    },
});

/**
 * Query all links from a Notion database
 */
export const queryLinks = async (token: string, databaseId: string): Promise<SavedLink[]> => {
    const allPages: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
        const body: any = {
            sorts: [{ property: 'Date', direction: 'descending' }],
            page_size: 100,
        };
        if (startCursor) {
            body.start_cursor = startCursor;
        }

        const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Notion API error: ${response.status} — ${errorText}`);
        }

        const data = await response.json();
        allPages.push(...data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return allPages.map(mapNotionPageToSavedLink);
};

/**
 * Create a new link page in Notion database
 */
export const createLink = async (
    token: string,
    databaseId: string,
    linkData: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
        category: string;
        tags: string[];
        notes: string;
        date?: string;
    }
): Promise<void> => {
    const response = await fetch(`${NOTION_API_URL}/pages`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: buildNotionProperties({
                ...linkData,
                date: linkData.date || new Date().toISOString(),
            }),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion create error: ${response.status} — ${errorText}`);
    }
};

/**
 * Find a Notion page by URL property
 */
const findPageByUrl = async (token: string, databaseId: string, url: string): Promise<string | null> => {
    const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
            filter: {
                property: 'URL',
                url: { equals: url },
            },
            page_size: 1,
        }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.results?.[0]?.id || null;
};

/**
 * Update an existing link in Notion
 */
export const updateLink = async (
    token: string,
    databaseId: string,
    originalUrl: string,
    linkData: {
        url: string;
        title: string;
        description: string;
        image: string;
        favicon: string;
        category: string;
        tags: string[];
        notes: string;
        date?: string;
    }
): Promise<void> => {
    const pageId = await findPageByUrl(token, databaseId, originalUrl);
    if (!pageId) {
        throw new Error('Ссылка не найдена в Notion');
    }

    const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({
            properties: buildNotionProperties(linkData),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion update error: ${response.status} — ${errorText}`);
    }
};

/**
 * Delete (archive) a link in Notion
 */
export const deleteLink = async (
    token: string,
    databaseId: string,
    url: string
): Promise<void> => {
    const pageId = await findPageByUrl(token, databaseId, url);
    if (!pageId) {
        throw new Error('Ссылка не найдена в Notion');
    }

    const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({ archived: true }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion delete error: ${response.status} — ${errorText}`);
    }
};

/**
 * Validate connection to Notion (check that token and database are accessible)
 */
export const validateConnection = async (
    token: string,
    databaseId: string
): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
        return { success: false, error: 'Notion Token не указан' };
    }
    if (!databaseId) {
        return { success: false, error: 'Database ID не указан' };
    }

    try {
        const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}`, {
            method: 'GET',
            headers: getHeaders(token),
        });

        if (response.ok) {
            return { success: true };
        } else {
            const data = await response.json().catch(() => ({}));
            const msg = data.message || `Ошибка API: ${response.status}`;
            return { success: false, error: msg };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Ошибка сети' };
    }
};
