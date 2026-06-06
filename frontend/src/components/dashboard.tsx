import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllCategories } from "@/store/thunks/category.get.all";
import {
	fetchDashboardAnalytics,
	fetchDashboardKpis,
	fetchIncomeDrilldown,
	fetchIncomeDrilldownByName,
	fetchSpendingDrilldown,
	fetchSpendingDrilldownByName,
	type DashboardAnalytics,
	type SpendingNameRow,
} from "@/store/thunks/analytics";
import type { Transaction } from "@/types/transaction";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryPieChart, type PieChartDataItem } from '@/graphs/pie';
import { MonthlyBarGraph } from "@/graphs/bar";
import { chartTheme, chartTooltipClass } from '@/graphs/theme';
import { ChartCard } from '@/components/ChartCard';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import {
	COMPARISON_LABELS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	PERIOD_LABELS,
	periodDateRange,
	previousPeriodDateRange,
	readStoredPeriod,
	type DashboardPeriod,
} from '@/components/dashboard/period';
import type { KpiComparison } from '@/components/dashboard/KpiCards';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from 'recharts';
import { AlertCircle, FileArchive, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getMappings } from "@/store/thunks/mapping.get.all";
import { cn } from '@/lib/utils/cn';

const formatCurrencyWithCommas = (value: number | null | undefined): string => {
	if (value === null || value === undefined) return '$--';
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};

function balanceTooltip({ active, payload, label }: TooltipProps<number, string>) {
	if (!active || payload === undefined || payload.length === 0) {
		return null;
	}
	const value = payload[0]?.value;
	if (typeof value !== 'number') {
		return null;
	}
	return (
		<div className={chartTooltipClass}>
			<p className="font-semibold">{label}</p>
			<p>{formatCurrencyWithCommas(value)}</p>
		</div>
	);
}

function toPieItems(
	rows: DashboardAnalytics['spendingByCategory'],
	fallbackColor: string
): PieChartDataItem[] {
	return rows.map((row) => ({
		name: row.name,
		value: row.value,
		color: row.colour ?? fallbackColor,
		percent: row.percent,
		categoryId: row.categoryId,
		groupKey: row.groupKey,
	}));
}

function DashboardSkeleton() {
	return (
		<div className="p-4 md:p-6 space-y-8 animate-pulse">
			<div className="flex flex-wrap justify-between items-center gap-4">
				<div className="h-8 w-56 rounded-md bg-white/10" />
				<div className="h-9 w-72 rounded-md bg-white/10" />
			</div>
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className="h-24 rounded-xl border border-white/10 bg-white/5" />
				))}
			</div>
			<div className="h-[400px] rounded-xl border border-white/10 bg-white/5" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
			</div>
			<div className="h-[340px] rounded-xl border border-white/10 bg-white/5" />
		</div>
	);
}

function DashboardEmptyState({ periodLabel }: { periodLabel?: string }) {
	const filtered = periodLabel !== undefined && periodLabel.length > 0;
	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
			<div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
				<FileArchive className="mx-auto h-12 w-12 text-white/40" />
				<h2 className="mt-4 text-lg font-semibold text-white">
					{filtered ? 'No data for this period' : 'No transactions yet'}
				</h2>
				<p className="mt-2 text-sm text-white/60">
					{filtered
						? `No transactions in ${periodLabel}. Try a wider date range.`
						: 'Upload a bank statement PDF to see spending, income, and balance charts here.'}
				</p>
				{!filtered ? (
					<Link
						to="/statements"
						className="mt-6 inline-flex rounded-md border border-secondary-default bg-secondary-default/20 px-4 py-2 text-sm font-medium text-white hover:bg-secondary-default/30"
					>
						Upload statements
					</Link>
				) : null}
			</div>
		</div>
	);
}

type BreakdownFlow = 'spending' | 'income';

type ActiveBreakdown = {
	flow: BreakdownFlow;
	groupKey: string;
};

function DashboardErrorState({ message }: { message: string }) {
	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
			<div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/40 p-8 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-red-400" />
				<h2 className="mt-4 text-lg font-semibold text-white">Could not load dashboard</h2>
				<p className="mt-2 text-sm text-white/70">{message}</p>
			</div>
		</div>
	);
}

export const Dashboard = () => {
	const dispatch = useAppDispatch();
	const { categoriesLoading, categoriesError } = useAppSelector(state => state.CategoryReducer);

	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
	const [previousKpis, setPreviousKpis] = useState<KpiComparison | null>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(true);
	const [analyticsError, setAnalyticsError] = useState<string | null>(null);

	const [activeBreakdown, setActiveBreakdown] = useState<ActiveBreakdown | null>(null);
	const [breakdownGroupByName, setBreakdownGroupByName] = useState(false);
	const [drilldownRows, setDrilldownRows] = useState<Transaction[]>([]);
	const [drilldownByNameRows, setDrilldownByNameRows] = useState<SpendingNameRow[]>([]);
	const [drilldownTotal, setDrilldownTotal] = useState(0);
	const [drilldownPage, setDrilldownPage] = useState(1);
	const [drilldownTotalPages, setDrilldownTotalPages] = useState(0);
	const [drilldownLoading, setDrilldownLoading] = useState(false);

	const DRILLDOWN_PER_PAGE = 50;
	const periodLabel = PERIOD_LABELS[period];
	const comparisonLabel = period !== 'all' ? COMPARISON_LABELS[period] : undefined;
	const dateRange = useMemo(() => periodDateRange(period), [period]);
	const previousDateRange = useMemo(
		() => (period !== 'all' ? previousPeriodDateRange(period) : null),
		[period]
	);

	const categoriesAutoFetchCommittedRef = useRef(false);
	const analyticsGenRef = useRef(0);

	useEffect(() => {
		localStorage.removeItem('groupByParentCategory');
	}, []);

	useEffect(() => {
		void dispatch(getMappings());
	}, [dispatch]);

	useEffect(() => {
		if (categoriesLoading || categoriesError !== null) {
			return;
		}
		if (categoriesAutoFetchCommittedRef.current) {
			return;
		}
		categoriesAutoFetchCommittedRef.current = true;
		void dispatch(getAllCategories());
	}, [dispatch, categoriesLoading, categoriesError]);

	useEffect(() => {
		localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		const gen = analyticsGenRef.current + 1;
		analyticsGenRef.current = gen;
		setAnalyticsLoading(true);
		setAnalyticsError(null);

		const previousFetch =
			previousDateRange !== null
				? fetchDashboardKpis(previousDateRange).catch(() => null)
				: Promise.resolve(null);

		void Promise.all([fetchDashboardAnalytics(false, dateRange), previousFetch])
			.then(([data, previous]) => {
				if (analyticsGenRef.current !== gen) {
					return;
				}
				setAnalytics(data);
				setPreviousKpis(previous);
			})
			.catch((err: unknown) => {
				if (analyticsGenRef.current !== gen) {
					return;
				}
				setAnalyticsError(err instanceof Error ? err.message : 'Failed to load dashboard');
				setAnalytics(null);
				setPreviousKpis(null);
			})
			.finally(() => {
				if (analyticsGenRef.current === gen) {
					setAnalyticsLoading(false);
				}
			});
	}, [dateRange, previousDateRange]);

	useEffect(() => {
		setDrilldownPage(1);
	}, [activeBreakdown, breakdownGroupByName]);

	useEffect(() => {
		if (activeBreakdown === null) {
			setBreakdownGroupByName(false);
			setDrilldownRows([]);
			setDrilldownByNameRows([]);
			setDrilldownTotal(0);
			setDrilldownTotalPages(0);
			return;
		}
		setDrilldownLoading(true);
		const { flow, groupKey } = activeBreakdown;
		if (breakdownGroupByName) {
			const fetchByName =
				flow === 'spending' ? fetchSpendingDrilldownByName : fetchIncomeDrilldownByName;
			void fetchByName({
				groupKey,
				groupByParent: false,
			})
				.then((rows) => {
					setDrilldownByNameRows(rows);
					setDrilldownRows([]);
					setDrilldownTotal(rows.reduce((sum, row) => sum + row.count, 0));
					setDrilldownTotalPages(0);
				})
				.finally(() => setDrilldownLoading(false));
			return;
		}
		const fetchPage = flow === 'spending' ? fetchSpendingDrilldown : fetchIncomeDrilldown;
		void fetchPage({
			groupKey,
			groupByParent: false,
			page: drilldownPage,
			perPage: DRILLDOWN_PER_PAGE,
		})
			.then((page) => {
				setDrilldownRows(page.items);
				setDrilldownByNameRows([]);
				setDrilldownTotal(page.total);
				setDrilldownTotalPages(page.totalPages);
			})
			.finally(() => setDrilldownLoading(false));
	}, [activeBreakdown, breakdownGroupByName, drilldownPage]);

	const spendingByCategory = useMemo(
		() => toPieItems(analytics?.spendingByCategory ?? [], '#8884d8'),
		[analytics]
	);
	const incomeByCategory = useMemo(
		() => toPieItems(analytics?.incomeByCategory ?? [], '#82ca9d'),
		[analytics]
	);
	const monthlySummary = analytics?.monthlySummary ?? [];
	const runningTotalData = useMemo(
		() =>
			(analytics?.balanceSeries ?? []).map((point) => ({
				date: new Date(point.date).toLocaleDateString('en-AU'),
				val: point.balance,
			})),
		[analytics]
	);

	const averageBalance = useMemo(() => {
		if (runningTotalData.length === 0) {
			return 0;
		}
		return runningTotalData.reduce((sum, d) => sum + d.val, 0) / runningTotalData.length;
	}, [runningTotalData]);

	const kpiMetrics = useMemo(() => {
		if (analytics === null) {
			return null;
		}
		const spending = analytics.spendingByCategory.reduce((sum, row) => sum + row.value, 0);
		const income = analytics.incomeByCategory.reduce((sum, row) => sum + row.value, 0);
		const series = analytics.balanceSeries;
		const balance = series.length > 0 ? series[series.length - 1].balance : null;
		return {
			balance,
			spending,
			income,
			net: income - spending,
		};
	}, [analytics]);

	const breakdownTitle = useMemo(() => {
		if (activeBreakdown === null) {
			return '';
		}
		const rows =
			activeBreakdown.flow === 'spending' ? spendingByCategory : incomeByCategory;
		const row = rows.find((d) => d.groupKey === activeBreakdown.groupKey);
		return row?.name ?? 'Category';
	}, [activeBreakdown, spendingByCategory, incomeByCategory]);

	const breakdownTotal = useMemo(() => {
		if (activeBreakdown === null) {
			return 0;
		}
		const rows =
			activeBreakdown.flow === 'spending' ? spendingByCategory : incomeByCategory;
		const row = rows.find((d) => d.groupKey === activeBreakdown.groupKey);
		return row?.value ?? 0;
	}, [activeBreakdown, spendingByCategory, incomeByCategory]);

	const breakdownIsSpending = activeBreakdown?.flow === 'spending';

	const isLoading = analyticsLoading || categoriesLoading;
	const isRefreshing = analyticsLoading && analytics !== null;
	const loadError = analyticsError ?? categoriesError;
	const hasChartData =
		spendingByCategory.length > 0 ||
		incomeByCategory.length > 0 ||
		monthlySummary.length > 0;

	if (isLoading && analytics === null) {
		return <DashboardSkeleton />;
	}

	if (loadError !== null) {
		return <DashboardErrorState message={loadError} />;
	}

	if (analytics === null || !hasChartData) {
		return (
			<div
				className={cn(
					'transition-opacity duration-300 ease-out',
					isRefreshing ? 'opacity-70' : 'opacity-100'
				)}
			>
				<DashboardEmptyState
					periodLabel={period !== 'all' ? periodLabel : undefined}
				/>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6 space-y-8">
			{activeBreakdown !== null ? (
				<>
					<div
						role="presentation"
						className="fixed inset-0 z-40 cursor-pointer bg-black/50 transition-opacity duration-200"
						onClick={() => {
							setActiveBreakdown(null);
						}}
					/>
					<aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-gray-950 shadow-2xl transition-transform duration-300 ease-out">
						<div className="flex shrink-0 flex-col gap-3 border-b border-white/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-white/50">
										{breakdownIsSpending ? 'Spending breakdown' : 'Income breakdown'}
									</p>
									<h2 className="text-lg font-semibold text-white">{breakdownTitle}</h2>
									<p className="mt-1 text-sm text-white/70">
										Total{' '}
										<span
											className={`font-medium tabular-nums ${
												breakdownIsSpending ? 'text-red-400' : 'text-emerald-400'
											}`}
										>
											{breakdownIsSpending
												? formatCurrencyWithCommas(-breakdownTotal)
												: formatCurrencyWithCommas(breakdownTotal)}
										</span>
										{' · '}
										{drilldownTotal}{' '}
										{drilldownTotal === 1 ? 'transaction' : 'transactions'}
									</p>
								</div>
								<button
									type="button"
									className="cursor-pointer rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
									aria-label="Close"
									onClick={() => {
										setActiveBreakdown(null);
									}}
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<button
								type="button"
								className={`cursor-pointer self-start rounded-md border px-3 py-1.5 text-sm ${
									breakdownGroupByName
										? 'border-secondary-default bg-secondary-default/20 text-white'
										: 'border-white/20 text-white/85 hover:bg-white/10'
								}`}
								aria-pressed={breakdownGroupByName}
								onClick={(e) => {
									e.stopPropagation();
									setBreakdownGroupByName((v) => !v);
								}}
							>
								Group by name
							</button>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto p-4">
							{drilldownLoading ? (
								<p className="text-center text-sm text-white/50">Loading transactions…</p>
							) : breakdownGroupByName ? (
								drilldownByNameRows.length === 0 ? (
									<p className="text-center text-sm text-white/50">
										{breakdownIsSpending
											? 'No spending transactions in this group.'
											: 'No income transactions in this group.'}
									</p>
								) : (
									<ul className="space-y-2">
										{drilldownByNameRows.map((row) => (
											<li
												key={row.name}
												className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
											>
												<div className="flex justify-between gap-2 text-white">
													<span
														className={`font-medium tabular-nums ${
															breakdownIsSpending ? 'text-red-400' : 'text-emerald-400'
														}`}
													>
														{breakdownIsSpending
															? formatCurrencyWithCommas(-row.totalDollars)
															: formatCurrencyWithCommas(row.totalDollars)}
													</span>
													<span className="shrink-0 text-white/50">
														{row.count}×
													</span>
												</div>
												<p className="mt-1 break-words text-white/80">{row.name}</p>
											</li>
										))}
									</ul>
								)
							) : drilldownRows.length === 0 ? (
								<p className="text-center text-sm text-white/50">
									{breakdownIsSpending
										? 'No spending transactions in this group.'
										: 'No income transactions in this group.'}
								</p>
							) : (
								<ul className="space-y-2">
									{drilldownRows.map((tx) => {
										const dollars = tx.amount / 100;
										const when = tx.transaction_date.slice(0, 10);
										const amountClass =
											dollars < 0 ? 'text-red-400' : 'text-emerald-300/90';
										return (
											<li
												key={tx.id}
												className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
											>
												<div className="flex justify-between gap-2 text-white">
													<span className={`font-medium tabular-nums ${amountClass}`}>
														{formatCurrencyWithCommas(dollars)}
													</span>
													<span className="shrink-0 text-white/50">{when}</span>
												</div>
												<p className="mt-1 break-words text-white/80">{tx.description}</p>
											</li>
										);
									})}
								</ul>
							)}
							{!breakdownGroupByName && drilldownTotalPages > 1 ? (
								<div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
									<button
										type="button"
										className="cursor-pointer rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
										disabled={drilldownPage <= 1 || drilldownLoading}
										onClick={() => setDrilldownPage((p) => Math.max(1, p - 1))}
									>
										Previous
									</button>
									<span className="text-xs text-white/50">
										Page {drilldownPage} of {drilldownTotalPages}
									</span>
									<button
										type="button"
										className="cursor-pointer rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
										disabled={drilldownPage >= drilldownTotalPages || drilldownLoading}
										onClick={() =>
											setDrilldownPage((p) => Math.min(drilldownTotalPages, p + 1))
										}
									>
										Next
									</button>
								</div>
							) : null}
						</div>
					</aside>
				</>
			) : null}

			<div className="flex flex-wrap justify-between items-center gap-4">
				<h2 className="text-2xl font-semibold text-white">Spending & Income Overview</h2>
				<PeriodFilter value={period} onChange={setPeriod} pending={isRefreshing} />
			</div>

			<div className="relative">
				<div
					className={cn(
						'h-0.5 overflow-hidden rounded-full bg-white/10 transition-opacity duration-300',
						isRefreshing ? 'opacity-100' : 'opacity-0'
					)}
					aria-hidden={!isRefreshing}
				>
					<div className="h-full w-2/5 animate-pulse rounded-full bg-secondary-default/80 motion-reduce:animate-none" />
				</div>

				<div
					className={cn(
						'mt-2 space-y-8 transition-opacity duration-300 ease-out',
						isRefreshing && 'pointer-events-none opacity-55'
					)}
					aria-busy={isRefreshing}
				>
					{kpiMetrics !== null ? (
						<KpiCards
							metrics={kpiMetrics}
							periodLabel={periodLabel}
							comparisonLabel={comparisonLabel}
							previousMetrics={previousKpis}
							isRefreshing={isRefreshing}
							formatCurrency={formatCurrencyWithCommas}
						/>
					) : null}

					<ChartCard title="Monthly Profit / Loss">
						<MonthlyBarGraph data={monthlySummary} />
					</ChartCard>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<ChartCard
							title="Spending by Category"
							subtitle="Click a slice to see transactions"
						>
							<CategoryPieChart
								data={spendingByCategory}
								chartLabel="Spending by Category"
								variant="donut"
								showRankedList
								onSliceClick={(item) => {
									setActiveBreakdown({ flow: 'spending', groupKey: item.groupKey });
								}}
							/>
						</ChartCard>

						<ChartCard
							title="Income by Category"
							subtitle="Click a slice to see transactions"
						>
							<CategoryPieChart
								data={incomeByCategory}
								chartLabel="Income by Category"
								variant="donut"
								showRankedList
								onSliceClick={(item) => {
									setActiveBreakdown({ flow: 'income', groupKey: item.groupKey });
								}}
							/>
						</ChartCard>
					</div>

					<ChartCard title="Balance Over Time">
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={runningTotalData}>
								<CartesianGrid
									stroke={chartTheme.grid.stroke}
									strokeDasharray={chartTheme.grid.strokeDasharray}
								/>
								<XAxis dataKey="date" stroke={chartTheme.axis.stroke} tick={chartTheme.axis.tick} />
								<YAxis
									dataKey="val"
									stroke={chartTheme.axis.stroke}
									tick={chartTheme.axis.tick}
									tickFormatter={formatCurrencyWithCommas}
								/>
								<Tooltip content={balanceTooltip} />
								<Line
									type="monotone"
									dataKey="val"
									name="Balance"
									stroke="#6ee7b7"
									strokeWidth={2}
									dot={false}
									isAnimationActive={!isRefreshing}
									animationDuration={400}
								/>
								<ReferenceLine
									y={averageBalance}
									stroke="#94a3b8"
									strokeDasharray="6 4"
									ifOverflow="extendDomain"
								/>
							</LineChart>
						</ResponsiveContainer>
					</ChartCard>
				</div>
			</div>
		</div>
	);
};
