import { cn } from '@/lib/utils/cn';

type KpiCardProps = {
	label: string;
	value: string;
	valueClassName?: string;
};

function KpiCard({ label, value, valueClassName }: KpiCardProps) {
	return (
		<div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5">
			<p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
			<p className={cn('mt-2 text-2xl font-semibold tabular-nums text-white', valueClassName)}>
				{value}
			</p>
		</div>
	);
}

export type DashboardKpiMetrics = {
	balance: number | null;
	spending: number;
	income: number;
	net: number;
};

type KpiCardsProps = {
	metrics: DashboardKpiMetrics;
	formatCurrency: (value: number | null | undefined) => string;
};

export function KpiCards({ metrics, formatCurrency }: KpiCardsProps) {
	const netClass =
		metrics.net > 0
			? 'text-emerald-400'
			: metrics.net < 0
				? 'text-red-400'
				: 'text-white';

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<KpiCard label="Current balance" value={formatCurrency(metrics.balance)} />
			<KpiCard
				label="Total spending"
				value={formatCurrency(metrics.spending)}
				valueClassName="text-red-400"
			/>
			<KpiCard
				label="Total income"
				value={formatCurrency(metrics.income)}
				valueClassName="text-emerald-400"
			/>
			<KpiCard label="Net" value={formatCurrency(metrics.net)} valueClassName={netClass} />
		</div>
	);
}
