import { inputDarkClass } from '@/components/layout/tokens';
import {
	buildCategorySelectGroups,
	categoryBreadcrumb,
} from '@/lib/utils/categoryGroups';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category } from '@/store/thunks/category.get.all';

type CategoryPickerProps = {
	value: string;
	categories: Category[];
	disabled?: boolean;
	onChange: (categoryId: string) => void;
	className?: string;
	placeholder?: string;
	searchable?: boolean;
	variant?: 'compact' | 'form';
};

function categoryDisplayName(
	category: Category,
	categories: Category[]
): string {
	return categoryBreadcrumb(category, categories);
}

function categoryDepth(category: Category, categories: Category[]): number {
	let depth = 0;
	let current: Category | undefined = category;
	while (current?.parent_category_id) {
		depth += 1;
		current = categories.find((item) => item.id === current?.parent_category_id);
	}
	return depth;
}

function optionLabelInGroup(
	category: Category,
	categories: Category[],
	groupLabel: string
): string {
	const breadcrumb = categoryBreadcrumb(category, categories);
	if (!category.parent_category_id) {
		return category.name;
	}
	const prefix = `${groupLabel} › `;
	if (breadcrumb.startsWith(prefix)) {
		return breadcrumb.slice(prefix.length);
	}
	return breadcrumb;
}

function categoryMatchesQuery(
	category: Category,
	categories: Category[],
	query: string
): boolean {
	const normalized = query.trim().toLowerCase();
	if (normalized.length === 0) {
		return true;
	}
	return (
		categoryDisplayName(category, categories).toLowerCase().includes(normalized) ||
		category.name.toLowerCase().includes(normalized)
	);
}

export function CategoryPicker({
	value,
	categories,
	disabled = false,
	onChange,
	className,
	placeholder = 'Uncategorized',
	searchable = false,
	variant = 'compact',
}: CategoryPickerProps) {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [menuRect, setMenuRect] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchableTriggerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	const { ungrouped, groups } = useMemo(
		() => buildCategorySelectGroups(categories),
		[categories]
	);

	const filteredUngrouped = useMemo(
		() =>
			ungrouped.filter((category) =>
				categoryMatchesQuery(category, categories, searchQuery)
			),
		[ungrouped, categories, searchQuery]
	);

	const filteredGroups = useMemo(
		() =>
			groups
				.map((group) => ({
					...group,
					options: group.options.filter((category) =>
						categoryMatchesQuery(category, categories, searchQuery)
					),
				}))
				.filter((group) => group.options.length > 0),
		[groups, categories, searchQuery]
	);

	const activeIds = useMemo(
		() => new Set(categories.filter((c) => !c.deleted_at).map((c) => c.id)),
		[categories]
	);

	const missingActiveOption = value !== '' && !activeIds.has(value);
	const selectedCategory = categories.find((cat) => cat.id === value);

	const openSearch = () => {
		if (disabled) {
			return;
		}
		const wasOpen = open;
		setOpen(true);
		if (!wasOpen) {
			setSearchQuery('');
		}
		requestAnimationFrame(() => {
			searchRef.current?.focus();
		});
	};

	useEffect(() => {
		if (!open) {
			setMenuRect(null);
			setSearchQuery('');
			return;
		}
		const updatePosition = () => {
			const anchor = searchable
				? searchableTriggerRef.current
				: triggerRef.current;
			if (!anchor) {
				return;
			}
			const rect = anchor.getBoundingClientRect();
			setMenuRect({
				top: rect.bottom + 4,
				left: rect.left,
				width: rect.width,
			});
		};
		updatePosition();
		window.addEventListener('resize', updatePosition);

		const onScroll = (event: Event) => {
			const target = event.target;
			if (target instanceof Node && menuRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};
		window.addEventListener('scroll', onScroll, true);

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (rootRef.current?.contains(target)) {
				return;
			}
			if (menuRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);

		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', onScroll, true);
			document.removeEventListener('pointerdown', onPointerDown);
		};
	}, [open, searchable]);

	const selectValue = (categoryId: string) => {
		onChange(categoryId);
		setOpen(false);
	};

	const triggerLabel =
		value === '' || !selectedCategory
			? placeholder
			: selectedCategory.deleted_at
				? `${selectedCategory.name} (deleted)`
				: categoryDisplayName(selectedCategory, categories);

	const triggerClass =
		variant === 'form'
			? 'min-h-10 px-3 py-2 text-sm'
			: 'min-h-8 px-2 py-1.5 text-xs';

	const showEmptyResults =
		searchable &&
		searchQuery.trim().length > 0 &&
		filteredUngrouped.length === 0 &&
		filteredGroups.length === 0;

	const categoryDot = selectedCategory?.colour ? (
		<span
			className="h-2 w-2 shrink-0 rounded-full"
			style={{ backgroundColor: selectedCategory.colour }}
		/>
	) : (
		<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
	);

	const menuContent = (
		<>
			<button
				type="button"
				role="option"
				aria-selected={value === ''}
				onClick={() => selectValue('')}
				className={cn(
					'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 cursor-pointer',
					'hover:bg-white/10',
					value === '' && 'bg-secondary-default/20 text-white'
				)}
			>
				<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
				<span className="text-white/70">{placeholder}</span>
			</button>

			{missingActiveOption && selectedCategory ? (
				<button
					type="button"
					role="option"
					aria-selected={value === selectedCategory.id}
					onClick={() => selectValue(selectedCategory.id)}
					className={cn(
						'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 cursor-pointer',
						'hover:bg-white/10',
						value === selectedCategory.id &&
							'bg-secondary-default/20 text-white'
					)}
				>
					{selectedCategory.colour ? (
						<span
							className="h-2 w-2 shrink-0 rounded-full"
							style={{ backgroundColor: selectedCategory.colour }}
						/>
					) : (
						<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
					)}
					<span className="truncate">
						{selectedCategory.name}
						{selectedCategory.deleted_at ? ' (deleted)' : ''}
					</span>
				</button>
			) : null}

			{showEmptyResults ? (
				<p className="px-3 py-2 text-xs text-white/45">
					No categories match your search.
				</p>
			) : null}

			{filteredUngrouped.map((category) => (
				<button
					key={category.id}
					type="button"
					role="option"
					aria-selected={value === category.id}
					onClick={() => selectValue(category.id)}
					className={cn(
						'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 cursor-pointer',
						'hover:bg-white/10',
						value === category.id && 'bg-secondary-default/20 text-white'
					)}
				>
					{category.colour ? (
						<span
							className="h-2 w-2 shrink-0 rounded-full"
							style={{ backgroundColor: category.colour }}
						/>
					) : (
						<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
					)}
					<span className="truncate">{category.name}</span>
				</button>
			))}

			{filteredGroups.map((group) => (
				<div key={group.label}>
					<div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
						{group.label}
					</div>
					{group.options.map((category) => {
						const depth = categoryDepth(category, categories);
						return (
							<button
								key={category.id}
								type="button"
								role="option"
								aria-selected={value === category.id}
								onClick={() => selectValue(category.id)}
								className={cn(
									'flex w-full items-center gap-2 py-2 pr-3 text-left text-xs text-white/85 cursor-pointer',
									depth === 0 ? 'px-3' : depth === 1 ? 'pl-6' : 'pl-9',
									'hover:bg-white/10',
									value === category.id &&
										'bg-secondary-default/20 text-white'
								)}
							>
								{category.colour ? (
									<span
										className="h-2 w-2 shrink-0 rounded-full"
										style={{ backgroundColor: category.colour }}
									/>
								) : (
									<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
								)}
								<span className="truncate">
									{optionLabelInGroup(category, categories, group.label)}
								</span>
							</button>
						);
					})}
				</div>
			))}
		</>
	);

	return (
		<div ref={rootRef} className={cn('relative', className)}>
			{searchable ? (
				<div
					ref={searchableTriggerRef}
					className={cn(
						inputDarkClass,
						'flex w-full items-center gap-2',
						triggerClass,
						disabled && 'opacity-50',
						open && 'border-secondary-default/50 ring-1 ring-secondary-default/40'
					)}
				>
					{!open && value !== '' ? categoryDot : null}
					<input
						ref={searchRef}
						type="text"
						disabled={disabled}
						value={open ? searchQuery : value === '' ? '' : triggerLabel}
						readOnly={!open}
						placeholder={open ? 'Search categories…' : placeholder}
						onFocus={() => {
							if (!open) {
								openSearch();
							}
						}}
						onClick={() => {
							if (!open) {
								openSearch();
							}
						}}
						onChange={(event) => setSearchQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								setOpen(false);
							}
						}}
						className={cn(
							'min-w-0 flex-1 bg-transparent p-0 text-inherit outline-none',
							open
								? 'cursor-text placeholder:text-white/40'
								: 'cursor-pointer placeholder:text-white/50'
						)}
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-label="Search categories"
					/>
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							if (open) {
								setOpen(false);
								return;
							}
							openSearch();
						}}
						className="shrink-0 cursor-pointer text-white/50 hover:text-white/80 disabled:cursor-not-allowed"
						aria-label={open ? 'Close category list' : 'Open category list'}
					>
						<ChevronDown
							size={14}
							className={cn('transition-transform', open && 'rotate-180')}
						/>
					</button>
				</div>
			) : (
				<button
					ref={triggerRef}
					type="button"
					disabled={disabled}
					onClick={() => setOpen((current) => !current)}
					className={cn(
						inputDarkClass,
						'flex h-full w-full items-center gap-2 text-left',
						triggerClass,
						'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
						open && 'border-secondary-default/50 ring-1 ring-secondary-default/40'
					)}
					aria-haspopup="listbox"
					aria-expanded={open}
				>
					{categoryDot}
					<span
						className={cn(
							'min-w-0 flex-1 truncate',
							value === '' ? 'text-white/50' : 'text-white'
						)}
					>
						{triggerLabel}
					</span>
					<ChevronDown
						size={14}
						className={cn(
							'shrink-0 text-white/50 transition-transform',
							open && 'rotate-180'
						)}
					/>
				</button>
			)}

			{open && menuRect
				? createPortal(
						<div
							ref={menuRef}
							style={{
								position: 'fixed',
								top: menuRect.top,
								left: menuRect.left,
								width: menuRect.width,
							}}
							className={cn(
								'z-[60] max-h-60 overflow-y-auto rounded-xl border border-white/10',
								'bg-gray-950 text-white shadow-xl shadow-black/60'
							)}
							role="listbox"
						>
							{menuContent}
						</div>,
						document.body
					)
				: null}
		</div>
	);
}
