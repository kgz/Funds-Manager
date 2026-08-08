import { Link2 } from 'lucide-react';
import type { Category } from '@/store/thunks/category.get.all';
import { cn } from '@/lib/utils/cn';
import {
	formatPlannedMoneyFromCents,
	formatSignedMoneyFromCents,
	moneyClassForPlannedCents,
	moneyClassForSignedCents,
} from '@/lib/utils/moneySemantics';
import type { PlannedMatchSuggestion } from '@/types/plannedSpending';
import { DateTime } from 'luxon';

const plannedBtnSmClass =
	'inline-flex h-[26px] cursor-pointer items-center justify-center gap-1 rounded-paper border border-paper-border bg-paper-surface px-2 text-xs font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const plannedBtnAccentSmClass =
	'inline-flex h-[26px] cursor-pointer items-center justify-center gap-1 rounded-paper border border-[color-mix(in_oklch,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))] px-2 text-xs font-medium tracking-[0.02em] text-secondary-default transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_18%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

function formatPlannedDate(isoDate: string): string {
	return DateTime.fromISO(isoDate).toFormat('d MMM yyyy');
}

function categoryLabel(cat: Category, categories: Category[]): string {
	if (cat.parent_category_id) {
		const parent = categories.find((p) => p.id === cat.parent_category_id);
		if (parent) {
			return `${parent.name} › ${cat.name}`;
		}
	}
	return cat.name;
}

function categoryById(categories: Category[], categoryId: string | null): Category | null {
	if (categoryId === null) {
		return null;
	}
	return categories.find((cat) => cat.id === categoryId) ?? null;
}

function matchReasonLabel(reason: string): string {
	switch (reason) {
		case 'exact_amount':
			return 'Same amount';
		case 'amount_within_tolerance':
			return 'Close amount';
		case 'exact_date':
			return 'Same date';
		case 'date_within_tolerance':
			return 'Close date';
		case 'category_match':
			return 'Category matches';
		case 'description_match':
			return 'Description matches';
		case 'partial_payment':
			return 'Partial payment';
		default:
			return reason.replace(/_/g, ' ');
	}
}

function formatVarianceLabel(suggestion: PlannedMatchSuggestion): string {
	const parts: string[] = [];
	if (suggestion.amount_variance_cents > 0) {
		const abs = (suggestion.amount_variance_cents / 100).toLocaleString('en-AU', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		parts.push(`$${abs} off amount`);
	}
	if (suggestion.date_variance_days > 0) {
		const days = suggestion.date_variance_days;
		parts.push(`${days} day${days === 1 ? '' : 's'} off date`);
	}
	return parts.length > 0 ? parts.join(' · ') : 'Exact amount and date';
}

type PlannedMatchCalloutProps = {
	suggestions: PlannedMatchSuggestion[];
	categories: Category[];
	busy: boolean;
	onLink: (suggestion: PlannedMatchSuggestion) => void;
	onDismiss: (suggestion: PlannedMatchSuggestion) => void;
};

export function PlannedMatchCallout({
	suggestions,
	categories,
	busy,
	onLink,
	onDismiss,
}: PlannedMatchCalloutProps) {
	if (suggestions.length === 0) {
		return null;
	}

	const title =
		suggestions.length === 1
			? '1 planned item may match an imported transaction'
			: `${suggestions.length} planned items may match imported transactions`;

	return (
		<div
			className={cn(
				'rounded-[10px] border border-[color-mix(in_oklch,var(--warn)_32%,var(--border))]',
				'bg-[color-mix(in_oklch,var(--warn)_6%,var(--surface))] px-[18px] py-4'
			)}
		>
			<div className="mb-3.5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-grid min-w-5 h-5 place-items-center rounded-full bg-[oklch(45%_0.12_75)] px-1.5 font-mono text-[11px] font-semibold text-paper-surface">
						{suggestions.length}
					</span>
					<span className="text-[13px] font-semibold text-paper-fg">{title}</span>
				</div>
				<p className="m-0 mt-1.5 text-xs text-paper-muted">
					Review each pair and link manually — nothing is applied until you confirm.
				</p>
			</div>

			<div className="flex flex-col gap-2.5">
				{suggestions.map((suggestion) => {
					const plannedCat = categoryById(categories, suggestion.planned.category_id);
					const txnCat =
						suggestion.transaction.category_id === null
							? null
							: categoryById(categories, String(suggestion.transaction.category_id));

					return (
						<div
							key={`${suggestion.planned.id}-${suggestion.transaction.id}`}
							className="rounded-lg border border-paper-border bg-paper-surface px-3.5 py-3"
						>
							<div className="grid items-center gap-3.5 lg:grid-cols-[1fr_auto_1fr]">
								<div className="min-w-0">
									<span className="mb-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-paper-muted">
										Planned
									</span>
									<p className="m-0 truncate text-[13px] font-medium text-paper-fg">
										{suggestion.planned.name}
									</p>
									<p className="m-0 mt-0.5 text-[11.5px] text-paper-muted">
										<span
											className={cn(
												'font-mono tabular-nums',
												moneyClassForPlannedCents(suggestion.planned.amount_cents)
											)}
										>
											{formatPlannedMoneyFromCents(suggestion.planned.amount_cents)}
										</span>
										{' · '}
										{formatPlannedDate(suggestion.planned.start_date)}
										{plannedCat ? ` · ${categoryLabel(plannedCat, categories)}` : ''}
									</p>
									{suggestion.planned.notes ? (
										<p className="m-0 mt-0.5 truncate text-[11.5px] text-paper-muted">
											{suggestion.planned.notes}
										</p>
									) : null}
								</div>

								<div className="hidden justify-center text-paper-muted lg:flex" aria-hidden>
									<Link2 className="h-4 w-4" />
								</div>

								<div className="min-w-0">
									<span className="mb-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.06em] text-paper-muted">
										Bank transaction
									</span>
									<p className="m-0 truncate text-[13px] font-medium text-paper-fg">
										{suggestion.transaction.description}
									</p>
									<p className="m-0 mt-0.5 text-[11.5px] text-paper-muted">
										<span
											className={cn(
												'font-mono tabular-nums',
												moneyClassForSignedCents(suggestion.transaction.amount)
											)}
										>
											{formatSignedMoneyFromCents(suggestion.transaction.amount)}
										</span>
										{' · '}
										{formatPlannedDate(suggestion.transaction.transaction_date)}
										{' · '}
										{suggestion.transaction.account_label}
										{txnCat ? ` · ${categoryLabel(txnCat, categories)}` : ''}
									</p>
								</div>
							</div>

							<div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-paper-border pt-3">
								<div className="flex flex-wrap gap-1.5">
									<span className="inline-flex h-5 items-center rounded-full border border-paper-border bg-paper px-2 text-[10.5px] text-paper-muted">
										{formatVarianceLabel(suggestion)}
									</span>
									{suggestion.reasons.slice(0, 3).map((reason) => (
										<span
											key={reason}
											className="inline-flex h-5 items-center rounded-full border border-paper-border bg-paper px-2 text-[10.5px] text-paper-muted"
										>
											{matchReasonLabel(reason)}
										</span>
									))}
								</div>
								<div className="flex shrink-0 gap-2">
									<button
										type="button"
										className={plannedBtnAccentSmClass}
										disabled={busy}
										onClick={() => onLink(suggestion)}
									>
										Add payment link
									</button>
									<button
										type="button"
										className={plannedBtnSmClass}
										disabled={busy}
										onClick={() => onDismiss(suggestion)}
									>
										Not a match
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
