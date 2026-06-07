import { useMemo } from 'react';
import type { Category } from '@/store/thunks/category.get.all';
import { buildCategorySelectGroups } from '@/lib/utils/categoryGroups';
import { cn } from '@/lib/utils/cn';

type CategoryPickerProps = {
	value: string;
	categories: Category[];
	disabled?: boolean;
	onChange: (categoryId: string) => void;
	className?: string;
	placeholder?: string;
};

export function CategoryPicker({
	value,
	categories,
	disabled = false,
	onChange,
	className,
	placeholder = 'Uncategorized',
}: CategoryPickerProps) {
	const { ungrouped, groups } = useMemo(
		() => buildCategorySelectGroups(categories),
		[categories]
	);

	const activeIds = useMemo(
		() => new Set(categories.filter((c) => !c.deleted_at).map((c) => c.id)),
		[categories]
	);

	const missingActiveOption = value !== '' && !activeIds.has(value);
	const namedCategory = categories.find((cat) => cat.id === value);

	return (
		<select
			value={value}
			disabled={disabled}
			onChange={(event) => onChange(event.target.value)}
			className={cn(
				'max-w-[14rem] text-xs bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white',
				className
			)}
		>
			<option value="">{placeholder}</option>
			{missingActiveOption ? (
				<option value={value}>
					{namedCategory
						? `${namedCategory.name}${namedCategory.deleted_at ? ' (deleted)' : ''}`
						: `Category #${value}`}
				</option>
			) : null}
			{ungrouped.map((category) => (
				<option key={category.id} value={category.id}>
					{category.colour ? `● ` : ''}
					{category.name}
				</option>
			))}
			{groups.map((group) => (
				<optgroup key={group.label} label={group.label}>
					{group.options.map((category) => (
						<option key={category.id} value={category.id}>
							{category.parent_category_id ? `  ${category.name}` : category.name}
						</option>
					))}
				</optgroup>
			))}
		</select>
	);
}
