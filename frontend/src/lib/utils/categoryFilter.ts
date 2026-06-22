import type { Category } from '@/store/thunks/category.get.all';

function normalizedQuery(query: string): string {
	return query.trim().toLowerCase();
}

export function categoryMatchesQuery(category: Category, query: string): boolean {
	const q = normalizedQuery(query);
	if (q.length === 0) {
		return true;
	}
	if (category.name.toLowerCase().includes(q)) {
		return true;
	}
	if (category.description?.toLowerCase().includes(q)) {
		return true;
	}
	return false;
}

export function descendantCategories(
	categories: Category[],
	parentId: string,
	showDeleted: boolean
): Category[] {
	const result: Category[] = [];
	const queue = [parentId];
	while (queue.length > 0) {
		const currentParentId = queue.shift();
		if (currentParentId === undefined) {
			continue;
		}
		const children = categories.filter(
			(category) =>
				category.parent_category_id === currentParentId &&
				(showDeleted ? true : !category.deleted_at)
		);
		for (const child of children) {
			result.push(child);
			queue.push(child.id);
		}
	}
	return result;
}

export function visibleMainCategories(
	categories: Category[],
	query: string,
	showDeleted: boolean
): Category[] {
	const q = normalizedQuery(query);
	const mains = categories.filter(
		(cat) =>
			!cat.parent_category_id &&
			(showDeleted ? true : !cat.deleted_at)
	);

	if (q.length === 0) {
		return mains;
	}

	return mains.filter((main) => {
		if (categoryMatchesQuery(main, q)) {
			return true;
		}
		return descendantCategories(categories, main.id, showDeleted).some((sub) =>
			categoryMatchesQuery(sub, q)
		);
	});
}

export function visibleSubcategories(
	categories: Category[],
	parentId: string,
	query: string,
	showDeleted: boolean
): Category[] {
	const subs = categories.filter(
		(cat) =>
			cat.parent_category_id === parentId &&
			(showDeleted ? true : !cat.deleted_at)
	);
	const q = normalizedQuery(query);
	if (q.length === 0) {
		return subs;
	}
	return subs.filter((sub) => {
		if (categoryMatchesQuery(sub, q)) {
			return true;
		}
		return descendantCategories(categories, sub.id, showDeleted).some((child) =>
			categoryMatchesQuery(child, q)
		);
	});
}

export function shouldExpandForSearch(
	categories: Category[],
	mainId: string,
	query: string,
	showDeleted: boolean
): boolean {
	const q = normalizedQuery(query);
	if (q.length === 0) {
		return false;
	}
	return descendantCategories(categories, mainId, showDeleted).some((sub) =>
		categoryMatchesQuery(sub, q)
	);
}

export function subcategoryMatchesSearch(
	categories: Category[],
	sub: Category,
	query: string,
	showDeleted: boolean
): boolean {
	if (categoryMatchesQuery(sub, query)) {
		return true;
	}
	return descendantCategories(categories, sub.id, showDeleted).some((child) =>
		categoryMatchesQuery(child, query)
	);
}
