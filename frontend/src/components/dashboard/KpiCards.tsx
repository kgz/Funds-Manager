import { cn } from '@/lib/utils/cn';

export type DashboardKpiMetrics = {
	balance: number | null;
	spending: number;
	income: number;
	net: number;
};

export type KpiComparison = {
	spending: number;
	income: number;
	net: number;
	balance: number | null;
};

type KpiComparisonLine = {
	delta: number;
	positiveIsGood: boolean;
};

type KpiCardProps = {
	label: string;
	value: string;
	comparison?: KpiComparisonLine;
	isRefreshing?: boolean;
	formatCurrency: (value: number | null | undefined) => string;
};

function formatComparisonLine(
	delta: number,
	formatCurrency: (value: number | null | undefined) => string
): string {
	if (delta === 0) {
		return '— unchanged vs prior';
	}
	const arrow = delta > 0 ? '▲' : '▼';
	return `${arrow} ${formatCurrency(Math.abs(delta))} vs prior`;
}

function comparisonClassName(delta: number, positiveIsGood: boolean): string {
	if (delta === 0) {
		return 'text-paper-muted';
	}
	const improved = positiveIsGood ? delta > 0 : delta < 0;
	return improved ? 'text-[var(--success)]' : 'text-[var(--danger)]';
}

function KpiCard({
	label,
	value,
	comparison,
	isRefreshing,
	formatCurrency,
}: KpiCardProps) {
	return (
		<article
			className={cn(
				'rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4 transition-opacity duration-300',
				isRefreshing && 'opacity-80'
			)}
		>
			<p className="m-0 mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-paper-muted">
				{label}
			</p>
			<p className="m-0 font-mono text-[26px] font-medium leading-[1.15] tracking-[-0.02em] tabular-nums text-paper-fg">
				{value}
			</p>
			{comparison !== undefined ? (
				<p
					className={cn(
						'm-0 mt-2 text-[12px] font-medium tracking-[0.01em]',
						comparisonClassName(comparison.delta, comparison.positiveIsGood)
					)}
				>
					{formatComparisonLine(comparison.delta, formatCurrency)}
				</p>
			) : null}
		</article>
	);
}

type KpiCardsProps = {
	metrics: DashboardKpiMetrics;
	comparisonLabel?: string;
	previousMetrics?: KpiComparison | null;
	isRefreshing?: boolean;
	formatCurrency: (value: number | null | undefined) => string;
};

export function KpiCards({
	metrics,
	comparisonLabel,
	previousMetrics,
	isRefreshing,
	formatCurrency,
}: KpiCardsProps) {
	const spendingComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.spending - previousMetrics.spending,
					positiveIsGood: false,
				}
			: undefined;

	const incomeComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.income - previousMetrics.income,
					positiveIsGood: true,
				}
			: undefined;

	const netComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.net - previousMetrics.net,
					positiveIsGood: true,
				}
			: undefined;

	const balanceComparison =
		previousMetrics !== undefined &&
		previousMetrics !== null &&
		comparisonLabel !== undefined &&
		metrics.balance !== null &&
		previousMetrics.balance !== null
			? {
					delta: metrics.balance - previousMetrics.balance,
					positiveIsGood: true,
				}
			: undefined;

	return (
		<section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<KpiCard
				label="Current Balance"
				value={formatCurrency(metrics.balance)}
				comparison={balanceComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label="Spending"
				value={formatCurrency(metrics.spending)}
				comparison={spendingComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label="Income"
				value={formatCurrency(metrics.income)}
				comparison={incomeComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label="Net"
				value={formatCurrency(metrics.net)}
				comparison={netComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
		</section>
	);
}
