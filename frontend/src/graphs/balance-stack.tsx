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
import { useMemo } from 'react';
import {
	chartColors,
	chartSeriesColor,
	chartTheme,
	chartTooltipClass,
} from '@/graphs/theme';
import { formatChartAxisDate, formatChartTooltipDate } from '@/lib/utils/dates';
import {
	applyPortfolioTrendToRows,
	buildAccountOnboardingEvents,
	buildBalanceTrendSegments,
	buildTrendSegmentLabels,
	accountFirstIndexByKey,
	maskAccountsBeforeFirstAppearance,
	type AccountOnboardingEvent,
} from '@/lib/utils/balanceTrendSegments';
import {
	renderTrendEventMarkers,
	useTrendEventMarkerState,
} from '@/graphs/trend-event-markers';
import { renderTrendSegmentLabels } from '@/graphs/trend-segment-labels';

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

const formatCurrencyWithCommas = (value: number): string => {
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-US', {
		minimumFractionDigits,
		maximumFractionDigits: 2,
	})}`;
};

function accountColor(index: number): string {
	return chartSeriesColor(index);
}

type ChartRow = {
	date: string;
	total: number;
	trend: number | null;
	[key: string]: string | number | null;
};

export function balanceStackAccountColorMap(
	accounts: Array<{ accountKey: string }>,
): Record<string, string> {
	const map: Record<string, string> = {};
	for (let index = 0; index < accounts.length; index++) {
		map[accounts[index].accountKey] = accountColor(index);
	}
	return map;
}

function buildChartModel(data: BalanceStackChartData): {
	rows: ChartRow[];
	events: AccountOnboardingEvent[];
	accountFirstIndex: Record<string, number>;
	trendLabels: ReturnType<typeof buildTrendSegmentLabels>;
} {
	const base = data.rows.map((row) => ({
		date: row.date,
		total: row.total,
		...row.values,
	}));
	const accountFirstIndex = accountFirstIndexByKey(data.rows, data.accounts);
	const masked = maskAccountsBeforeFirstAppearance(base, data.accounts, accountFirstIndex);
	const segments = buildBalanceTrendSegments(data.rows, data.accounts);
	const rows: ChartRow[] = applyPortfolioTrendToRows(masked, segments);
	const events = buildAccountOnboardingEvents(data.rows, data.accounts, segments);
	const trendLabels = buildTrendSegmentLabels(data.rows, segments);
	return { rows, events, accountFirstIndex, trendLabels };
}

type TooltipPayloadItem = {
	dataKey?: string | number;
	value?: string | number;
	name?: string;
};

function BalanceStackTooltip({
	active,
	payload,
	label,
	accounts,
	accountFirstIndex,
	rowIndex,
}: {
	active?: boolean;
	payload?: TooltipPayloadItem[];
	label?: string | number;
	accounts: BalanceStackAccount[];
	accountFirstIndex: Record<string, number>;
	rowIndex: number | null;
}) {
	if (!active || payload === undefined || payload.length === 0) {
		return null;
	}
	const heading = typeof label === 'string' ? formatChartTooltipDate(label) : label;
	const rows = accounts.flatMap((account, index) => {
		const firstIndex = accountFirstIndex[account.accountKey];
		if (
			firstIndex === undefined ||
			rowIndex === null ||
			rowIndex < firstIndex
		) {
			return [];
		}
		const entry = payload.find((item) => item.dataKey === account.accountKey);
		if (entry === undefined || typeof entry.value !== 'number') {
			return [];
		}
		return [{ account, value: entry.value, colorIndex: index }];
	});

	let total = 0;
	for (const row of rows) {
		total += row.value;
	}

	const trendEntry = payload.find((item) => item.dataKey === 'trend');
	const trendValue = trendEntry?.value;

	return (
		<div className={chartTooltipClass}>
			<p className="mb-2 font-semibold text-paper-fg">{heading}</p>
			<table className="w-full border-collapse text-sm">
				<tbody>
					{rows.map((row) => (
						<tr key={row.account.accountKey}>
							<td className="py-0.5 pr-4 text-paper-fg">
								<span className="flex items-center gap-2">
									<span
										className="h-2 w-2 shrink-0 rounded-full"
										style={{ backgroundColor: accountColor(row.colorIndex) }}
									/>
									{row.account.label}
								</span>
							</td>
							<td className="py-0.5 text-right tabular-nums text-paper-fg">
								{formatCurrencyWithCommas(row.value)}
							</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="border-t border-paper-border">
						<td className="pt-1.5 font-medium text-paper-fg">Total</td>
						<td className="pt-1.5 text-right font-medium tabular-nums text-paper-fg">
							{formatCurrencyWithCommas(total)}
						</td>
					</tr>
					{typeof trendValue === 'number' ? (
						<tr>
							<td className="py-0.5" style={{ color: chartColors.trend }}>
								<span className="flex items-center gap-2">
									<span
										className="h-2 w-2 shrink-0 rounded-full"
										style={{ backgroundColor: chartColors.trend }}
									/>
									Trend
								</span>
							</td>
							<td
								className="py-0.5 text-right tabular-nums"
								style={{ color: chartColors.trend }}
							>
								{formatCurrencyWithCommas(trendValue)}
							</td>
						</tr>
					) : null}
				</tfoot>
			</table>
		</div>
	);
}

type BalanceStackGraphProps = {
	data: BalanceStackChartData;
	dateSpanDays: number;
	isRefreshing?: boolean;
	height?: number;
};

export function BalanceStackGraph({
	data,
	dateSpanDays,
	isRefreshing = false,
	height = 300,
}: BalanceStackGraphProps) {
	const { rows: chartRows, events, accountFirstIndex, trendLabels } = useMemo(
		() => buildChartModel(data),
		[data],
	);
	const dateRowIndex = useMemo(() => {
		const indexByDate = new Map<string, number>();
		for (let index = 0; index < chartRows.length; index++) {
			indexByDate.set(chartRows[index].date, index);
		}
		return indexByDate;
	}, [chartRows]);
	const accountColorByKey = useMemo(
		() => balanceStackAccountColorMap(data.accounts),
		[data.accounts],
	);
	const markerState = useTrendEventMarkerState();

	const yDomain = useMemo((): [number, number] | undefined => {
		if (chartRows.length === 0) {
			return undefined;
		}
		const totals = chartRows.flatMap((row) => {
			const values: number[] = [row.total];
			if (row.trend !== null) {
				values.push(row.trend);
			}
			return values;
		});
		const min = 0;
		const max = Math.max(...totals);
		const pad = max === 0 ? 1 : max * 0.08;
		return [min, max + pad];
	}, [chartRows]);

	if (data.accounts.length === 0 || chartRows.length === 0) {
		return (
			<p className="flex items-center justify-center text-center text-paper-muted" style={{ height }}>
				No balance history for this period.
			</p>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
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
					wrapperStyle={
						markerState.suppressChartTooltip ? { visibility: 'hidden' } : undefined
					}
					content={({ active, payload, label }) => {
						if (markerState.suppressChartTooltip || !active) {
							return null;
						}
						const items: TooltipPayloadItem[] = (payload ?? []).flatMap((entry) => {
							const value = entry.value;
							if (
								entry.dataKey === undefined ||
								typeof entry.dataKey === 'function' ||
								(typeof value !== 'number' && typeof value !== 'string')
							) {
								return [];
							}
							return [
								{
									dataKey: entry.dataKey,
									value,
									name: typeof entry.name === 'string' ? entry.name : undefined,
								},
							];
						});
						const rowIndex = typeof label === 'string' ? (dateRowIndex.get(label) ?? null) : null;
						const heading =
							typeof label === 'string' || typeof label === 'number' ? label : undefined;
						return (
							<BalanceStackTooltip
								active={active}
								payload={items}
								label={heading}
								accounts={data.accounts}
								accountFirstIndex={accountFirstIndex}
								rowIndex={rowIndex}
							/>
						);
					}}
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
						strokeWidth={1.5}
						strokeOpacity={0.7}
						fill={accountColor(index)}
						fillOpacity={0.1}
						isAnimationActive={!isRefreshing}
						animationDuration={400}
					/>
				))}
				<Area
					type="linear"
					dataKey="trend"
					name="Trend"
							stroke={chartColors.trend}
					strokeWidth={2.5}
					strokeDasharray="8 4"
					fill="none"
					dot={false}
					activeDot={{ r: 4, fill: chartColors.trend, stroke: chartColors.surface, strokeWidth: 1 }}
					legendType="line"
					isAnimationActive={!isRefreshing}
					animationDuration={400}
					connectNulls={false}
				/>
				{renderTrendSegmentLabels(trendLabels)}
				{renderTrendEventMarkers(events, markerState, accountColorByKey)}
			</ComposedChart>
		</ResponsiveContainer>
	);
}
