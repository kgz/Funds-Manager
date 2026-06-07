import type { Category } from '@/store/thunks/category.get.all';

export type CategorySelectGroup = {
	label: string;
	options: Category[];
};

export function buildCategorySelectGroups(
	categories: Category[]
): { ungrouped: Category[]; groups: CategorySelectGroup[] } {
	const active = categories.filter((category) => !category.deleted_at);
	const parents = active
		.filter((category) => !category.parent_category_id)
		.sort((a, b) => a.name.localeCompare(b.name));

	const subsByParent = new Map<string, Category[]>();
	for (const category of active) {
		if (!category.parent_category_id) {
			continue;
		}
		const list = subsByParent.get(category.parent_category_id) ?? [];
		list.push(category);
		subsByParent.set(category.parent_category_id, list);
	}

	const ungrouped: Category[] = [];
	const groups: CategorySelectGroup[] = [];

	for (const parent of parents) {
		const subs = (subsByParent.get(parent.id) ?? []).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
		if (subs.length > 0) {
			groups.push({
				label: parent.name,
				options: [parent, ...subs],
			});
		} else {
			ungrouped.push(parent);
		}
	}

	return { ungrouped, groups };
}

export function categoryLabel(category: Category, parentName?: string): string {
	if (category.parent_category_id && parentName) {
		return `${parentName} › ${category.name}`;
	}
	return category.name;
}
