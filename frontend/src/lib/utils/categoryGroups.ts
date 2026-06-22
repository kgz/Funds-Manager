import type { Category } from '@/store/thunks/category.get.all';

export type CategorySelectGroup = {
	label: string;
	options: Category[];
};

function activeCategories(categories: Category[]): Category[] {
	return categories.filter((category) => !category.deleted_at);
}

export function categoryBreadcrumb(category: Category, categories: Category[]): string {
	const names: string[] = [];
	let current: Category | undefined = category;
	while (current) {
		names.unshift(current.name);
		if (!current.parent_category_id) {
			break;
		}
		current = categories.find((item) => item.id === current?.parent_category_id);
	}
	return names.join(' › ');
}

export function categoryLabel(category: Category, categories: Category[]): string {
	return categoryBreadcrumb(category, categories);
}

function collectDescendants(active: Category[], rootId: string): Category[] {
	const result: Category[] = [];
	const walk = (parentId: string) => {
		const children = active
			.filter((category) => category.parent_category_id === parentId)
			.sort((a, b) => a.name.localeCompare(b.name));
		for (const child of children) {
			result.push(child);
			walk(child.id);
		}
	};
	walk(rootId);
	return result;
}

export function buildCategorySelectGroups(
	categories: Category[]
): { ungrouped: Category[]; groups: CategorySelectGroup[] } {
	const active = activeCategories(categories);
	const roots = active
		.filter((category) => !category.parent_category_id)
		.sort((a, b) => a.name.localeCompare(b.name));

	const ungrouped: Category[] = [];
	const groups: CategorySelectGroup[] = [];

	for (const root of roots) {
		const descendants = collectDescendants(active, root.id);
		if (descendants.length === 0) {
			ungrouped.push(root);
			continue;
		}
		const options = [root, ...descendants].sort((a, b) =>
			categoryBreadcrumb(a, active).localeCompare(categoryBreadcrumb(b, active))
		);
		groups.push({
			label: root.name,
			options,
		});
	}

	return { ungrouped, groups };
}
