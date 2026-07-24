import type { Transaction } from '@/types/transaction';
import type { Category } from '@/store/thunks/category.get.all';
import { CategoryPicker } from './CategoryPicker';
import { cn } from '@/lib/utils/cn';
export type CategorySuggestion = {
	categoryId: number;
	categoryName: string;
	hint?: string;
};

type TransactionCategoryCellProps = {
	row: Transaction;
	categories: Category[];
	busy: boolean;
	suggestion: CategorySuggestion | null;
	onCategoryChange: (transactionId: number, categoryId: string) => void;
	onPickSuggestion: (transactionId: number, categoryId: number) => void;
};

export function TransactionCategoryCell({
	row,
	categories,
	busy,
	suggestion,
	onCategoryChange,
	onPickSuggestion,
}: TransactionCategoryCellProps) {
	const current =
		row.category_id === null || row.category_id === undefined
			? ''
			: String(row.category_id);

	const isUncategorized = current === '';
	const showSuggestion = isUncategorized && suggestion !== null;

	return (
		<div className="flex flex-wrap items-center justify-end gap-1.5">
			<div
				className={cn(
					'inline-flex max-w-[11rem] items-center rounded-paper border border-paper-border bg-paper-surface px-1.5',
					isUncategorized &&
						'border-[color-mix(in_oklch,var(--warn)_38%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_6%,var(--surface))]'
				)}
			>
				<CategoryPicker
					value={current}
					categories={categories}
					disabled={busy}
					variant="chip"
					onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
					className="w-[10rem] max-w-full"
				/>
			</div>
			{showSuggestion && suggestion ? (
				<button
					type="button"
					disabled={busy}
					onClick={() => onPickSuggestion(row.id, suggestion.categoryId)}
					title={suggestion.hint ?? `Apply suggested category: ${suggestion.categoryName}`}
					className={cn(
						'inline-flex h-6 max-w-full items-center gap-1 rounded-paper border border-dashed',
						'border-[color-mix(in_oklch,var(--accent)_35%,var(--border))]',
						'bg-[color-mix(in_oklch,var(--accent)_4%,var(--surface))] px-2',
						'text-[11px] font-medium text-secondary-default',
						'transition-colors hover:border-[color-mix(in_oklch,var(--accent)_50%,var(--border))]',
						'hover:bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))]',
						'disabled:cursor-not-allowed disabled:opacity-50'
					)}
				>
					<span className="font-normal text-paper-muted">Apply</span>
					<span className="truncate">{suggestion.categoryName}</span>
				</button>
			) : null}
		</div>
	);
}
