import { cn } from '@/lib/utils/cn';

type RepeatFlowChipProps = {
	flow: 'expense' | 'income';
};

export function RepeatFlowChip({ flow }: RepeatFlowChipProps) {
	const isIncome = flow === 'income';
	return (
		<span
			className={cn(
				'inline-flex h-[18px] shrink-0 items-center rounded-full border px-[7px] text-[9.5px] font-semibold uppercase tracking-[0.06em]',
				isIncome
					? 'border-[color-mix(in_oklch,var(--success)_35%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[color:var(--success)]'
					: 'border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] text-[color:var(--danger)]'
			)}
		>
			{isIncome ? 'Income' : 'Spending'}
		</span>
	);
}
