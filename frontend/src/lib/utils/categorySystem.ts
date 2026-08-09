import type { Category } from '@/store/thunks/category.get.all';

const SYSTEM_CATEGORY_NAMES = new Set(['Transfers', 'Uncategorized']);

export function isSystemCategory(category: Pick<Category, 'name'>): boolean {
	return SYSTEM_CATEGORY_NAMES.has(category.name);
}

export function formatDeletedLabel(deletedAt: string): string {
	const deletedDate = new Date(deletedAt);
	if (Number.isNaN(deletedDate.getTime())) {
		return 'Deleted';
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const deletedDay = new Date(deletedDate);
	deletedDay.setHours(0, 0, 0, 0);
	const days = Math.round(
		(today.getTime() - deletedDay.getTime()) / 86_400_000
	);

	if (days <= 0) {
		return 'Deleted today';
	}
	if (days === 1) {
		return 'Deleted 1 day ago';
	}
	if (days < 14) {
		return `Deleted ${days} days ago`;
	}
	const weeks = Math.round(days / 7);
	return `Deleted ${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

export function sortCategoriesDeletedLast(items: Category[]): Category[] {
	return [...items].sort((left, right) => {
		const leftDeleted = left.deleted_at ? 1 : 0;
		const rightDeleted = right.deleted_at ? 1 : 0;
		if (leftDeleted !== rightDeleted) {
			return leftDeleted - rightDeleted;
		}
		return (left.sort_order ?? 0) - (right.sort_order ?? 0);
	});
}
