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
	label: string;
	positiveIsGood: boolean;
};

type KpiCardProps = {
	label: string;
	value: string;
	valueClassName?: string;
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

function comparisonClass(delta: number, positiveIsGood: boolean): string {
	if (delta === 0) {
		return 'text-paper-muted';
	}
	const improved = positiveIsGood ? delta > 0 : delta < 0;
	return improved ? 'text-emerald-700' : 'text-amber-700';
}

function KpiCard({
	label,
	value,
	valueClassName,
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
			<p className="text-xs font-medium uppercase tracking-wide text-paper-muted">{label}</p>
			<p className={cn('mt-2 text-2xl font-semibold tabular-nums text-paper-fg font-mono', valueClassName)}>
				{value}
			</p>
			{comparison !== undefined ? (
				<p
					className={cn(
						'mt-1.5 text-xs tabular-nums',
						comparisonClass(comparison.delta, comparison.positiveIsGood)
					)}
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
	const netClass =
		metrics.net > 0
			? 'text-emerald-700'
			: metrics.net < 0
				? 'text-red-700'
				: 'text-paper-fg';

	const suffix = periodLabel.length > 0 ? ` · ${periodLabel}` : '';
	const compareSuffix = comparisonLabel ?? '';

	const spendingComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.spending - previousMetrics.spending,
					label: compareSuffix,
					positiveIsGood: false,
				}
			: undefined;

	const incomeComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.income - previousMetrics.income,
					label: compareSuffix,
					positiveIsGood: true,
				}
			: undefined;

	const netComparison =
		previousMetrics !== undefined && previousMetrics !== null && comparisonLabel !== undefined
			? {
					delta: metrics.net - previousMetrics.net,
					label: compareSuffix,
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
					label: compareSuffix,
					positiveIsGood: true,
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
				valueClassName="text-red-700"
				comparison={spendingComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label={`Income${suffix}`}
				value={formatCurrency(metrics.income)}
				valueClassName="text-emerald-700"
				comparison={incomeComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
			<KpiCard
				label={`Net${suffix}`}
				value={formatCurrency(metrics.net)}
				valueClassName={netClass}
				comparison={netComparison}
				isRefreshing={isRefreshing}
				formatCurrency={formatCurrency}
			/>
		</div>
	);
}
