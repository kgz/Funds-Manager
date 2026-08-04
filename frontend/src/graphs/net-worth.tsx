import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Area,
	CartesianGrid,
	ComposedChart,
	DefaultLegendContent,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { chartColors, chartTheme, chartTooltipClass } from '@/graphs/theme';
import { formatChartAxisCompactMoney } from '@/lib/utils/chartMoney';
import { formatChartAxisDate, chartDateSpanDays } from '@/lib/utils/dates';
import { DateTime } from 'luxon';
import {
	fetchNetWorthOverTime,
	type DashboardDateRange,
	type NetWorthPoint,
} from '@/store/thunks/analytics';
import { TrendingUp, Loader2 } from 'lucide-react';

type NetWorthChartPoint = NetWorthPoint & {
	ts: number;
	totalAssets: number;
	totalDebts: number;
};

function toChartPoint(point: NetWorthPoint): NetWorthChartPoint | null {
	const ts = DateTime.fromISO(point.date, { zone: 'utc' }).startOf('day').toMillis();
	if (!Number.isFinite(ts)) {
		return null;
	}
	return {
		...point,
		ts,
		totalAssets: point.availableCash + point.assets,
		totalDebts: point.liabilities,
	};
}

function formatTimeAxisTick(ts: number, spanDays: number): string {
	const iso = DateTime.fromMillis(ts, { zone: 'utc' }).toISODate();
	return iso ? formatChartAxisDate(iso, spanDays) : '';
}

const currency = (value: number): string =>
	`${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-AU', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;

type ChartLegendItem = {
	value: string;
	type: 'line';
	color: string;
	strokeDasharray?: string;
};

function chartLegendItems(accountScoped: boolean, hasDebts: boolean): ChartLegendItem[] {
	if (accountScoped) {
		return [];
	}
	const items: ChartLegendItem[] = [
		{ value: 'Total assets', type: 'line', color: chartColors.assets },
	];
	if (hasDebts) {
		items.push({ value: 'Debts', type: 'line', color: chartColors.debts });
	}
	items.push({
		value: 'Net worth',
		type: 'line',
		color: chartColors.netWorth,
		strokeDasharray: '4 4',
	});
	return items;
}

function toLegendPayload(items: ChartLegendItem[]) {
	return items.map((item) => {
		if (item.strokeDasharray !== undefined) {
			return {
				value: item.value,
				type: item.type,
				color: item.color,
				payload: { strokeDasharray: item.strokeDasharray },
			};
		}
		return {
			value: item.value,
			type: item.type,
			color: item.color,
		};
	});
}

type NetWorthChartProps = {
	dateRange: DashboardDateRange;
	variant?: 'full' | 'dashboard';
};

const DASHBOARD_CHART_HEIGHT = 200;

function readTooltipDate(row: object): string {
	const ts = Reflect.get(row, 'ts');
	if (typeof ts === 'number' && Number.isFinite(ts)) {
		const iso = DateTime.fromMillis(ts, { zone: 'utc' }).toISODate();
		if (iso) {
			return iso;
		}
	}
	const date = Reflect.get(row, 'date');
	return typeof date === 'string' ? date : '';
}

function readNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function NetWorthTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}
	const row = payload[0]?.payload;
	if (!row || typeof row !== 'object') {
		return null;
	}
	const date = readTooltipDate(row);
	const netWorth = readNumber(Reflect.get(row, 'netWorth'));
	const totalAssets = readNumber(Reflect.get(row, 'totalAssets'));
	const totalDebts = readNumber(Reflect.get(row, 'totalDebts'));
	const availableCash = readNumber(Reflect.get(row, 'availableCash'));
	const assets = readNumber(Reflect.get(row, 'assets'));

	return (
		<div className={chartTooltipClass}>
			<p className="mb-1 font-medium text-paper-fg">{date}</p>
			<p style={{ color: chartColors.netWorth }}>
				Net worth: {currency(netWorth)}
			</p>
			<p style={{ color: chartColors.assets }}>
				Total assets: {currency(totalAssets)}
			</p>
			{totalDebts > 0 ? (
				<p style={{ color: chartColors.debts }}>Debts: {currency(totalDebts)}</p>
			) : null}
			<p className="mt-1 text-xs text-paper-muted">
				Cash {currency(availableCash)} · Other assets {currency(assets)}
			</p>
		</div>
	);
}

export function NetWorthChart({ dateRange, variant = 'full' }: NetWorthChartProps) {
	const [points, setPoints] = useState<NetWorthPoint[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const genRef = useRef(0);

	const { start, end, accountId } = dateRange;

	useEffect(() => {
		const gen = genRef.current + 1;
		genRef.current = gen;
		setLoading(true);
		setError(null);

		void fetchNetWorthOverTime({ start, end, accountId })
			.then((data) => {
				if (genRef.current !== gen) {
					return;
				}
				setPoints(data);
			})
			.catch((err: unknown) => {
				if (genRef.current !== gen) {
					return;
				}
				setError(err instanceof Error ? err.message : 'Failed to load net worth');
				setPoints([]);
			})
			.finally(() => {
				if (genRef.current === gen) {
					setLoading(false);
				}
			});
	}, [start, end, accountId]);

	const chartPoints = useMemo(() => {
		const mapped: NetWorthChartPoint[] = [];
		for (const point of points) {
			const chartPoint = toChartPoint(point);
			if (chartPoint) {
				mapped.push(chartPoint);
			}
		}
		mapped.sort((left, right) => left.ts - right.ts);
		return mapped;
	}, [points]);

	const spanDays = useMemo(
		() => chartDateSpanDays(chartPoints.map((point) => point.date)),
		[chartPoints]
	);

	const hasDebts = useMemo(
		() => chartPoints.some((point) => point.totalDebts > 0),
		[chartPoints]
	);

	const yDomain = useMemo((): [number, number] | undefined => {
		if (chartPoints.length === 0) {
			return undefined;
		}
		let max = 0;
		for (const point of chartPoints) {
			max = Math.max(max, point.totalAssets, point.availableCash, point.netWorth);
		}
		const pad = Math.max(max * 0.08, 1);
		return [0, max + pad];
	}, [chartPoints]);

	const accountScoped = accountId != null;
	const legendItems = toLegendPayload(chartLegendItems(accountScoped, hasDebts));

	const subtitle =
		variant === 'dashboard'
			? 'Assets − liabilities'
			: accountScoped
				? 'Cash balance for the selected account.'
				: 'Net Worth = (Assets + Cash) − Debts. Shaded area = Net Worth (the gap between total assets and debts).';

	const chartHeight = variant === 'dashboard' ? DASHBOARD_CHART_HEIGHT : 300;
	const title = variant === 'dashboard' ? 'Net worth' : 'Net Worth Over Time';

	if (variant === 'dashboard') {
		return (
			<ChartCard
				title={title}
				subtitle={subtitle}
				subtitleAlign="end"
				titleExtra={
					loading ? (
						<Loader2 className="h-4 w-4 animate-spin text-secondary-default" aria-label="Loading" />
					) : null
				}
			>
				{error !== null && points.length === 0 ? (
					<div
						className="flex items-center justify-center text-sm text-[color:var(--danger)]"
						style={{ height: chartHeight }}
					>
						{error}
					</div>
				) : loading && chartPoints.length === 0 ? (
					<div className="flex items-center justify-center" style={{ height: chartHeight }}>
						<Loader2 className="h-6 w-6 animate-spin text-secondary-default" aria-label="Loading" />
					</div>
				) : chartPoints.length === 0 ? (
					<EmptyState
						compact
						icon={TrendingUp}
						title="Not enough history"
						description="Add assets with valuations or import statement balances to see net worth over time."
						className="py-8"
					/>
				) : (
					<div data-testid="net-worth-chart">
						<ResponsiveContainer width="100%" height={chartHeight}>
							<ComposedChart
								data={chartPoints}
								margin={{ top: 16, right: 12, bottom: 36, left: 4 }}
							>
								<CartesianGrid
									stroke={chartTheme.grid.stroke}
									strokeDasharray={chartTheme.grid.strokeDasharray}
									vertical={false}
								/>
								<XAxis
									type="number"
									dataKey="ts"
									domain={['dataMin', 'dataMax']}
									stroke={chartTheme.axis.stroke}
									tick={{ ...chartTheme.axis.tick, fontSize: 11 }}
									tickLine={false}
									axisLine={false}
									tickFormatter={(ts) => formatTimeAxisTick(ts, spanDays)}
									minTickGap={40}
								/>
								<YAxis
									domain={yDomain}
									stroke={chartTheme.axis.stroke}
									tick={{
										...chartTheme.axis.tick,
										fontFamily: 'var(--font-mono)',
										fontSize: 11,
									}}
									tickLine={false}
									axisLine={false}
									tickFormatter={formatChartAxisCompactMoney}
									width={48}
								/>
								<Tooltip content={(props) => NetWorthTooltip(props)} />
								<Area
									type="linear"
									dataKey="netWorth"
									stroke="none"
									fill={chartColors.dashboardNetWorthFill}
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
								<Line
									type="linear"
									dataKey="netWorth"
									stroke={chartColors.dashboardNetWorthStroke}
									strokeWidth={1.75}
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				)}
			</ChartCard>
		);
	}

	return (
		<ChartCard
			title={title}
			subtitle={subtitle}
			titleExtra={
				loading ? (
					<Loader2 className="h-4 w-4 animate-spin text-secondary-default" aria-label="Loading" />
				) : null
			}
		>
			{error !== null && points.length === 0 ? (
				<div
					className="flex items-center justify-center text-sm text-[color:var(--danger)]"
					style={{ height: chartHeight }}
				>
					{error}
				</div>
			) : loading && chartPoints.length === 0 ? (
				<div className="flex items-center justify-center" style={{ height: chartHeight }}>
					<Loader2 className="h-6 w-6 animate-spin text-secondary-default" aria-label="Loading" />
				</div>
			) : chartPoints.length === 0 ? (
				<EmptyState
					icon={TrendingUp}
					title="Not enough history"
					description="Add assets with valuations or import statement balances to see net worth over time."
				/>
			) : (
				<div data-testid="net-worth-chart">
					<ResponsiveContainer width="100%" height={chartHeight}>
						<ComposedChart
							data={chartPoints}
							margin={{ top: 8, right: 8, left: 0, bottom: accountScoped ? 0 : 28 }}
						>
							<defs>
								<linearGradient id="netWorthBandFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={chartColors.netWorth} stopOpacity={0.22} />
									<stop offset="100%" stopColor={chartColors.netWorth} stopOpacity={0.04} />
								</linearGradient>
								<linearGradient id="netWorthDebtsFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={chartColors.debts} stopOpacity={0.16} />
									<stop offset="100%" stopColor={chartColors.debts} stopOpacity={0.03} />
								</linearGradient>
								<linearGradient id="netWorthCashFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={chartColors.netWorth} stopOpacity={0.35} />
									<stop offset="100%" stopColor={chartColors.netWorth} stopOpacity={0.06} />
								</linearGradient>
							</defs>
							<CartesianGrid
								stroke={chartTheme.grid.stroke}
								strokeDasharray={chartTheme.grid.strokeDasharray}
							/>
							<XAxis
								type="number"
								dataKey="ts"
								domain={['dataMin', 'dataMax']}
								stroke={chartTheme.axis.stroke}
								tick={chartTheme.axis.tick}
								tickFormatter={(ts) => formatTimeAxisTick(ts, spanDays)}
								minTickGap={40}
							/>
							<YAxis
								domain={yDomain}
								stroke={chartTheme.axis.stroke}
								tick={chartTheme.axis.tick}
								tickFormatter={currency}
								width={88}
							/>
							<Tooltip content={(props) => NetWorthTooltip(props)} />
							{!accountScoped && legendItems.length > 0 ? (
								<Legend
									wrapperStyle={chartTheme.legend.wrapperStyle}
									content={
										<DefaultLegendContent
											payload={legendItems}
											iconType="circle"
											iconSize={8}
										/>
									}
								/>
							) : null}
							{accountScoped ? (
								<Area
									type="linear"
									dataKey="availableCash"
									name="Cash"
									stroke={chartColors.netWorth}
									strokeWidth={2}
									fill="url(#netWorthCashFill)"
									baseValue={0}
									dot={false}
									isAnimationActive={false}
								/>
							) : null}
							{!accountScoped && hasDebts ? (
								<Area
									type="linear"
									stackId="worth"
									dataKey="totalDebts"
									stroke="none"
									fill="url(#netWorthDebtsFill)"
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							) : null}
							{accountScoped ? null : (
								<Area
									type="linear"
									stackId={hasDebts ? 'worth' : undefined}
									dataKey="netWorth"
									stroke="none"
									fill="url(#netWorthBandFill)"
									baseValue={hasDebts ? undefined : 0}
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							)}
							{accountScoped ? null : (
								<Line
									type="linear"
									dataKey="totalAssets"
									stroke={chartColors.assets}
									strokeWidth={2}
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							)}
							{!accountScoped && hasDebts ? (
								<Line
									type="linear"
									dataKey="totalDebts"
									stroke={chartColors.debts}
									strokeWidth={2}
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							) : null}
							{accountScoped ? null : (
								<Line
									type="linear"
									dataKey="netWorth"
									stroke={chartColors.netWorth}
									strokeWidth={1.5}
									strokeDasharray="5 4"
									dot={false}
									isAnimationActive={false}
									legendType="none"
								/>
							)}
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			)}
		</ChartCard>
	);
}
