import { HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { chartTooltipClass } from '@/graphs/theme';
import type { PortfolioBalanceChangeDetail } from '@/lib/utils/linearTrend';

function formatPercent(value: number): string {
	return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

type BalanceTrendHelpProps = {
	detail: PortfolioBalanceChangeDetail;
};

export function BalanceTrendHelp({ detail }: BalanceTrendHelpProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && rootRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	return (
		<div ref={rootRef} className="relative inline-flex items-center gap-1.5">
			<p className="text-sm font-medium tabular-nums text-[#fbbf24]">
				{formatPercent(detail.percentChange)}
			</p>
			<button
				type="button"
				className="cursor-pointer text-white/40 transition-colors hover:text-white/70"
				aria-label="How portfolio trend is calculated"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<HelpCircle className="h-3.5 w-3.5" />
			</button>
			{open ? (
				<div
					className={`${chartTooltipClass} absolute left-0 top-full z-50 mt-2 w-80 space-y-3 text-left`}
					role="dialog"
					aria-label="Portfolio trend calculation"
				>
					<p className="text-white/90">
						Day-weighted average of each onboarding period&apos;s balance change.
						New account starting balances are not counted as growth.
					</p>
					<ul className="space-y-2.5">
						{detail.segments.map((segment) => (
							<li key={segment.label} className="border-t border-white/10 pt-2 first:border-0 first:pt-0">
								<p className="font-medium text-white/90">{segment.label}</p>
								<p className="mt-0.5 text-white/70">
									{formatPercent(segment.percentChange)} over {segment.days} days (
									{segment.weightPercent.toFixed(0)}% of chart)
								</p>
								<p className="tabular-nums text-[#fbbf24]">
									→ {formatPercent(segment.contribution)} toward total
								</p>
							</li>
						))}
					</ul>
					<p className="border-t border-white/10 pt-2 tabular-nums text-[#fbbf24]">
						Total: {formatPercent(detail.percentChange)}
					</p>
					<p className="text-white/50">
						(
						{detail.segments
							.map(
								(segment) =>
									`${formatPercent(segment.percentChange)}×${segment.days}`,
							)
							.join(' + ')}
						) ÷ {detail.totalDays} days
					</p>
				</div>
			) : null}
		</div>
	);
}
