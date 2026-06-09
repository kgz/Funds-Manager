import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useMemo } from 'react';
import { chartTheme, chartTooltipClass } from '@/graphs/theme';
import { formatChartAxisDate, formatChartTooltipDate } from '@/lib/utils/dates';
import { linearTrend } from '@/lib/utils/linearTrend';

export type BalanceStackAccount = {
	accountKey: string;
	accountId: number | null;
	label: string;
};

export type BalanceStackRow = {
	date: string;
	total: number;
	values: Record<string, number>;
};

export type BalanceStackChartData = {
	accounts: BalanceStackAccount[];
	rows: BalanceStackRow[];
};

const STACK_COLORS = ['#6ee7b7', '#60a5fa', '#c084fc', '#fb923c', '#f472b6', '#facc15'];

const formatCurrencyWithCommas = (value: number): string => {
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-US', {
		minimumFractionDigits,
		maximumFractionDigits: 2,
	})}`;
};

function accountColor(index: number): string {
	return STACK_COLORS[index % STACK_COLORS.length];
}

type ChartRow = {
	date: string;
	total: number;
	trend: number;
	[key: string]: string | number;
};

function buildChartRows(data: BalanceStackChartData): ChartRow[] {
	const base = data.rows.map((row) => ({
		date: row.date,
		total: row.total,
		...row.values,
	}));
	const trend = linearTrend(base.map((row) => row.total));
	return base.map((row, index) => ({
		...row,
		trend: trend[index],
	}));
}

function BalanceStackTooltip({
	active,
	payload,
	label,
	accounts,
}: TooltipProps<number, string> & { accounts: BalanceStackAccount[] }) {
	if (!active || payload === undefined || payload.length === 0) {
		return null;
	}
	const heading = typeof label === 'string' ? formatChartTooltipDate(label) : label;
	const entries = payload
		.filter(
			(entry) =>
				entry.dataKey !== 'total' &&
				entry.dataKey !== 'trend' &&
				typeof entry.value === 'number'
		)
		.sort((left, right) => {
			const leftVal = typeof left.value === 'number' ? left.value : 0;
			const rightVal = typeof right.value === 'number' ? right.value : 0;
			return rightVal - leftVal;
		});

	let total = 0;
	for (const entry of entries) {
		if (typeof entry.value === 'number') {
			total += entry.value;
		}
	}

	const trendEntry = payload.find((entry) => entry.dataKey === 'trend');
	const trendValue = trendEntry?.value;

	return (
		<div className={chartTooltipClass}>
			<p className="font-semibold">{heading}</p>
			{entries.map((entry) => {
				const account = accounts.find((item) => item.accountKey === entry.dataKey);
				const labelText = account?.label ?? String(entry.name ?? entry.dataKey);
				const value = entry.value;
				if (typeof value !== 'number') {
					return null;
				}
				return (
					<p key={String(entry.dataKey)} className="text-white/85">
						{labelText}: {formatCurrencyWithCommas(value)}
					</p>
				);
			})}
			<p className="mt-1 border-t border-white/10 pt-1 font-medium text-emerald-300">
				Total: {formatCurrencyWithCommas(total)}
			</p>
			{typeof trendValue === 'number' ? (
				<p className="text-amber-300/90">Trend: {formatCurrencyWithCommas(trendValue)}</p>
			) : null}
		</div>
	);
}

type BalanceStackGraphProps = {
	data: BalanceStackChartData;
	dateSpanDays: number;
	isRefreshing?: boolean;
};

export function BalanceStackGraph({
	data,
	dateSpanDays,
	isRefreshing = false,
}: BalanceStackGraphProps) {
	const chartRows = useMemo(() => buildChartRows(data), [data]);

	const yDomain = useMemo((): [number, number] | undefined => {
		if (chartRows.length === 0) {
			return undefined;
		}
		const totals = chartRows.flatMap((row) => [row.total, row.trend]);
		const min = 0;
		const max = Math.max(...totals);
		const pad = max === 0 ? 1 : max * 0.08;
		return [min, max + pad];
	}, [chartRows]);

	if (data.accounts.length === 0 || chartRows.length === 0) {
		return (
			<p className="flex h-[300px] items-center justify-center text-center text-white/50">
				No balance history for this period.
			</p>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={300}>
			<ComposedChart data={chartRows}>
				<CartesianGrid
					stroke={chartTheme.grid.stroke}
					strokeDasharray={chartTheme.grid.strokeDasharray}
				/>
				<XAxis
					dataKey="date"
					stroke={chartTheme.axis.stroke}
					tick={chartTheme.axis.tick}
					tickFormatter={(iso) => formatChartAxisDate(iso, dateSpanDays)}
					interval="preserveStartEnd"
					minTickGap={40}
				/>
				<YAxis
					domain={yDomain}
					stroke={chartTheme.axis.stroke}
					tick={chartTheme.axis.tick}
					tickFormatter={formatCurrencyWithCommas}
					width={88}
				/>
				<Tooltip
					content={(props) => (
						<BalanceStackTooltip {...props} accounts={data.accounts} />
					)}
				/>
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={chartTheme.legend.wrapperStyle}
				/>
				{data.accounts.map((account, index) => (
					<Area
						key={account.accountKey}
						type="monotone"
						dataKey={account.accountKey}
						name={account.label}
						stackId="balance"
						stroke={accountColor(index)}
						strokeWidth={2}
						fill="none"
						dot={false}
						isAnimationActive={!isRefreshing}
						animationDuration={400}
					/>
				))}
				<Area
					type="linear"
					dataKey="trend"
					name="Trend"
					stroke="#fbbf24"
					strokeWidth={3}
					strokeDasharray="8 4"
					fill="none"
					dot={false}
					activeDot={{ r: 4, fill: '#fbbf24', stroke: '#fff', strokeWidth: 1 }}
					legendType="line"
					isAnimationActive={!isRefreshing}
					animationDuration={400}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
