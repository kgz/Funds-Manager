import type { Transaction } from '@/types/transaction';
import { cn } from '@/lib/utils/cn';

type TransactionDescriptionCellProps = {
	description: string;
	row: Transaction;
};

function isPendingStatus(status: string): boolean {
	return status.trim().toLowerCase() === 'pending';
}

export function TransactionDescriptionCell({
	description,
	row,
}: TransactionDescriptionCellProps) {
	const showTransfer =
		row.is_transfer_leg && row.transfer_pair_status === 'confirmed';
	const showPending = isPendingStatus(row.status);

	return (
		<div className="flex min-w-0 items-center gap-2">
			<span className="min-w-0 truncate">{description}</span>
			{showPending || showTransfer ? (
				<span className="inline-flex shrink-0 items-center gap-1">
					{showPending ? (
						<span
							className={cn(
								'inline-flex h-[18px] items-center rounded-full border px-1.5',
								'text-[10px] font-semibold uppercase tracking-wide',
								'border-[color-mix(in_oklch,var(--warn)_40%,var(--border))]',
								'bg-[color-mix(in_oklch,var(--warn)_8%,var(--bg))]',
								'text-[oklch(48%_0.08_75)]'
							)}
						>
							Pending
						</span>
					) : null}
					{showTransfer ? (
						<span className="inline-flex h-[18px] items-center rounded-full border border-paper-border bg-paper px-1.5 text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
							Transfer
						</span>
					) : null}
				</span>
			) : null}
		</div>
	);
}
