import { cn } from '@/lib/utils/cn';
import {
	moneyDangerClass,
	moneySuccessClass,
	formatSignedMoneyFromDollars,
} from '@/lib/utils/moneySemantics';

type PeriodSummaryProps = {
	spending: number;
	income: number;
	net: number;
	className?: string;
};

const formatSignedMoney = (n: number, forceSign: 'plus' | 'minus' | 'auto') =>
	formatSignedMoneyFromDollars(n, forceSign);

export function PeriodSummary({
	spending,
	income,
	net,
	className,
}: PeriodSummaryProps) {
	const netClass =
		net > 0 ? moneySuccessClass : net < 0 ? moneyDangerClass : 'text-paper-muted';

	return (
		<div
			className={cn(
				'ml-auto w-full min-w-0 max-w-[28rem] overflow-hidden rounded-paper border border-paper-border bg-paper-surface shadow-[0_1px_2px_color-mix(in_oklch,var(--fg)_6%,transparent)] sm:min-w-[24.5rem]',
				className
			)}
			aria-label="Period totals"
		>
			<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto]">
				<div className="flex items-baseline justify-between gap-4 px-4 py-3">
					<span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-paper-muted">
						Net this period
					</span>
					<strong
						className={cn(
							'font-mono text-xl font-medium tracking-[-0.02em] tabular-nums',
							netClass
						)}
					>
						{formatSignedMoney(net, 'auto')}
					</strong>
				</div>
				<div className="grid content-center gap-1.5 border-t border-paper-border bg-[color-mix(in_oklch,var(--bg)_62%,var(--surface))] px-3.5 py-2.5 sm:min-w-[9.5rem] sm:border-t-0 sm:border-l">
					<span className="flex items-center justify-between gap-3 text-[10px] text-paper-muted">
						<span className="inline-flex items-center gap-1.5">
							<i
								className="inline-block h-[5px] w-[5px] rounded-full bg-[color:var(--success)]"
								aria-hidden
							/>
							Income
						</span>
						<strong
							className={cn(
								'font-mono text-[11px] font-medium tabular-nums tracking-[-0.02em]',
								moneySuccessClass
							)}
						>
							{formatSignedMoney(income, 'plus')}
						</strong>
					</span>
					<span className="flex items-center justify-between gap-3 text-[10px] text-paper-muted">
						<span className="inline-flex items-center gap-1.5">
							<i
								className="inline-block h-[5px] w-[5px] rounded-full bg-[color:var(--danger)]"
								aria-hidden
							/>
							Spending
						</span>
						<strong
							className={cn(
								'font-mono text-[11px] font-medium tabular-nums tracking-[-0.02em]',
								moneyDangerClass
							)}
						>
							{formatSignedMoney(spending, 'minus')}
						</strong>
					</span>
				</div>
			</div>
		</div>
	);
}
