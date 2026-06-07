import { Check } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import type { Category } from '@/store/thunks/category.get.all';
import { CategoryPicker } from './CategoryPicker';
import { buttonAccentClass } from '@/components/layout/tokens';
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

const CATEGORY_ROW_GRID =
	'mx-auto grid w-[22.5rem] max-w-full grid-cols-[10.5rem_1.25rem_10.5rem] items-center gap-x-1';

const PICKER_CLASS = 'h-8 w-full';

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
	const suggestedCategory = suggestion
		? categories.find((cat) => cat.id === String(suggestion.categoryId))
		: undefined;

	const picker = (
		<CategoryPicker
			value={current}
			categories={categories}
			disabled={busy}
			onChange={(categoryId) => onCategoryChange(row.id, categoryId)}
			className={PICKER_CLASS}
		/>
	);

	const applySuggestionButton = suggestion ? (
		<button
			type="button"
			disabled={busy}
			onClick={() => onPickSuggestion(row.id, suggestion.categoryId)}
			className={cn(
				buttonAccentClass,
				'flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-xs',
				'active:scale-[0.98] transition-transform'
			)}
			title={suggestion.hint ?? `Apply suggested category: ${suggestion.categoryName}`}
		>
			<Check size={13} className="shrink-0" aria-hidden />
			<span className="shrink-0 font-semibold">Apply</span>
			{suggestedCategory?.colour ? (
				<span
					className="h-2 w-2 shrink-0 rounded-full"
					style={{ backgroundColor: suggestedCategory.colour }}
				/>
			) : null}
			<span className="min-w-0 flex-1 truncate text-left font-medium">
				{suggestion.categoryName}
			</span>
		</button>
	) : null;

	return (
		<div className={CATEGORY_ROW_GRID}>
			<div className="min-w-0">
				{showSuggestion ? applySuggestionButton : null}
			</div>
			<div className="text-center">
				{showSuggestion ? (
					<span className="text-[10px] uppercase tracking-wide text-white/35">
						or
					</span>
				) : null}
			</div>
			<div className="min-w-0">{picker}</div>
		</div>
	);
}
