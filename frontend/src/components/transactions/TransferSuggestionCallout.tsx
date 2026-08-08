import { ArrowLeftRight } from 'lucide-react';
import { buttonOutlineClass } from '@/components/layout/tokens';
import { chartColors } from '@/graphs/theme';
import type { TransferSuggestion } from '@/types/transfer';

const txPrimaryButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

function formatSignedMoney(cents: number): string {
	const abs = Math.abs(cents / 100).toFixed(2);
	return `${cents < 0 ? '−' : '+'}$${abs}`;
}

type TransferSuggestionCalloutProps = {
	suggestion: TransferSuggestion;
	busy: boolean;
	onConfirm: () => void;
	onDismiss: () => void;
};

export function TransferSuggestionCallout({
	suggestion,
	busy,
	onConfirm,
	onDismiss,
}: TransferSuggestionCalloutProps) {
	return (
		<div className="mx-4 mt-4 mb-3 flex flex-col gap-3 rounded-paper border border-[color-mix(in_oklch,var(--warn)_32%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_7%,var(--surface))] p-3.5 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex min-w-0 items-start gap-2.5">
				<span
					className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color-mix(in_oklch,var(--warn)_28%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_14%,var(--surface))] text-[oklch(45%_0.12_75)]"
					aria-hidden
				>
					<ArrowLeftRight size={14} />
				</span>
				<div className="min-w-0 text-[13px] leading-snug">
					<strong className="block font-semibold text-paper-fg">
						Transfer match found
					</strong>
					<p className="mt-0.5 text-xs text-paper-muted">
						These two legs look like the same internal transfer — confirm to link
						and categorise as transfers.
					</p>
					<div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-2">
						<span className="inline-flex items-center gap-1.5 text-xs text-paper-fg">
							<span className="text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
								Out
							</span>
							<span className="truncate">
								{suggestion.outTransaction.accountLabel}
							</span>
							<span
								className="font-mono tabular-nums"
								style={{ color: chartColors.spending }}
							>
								{formatSignedMoney(suggestion.outTransaction.amount)}
							</span>
						</span>
						<span className="inline-flex items-center gap-1.5 text-xs text-paper-fg">
							<span className="text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
								In
							</span>
							<span className="truncate">
								{suggestion.inTransaction.accountLabel}
							</span>
							<span
								className="font-mono tabular-nums"
								style={{ color: chartColors.receiving }}
							>
								{formatSignedMoney(suggestion.inTransaction.amount)}
							</span>
						</span>
					</div>
				</div>
			</div>
			<div className="flex shrink-0 items-center justify-end gap-1.5">
				<button
					type="button"
					disabled={busy}
					onClick={onDismiss}
					className={buttonOutlineClass}
				>
					Dismiss
				</button>
				<button
					type="button"
					disabled={busy}
					onClick={onConfirm}
					className={txPrimaryButtonClass}
				>
					Confirm transfer
				</button>
			</div>
		</div>
	);
}
