import { cn } from '@/lib/utils/cn';
import { eyebrowClass, moneyClass } from '@/components/layout/tokens';
import { chartColors } from '@/graphs/theme';

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
	label: string;
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
	label: string,
	formatCurrency: (value: number | null | undefined) => string
): string {
	const amount = formatCurrency(Math.abs(delta));
	if (delta > 0) {
		return `Up ${amount} ${label}`;
	}
	if (delta < 0) {
		return `Down ${amount} ${label}`;
	}
	return `Unchanged ${label}`;
}

function comparisonColor(delta: number): string | undefined {
	if (delta === 0) {
		return undefined;
	}
	return delta > 0 ? chartColors.receiving : chartColors.spending;
}

function KpiCard({
	label,
	value,
	comparison,
	isRefreshing,
	formatCurrency,
}: KpiCardProps) {
	return (
		<div
			className={cn(
				'rounded-paper border border-paper-border bg-paper-surface px-4 py-5 transition-all duration-300 ease-out',
				isRefreshing && 'scale-[0.99]'
			)}
		>
			<p className={eyebrowClass}>{label}</p>
			<p className={cn(moneyClass, 'mt-2')}>{value}</p>
			{comparison !== undefined ? (
				<p
					className={cn(
						'mt-1.5 font-mono text-xs tabular-nums',
						comparison.delta === 0 && 'text-paper-muted'
					)}
					style={{ color: comparisonColor(comparison.delta) }}
				>
					{formatComparisonLine(comparison.delta, comparison.label, formatCurrency)}
				</p>
			) : null}
		</div>
	);
}

type KpiCardsProps = {
	metrics: DashboardKpiMetrics;
	periodLabel: string;
	comparisonLabel?: string;
	previousMetrics?: KpiComparison | null;
	isRefreshing?: boolean;
	formatCurrency: (value: number | null | undefined) => string;
};

export function KpiCards({
	metrics,
	periodLabel,
	comparisonLabel,
	previousMetrics,
	isRefreshing,
	formatCurrency,
}: KpiCardsProps) {
	const suffix = periodLabel.length > 0 ? ` · ${periodLabel}` : '';
	const compareSuffix = comparisonLabel ?? '';

	const spendingComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.spending - previousMetrics.spending,
					label: compareSuffix,
				}
			: undefined;

	const incomeComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.income - previousMetrics.income,
					label: compareSuffix,
				}
			: undefined;

	const netComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.net - previousMetrics.net,
					label: compareSuffix,
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
					label: compareSuffix,
				}
			: undefined;

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<KpiCard
				label={`Current balance${suffix}`}
				value={formatCurrency(metrics.balance)}
				comparison={balanceComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label={`Spending${suffix}`}
				value={formatCurrency(metrics.spending)}
				comparison={spendingComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label={`Income${suffix}`}
				value={formatCurrency(metrics.income)}
				comparison={incomeComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label={`Net${suffix}`}
				value={formatCurrency(metrics.net)}
				comparison={netComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
		</div>
	);
}
