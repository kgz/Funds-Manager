import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type {
	NameType,
	ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { chartTheme, chartTooltipClass } from '@/graphs/theme';
import { formatChartAxisDate } from '@/lib/utils/dates';
import {
	fetchNetWorthOverTime,
	type DashboardDateRange,
	type NetWorthPoint,
} from '@/store/thunks/analytics';
import { TrendingUp, Loader2 } from 'lucide-react';

type NetWorthChartProps = {
	dateRange: DashboardDateRange;
};

const currency = (value: number): string =>
	`${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-AU', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;

function readNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function NetWorthTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}
	const row = payload[0]?.payload;
	if (!row || typeof row !== 'object') {
		return null;
	}
	const date = Reflect.get(row, 'date');
	const netWorth = readNumber(Reflect.get(row, 'netWorth'));
	const availableCash = readNumber(Reflect.get(row, 'availableCash'));
	const assets = readNumber(Reflect.get(row, 'assets'));
	const liabilities = readNumber(Reflect.get(row, 'liabilities'));

	return (
		<div className={chartTooltipClass}>
			<p className="mb-1 font-medium">{typeof date === 'string' ? date : ''}</p>
			<p className="text-emerald-300">Net worth: {currency(netWorth)}</p>
			<p className="text-white/70">Cash: {currency(availableCash)}</p>
			{assets !== 0 ? (
				<p className="text-white/70">Assets: {currency(assets)}</p>
			) : null}
			{liabilities !== 0 ? (
				<p className="text-white/70">Liabilities: -{currency(liabilities)}</p>
			) : null}
		</div>
	);
}

export function NetWorthChart({ dateRange }: NetWorthChartProps) {
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

	const spanDays = useMemo(() => {
		if (points.length < 2) {
			return 0;
		}
		const first = new Date(points[0].date).getTime();
		const last = new Date(points[points.length - 1].date).getTime();
		if (Number.isNaN(first) || Number.isNaN(last)) {
			return 0;
		}
		return Math.round((last - first) / (1000 * 60 * 60 * 24));
	}, [points]);

	const accountScoped = accountId != null;
	const subtitle = accountScoped
		? 'Cash balance for the selected account. Assets and liabilities show only for All accounts.'
		: 'Cash + assets − liabilities over time. Manual assets/liabilities are held at their current value.';

	return (
		<ChartCard
			title="Net Worth Over Time"
			subtitle={subtitle}
			titleExtra={
				loading ? (
					<Loader2 className="h-4 w-4 animate-spin text-secondary-default" aria-label="Loading" />
				) : null
			}
		>
			{error !== null && points.length === 0 ? (
				<div className="flex h-[300px] items-center justify-center text-sm text-red-300">
					{error}
				</div>
			) : points.length === 0 && !loading ? (
				<EmptyState
					icon={TrendingUp}
					title="Not enough history"
					description="Net worth needs imported statement balances over time. Import statements to see the trend."
				/>
			) : (
				<ResponsiveContainer width="100%" height={300}>
					<ComposedChart data={points}>
						<defs>
							<linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
								<stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
							</linearGradient>
						</defs>
						<CartesianGrid
							stroke={chartTheme.grid.stroke}
							strokeDasharray={chartTheme.grid.strokeDasharray}
						/>
						<XAxis
							dataKey="date"
							stroke={chartTheme.axis.stroke}
							tick={chartTheme.axis.tick}
							tickFormatter={(iso) => formatChartAxisDate(iso, spanDays)}
							interval="preserveStartEnd"
							minTickGap={40}
						/>
						<YAxis
							stroke={chartTheme.axis.stroke}
							tick={chartTheme.axis.tick}
							tickFormatter={currency}
							width={88}
						/>
						<Tooltip content={(props) => NetWorthTooltip(props)} />
						<Area
							type="monotone"
							dataKey="netWorth"
							name="Net worth"
							stroke="#34d399"
							strokeWidth={2}
							fill="url(#netWorthFill)"
							dot={false}
							isAnimationActive={false}
						/>
						{!accountScoped ? (
							<Line
								type="monotone"
								dataKey="availableCash"
								name="Cash"
								stroke="#60a5fa"
								strokeWidth={1.5}
								strokeDasharray="6 4"
								dot={false}
								isAnimationActive={false}
							/>
						) : null}
					</ComposedChart>
				</ResponsiveContainer>
			)}
		</ChartCard>
	);
}
