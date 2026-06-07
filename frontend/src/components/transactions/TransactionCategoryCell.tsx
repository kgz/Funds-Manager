import { ArrowRight } from 'lucide-react';
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
	const suggestedCategory = suggestion
		? categories.find((cat) => cat.id === String(suggestion.categoryId))
		: undefined;

	const pickButton = suggestion ? (
		<button
			type="button"
			disabled={busy}
			onClick={() => onPickSuggestion(row.id, suggestion.categoryId)}
			className={cn(
				'inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1.5',
				'bg-gray-800/80 text-secondary-default border border-secondary-default/40',
				'hover:bg-white/10 hover:border-secondary-default/60 active:scale-[0.98]',
				'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
				'transition-colors shrink-0 max-w-[11rem]'
			)}
			title={suggestion.hint ?? `Use ${suggestion.categoryName}`}
		>
			{suggestedCategory?.colour ? (
				<span
					className="w-2 h-2 rounded-full shrink-0"
					style={{ backgroundColor: suggestedCategory.colour }}
				/>
			) : null}
			<span className="truncate">{suggestion.categoryName}</span>
			<ArrowRight size={12} className="shrink-0 opacity-80" />
		</button>
	) : null;

	if (isUncategorized && suggestion) {
		return (
			<div className="flex items-center justify-center gap-2 flex-wrap">
				{pickButton}
				<span className="text-[10px] uppercase tracking-wide text-white/35">or</span>
				<CategoryPicker
					value={current}
					categories={categories}
					disabled={busy}
					onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
					className="max-w-[9rem]"
				/>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center gap-2 flex-wrap">
			<CategoryPicker
				value={current}
				categories={categories}
				disabled={busy}
				onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
			/>
			{pickButton}
		</div>
	);
}
