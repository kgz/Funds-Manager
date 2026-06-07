const EXPANDED_STORAGE_KEY = 'categoriesExpanded';

export function readExpandedCategoryIds(): Set<string> {
	try {
		const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
		if (!raw) {
			return new Set();
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return new Set();
		}
		const ids: string[] = [];
		for (const item of parsed) {
			if (typeof item === 'string' && item.length > 0) {
				ids.push(item);
			}
		}
		return new Set(ids);
	} catch {
		return new Set();
	}
}

export function writeExpandedCategoryIds(ids: Set<string>): void {
	localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]));
}
