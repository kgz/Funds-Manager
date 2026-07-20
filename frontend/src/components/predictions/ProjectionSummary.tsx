import { cn } from '@/lib/utils/cn';
import { chartColors } from '@/graphs/theme';

type ProjectionSummaryProps = {
	startingCents: number;
	projectedEndCents: number;
	monthlyNetCents: number;
	className?: string;
};

const formatMoneyFromCents = (cents: number) => {
	const dollars = cents / 100;
	const abs = Math.abs(dollars);
	return `$${abs.toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const formatSignedFromCents = (cents: number) => {
	const dollars = cents / 100;
	const abs = Math.abs(dollars);
	const body = `$${abs.toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
	if (dollars > 0) {
		return `+${body}`;
	}
	if (dollars < 0) {
		return `−${body}`;
	}
	return body;
};

export function ProjectionSummary({
	startingCents,
	projectedEndCents,
	monthlyNetCents,
	className,
}: ProjectionSummaryProps) {
	const netPositive = monthlyNetCents >= 0;

	return (
		<div
			className={cn(
				'ml-auto grid w-full min-w-0 max-w-[28rem] grid-cols-1 overflow-hidden rounded-paper border border-paper-border bg-paper-surface shadow-[0_1px_2px_color-mix(in_oklch,var(--fg)_6%,transparent)] sm:min-w-[26rem] sm:grid-cols-[1.15fr_auto]',
				className
			)}
			aria-label="Projection summary"
		>
			<div className="flex flex-col justify-center gap-1 px-4 py-3">
				<span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-paper-muted">
					Projected end balance
				</span>
				<strong className="font-mono text-xl font-medium tracking-[-0.02em] tabular-nums text-paper-fg">
					{formatMoneyFromCents(projectedEndCents)}
				</strong>
			</div>
			<div className="grid content-center gap-1.5 border-t border-paper-border bg-[color-mix(in_oklch,var(--bg)_62%,var(--surface))] px-3.5 py-2.5 sm:min-w-[10.5rem] sm:border-t-0 sm:border-l">
				<span className="flex items-center justify-between gap-3 text-[10px] text-paper-muted">
					Starting
					<strong className="font-mono text-[11px] font-medium tabular-nums text-paper-fg">
						{formatMoneyFromCents(startingCents)}
					</strong>
				</span>
				<span className="flex items-center justify-between gap-3 text-[10px] text-paper-muted">
					Monthly net
					<strong
						className="font-mono text-[11px] font-medium tabular-nums"
						style={{
							color: netPositive
								? chartColors.receiving
								: chartColors.spending,
						}}
					>
						{formatSignedFromCents(monthlyNetCents)}
					</strong>
				</span>
			</div>
		</div>
	);
}
