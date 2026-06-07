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
		return categories.some(
			(sub) =>
				sub.parent_category_id === main.id &&
				(showDeleted ? true : !sub.deleted_at) &&
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
	return subs.filter((sub) => categoryMatchesQuery(sub, q));
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
	return visibleSubcategories(categories, mainId, query, showDeleted).length > 0;
}
