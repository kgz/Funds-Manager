import { inputDarkClass } from '@/components/layout/tokens';
import { buildCategorySelectGroups, categoryLabel } from '@/lib/utils/categoryGroups';
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
};

function categoryDisplayName(
	category: Category,
	categories: Category[]
): string {
	if (!category.parent_category_id) {
		return category.name;
	}
	const parent = categories.find((item) => item.id === category.parent_category_id);
	return categoryLabel(category, parent?.name);
}

export function CategoryPicker({
	value,
	categories,
	disabled = false,
	onChange,
	className,
	placeholder = 'Uncategorized',
}: CategoryPickerProps) {
	const [open, setOpen] = useState(false);
	const [menuRect, setMenuRect] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const { ungrouped, groups } = useMemo(
		() => buildCategorySelectGroups(categories),
		[categories]
	);

	const activeIds = useMemo(
		() => new Set(categories.filter((c) => !c.deleted_at).map((c) => c.id)),
		[categories]
	);

	const missingActiveOption = value !== '' && !activeIds.has(value);
	const selectedCategory = categories.find((cat) => cat.id === value);

	useEffect(() => {
		if (!open) {
			setMenuRect(null);
			return;
		}
		const updatePosition = () => {
			if (!triggerRef.current) {
				return;
			}
			const rect = triggerRef.current.getBoundingClientRect();
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
	}, [open]);

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

	return (
		<div ref={rootRef} className={cn('relative', className)}>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
				className={cn(
					inputDarkClass,
					'flex h-full min-h-8 w-full items-center gap-2 px-2 py-1.5 text-left text-xs',
					'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
					open && 'border-secondary-default/50 ring-1 ring-secondary-default/40'
				)}
				aria-haspopup="listbox"
				aria-expanded={open}
			>
				{selectedCategory?.colour ? (
					<span
						className="h-2 w-2 shrink-0 rounded-full"
						style={{ backgroundColor: selectedCategory.colour }}
					/>
				) : (
					<span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
				)}
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
						'z-10 max-h-60 overflow-y-auto rounded-xl border border-white/10',
						'bg-gray-950 py-1 text-white shadow-xl shadow-black/60'
					)}
					role="listbox"
				>
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

					{ungrouped.map((category) => (
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

					{groups.map((group) => (
						<div key={group.label}>
							<div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
								{group.label}
							</div>
							{group.options.map((category) => (
								<button
									key={category.id}
									type="option"
									aria-selected={value === category.id}
									onClick={() => selectValue(category.id)}
									className={cn(
										'flex w-full items-center gap-2 py-2 text-left text-xs text-white/85 cursor-pointer',
										category.parent_category_id ? 'pl-6 pr-3' : 'px-3',
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
									<span className="truncate">{category.name}</span>
								</button>
							))}
						</div>
					))}
				</div>,
				document.body
			) : null}
		</div>
	);
}
