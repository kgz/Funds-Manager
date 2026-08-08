import { cn } from '@/lib/utils/cn';

type RepeatScoreBadgeProps = {
	score: number;
};

export function RepeatScoreBadge({ score }: RepeatScoreBadgeProps) {
	const tier = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
	return (
		<span
			className={cn(
				'inline-flex h-[22px] min-w-[34px] items-center justify-center rounded-full px-[7px] font-mono text-xs font-medium',
				tier === 'high' &&
					'border border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_10%,var(--surface))] text-[color:var(--success)]',
				tier === 'mid' &&
					'border border-[color-mix(in_oklch,var(--warn)_32%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_12%,var(--surface))] text-[oklch(45%_0.12_75)]',
				tier === 'low' && 'border border-paper-border bg-paper text-paper-muted'
			)}
		>
			{score}
		</span>
	);
}
