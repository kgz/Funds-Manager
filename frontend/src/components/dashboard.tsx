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
import { BalanceStackGraph, balanceStackAccountColorMap } from '@/graphs/balance-stack';
import {
	chartColors,
	chartSeriesColorForKey,
	chartTheme,
	chartTooltipClass,
} from '@/graphs/theme';
import { ChartCard } from '@/components/ChartCard';
import { NetWorthChart } from '@/graphs/net-worth';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { BalanceTrendHelp } from '@/components/dashboard/BalanceTrendHelp';
import { AccountFilter } from '@/components/account-filter';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	COMPARISON_LABELS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	PERIOD_LABELS,
	PERIOD_ACTIVITY_LABELS,
	periodDateRange,
	previousPeriodDateRange,
	readStoredPeriod,
	type DashboardPeriod,
} from '@/components/dashboard/period';
import type { KpiComparison, DashboardKpiMetrics } from '@/components/dashboard/KpiCards';
import { CartesianGrid, Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from 'recharts';
import { Drawer } from '@/components/layout/Drawer';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageShell } from '@/components/layout/PageShell';
import { buttonAccentClass, buttonOutlineClass, pageActionsClass, pageBodyClass, pageHeaderClass, pageSubtitleClass, pageTitleClass, selectDarkClass } from '@/components/layout/tokens';
import { FileArchive, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { cn } from '@/lib/utils/cn';
import {
	chartDateSpanDays,
	formatChartAxisDate,
	formatChartTooltipDate,
	formatMonthLabel,
	formatTransactionDate,
} from '@/lib/utils/dates';
import { formatChartAxisCompactMoney } from '@/lib/utils/chartMoney';
import {
	applyPortfolioTrendToRows,
	buildAccountOnboardingEvents,
	buildBalanceTrendSegments,
	buildTrendSegmentLabels,
	type AccountOnboardingEvent,
	type TrendSegmentLabel,
} from '@/lib/utils/balanceTrendSegments';
import { portfolioBalanceChangeDetail, portfolioBalanceChangeLine } from '@/lib/utils/linearTrend';
import {
	renderTrendEventMarkers,
	useTrendEventMarkerState,
} from '@/graphs/trend-event-markers';
import { renderTrendSegmentLabels } from '@/graphs/trend-segment-labels';

type BalanceChartRow = {
	date: string;
	val: number;
	trend: number | null;
};

const BALANCE_CHART_MODE_KEY = 'dashboardBalanceChartMode';
const DASHBOARD_CHART_HEIGHT = 200;

type BalanceChartMode = 'stacked' | 'combined';

function readBalanceChartMode(): BalanceChartMode {
	if (typeof window === 'undefined') {
		return 'stacked';
	}
	return localStorage.getItem(BALANCE_CHART_MODE_KEY) === 'combined'
		? 'combined'
		: 'stacked';
}

const formatCurrencyWithCommas = (value: number | null | undefined): string => {
	if (value === null || value === undefined) return '$--';
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};

function balanceChartDomain(values: number[]): [number, number] | undefined {
	if (values.length === 0) {
		return undefined;
	}
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;
	const pad = span === 0 ? Math.max(Math.abs(max) * 0.05, 1) : span * 0.08;
	return [min - pad, max + pad];
}

function balanceTooltip({ active, payload, label }: TooltipContentProps) {
	if (!active || payload === undefined || payload.length === 0) {
		return null;
	}
	const heading =
		typeof label === 'string' ? formatChartTooltipDate(label) : label;

	function seriesColor(dataKey: string | number | undefined): string | undefined {
		if (dataKey === 'val') {
			return chartColors.netWorth;
		}
		if (dataKey === 'trend') {
			return chartColors.trend;
		}
		return undefined;
	}

	return (
		<div className={chartTooltipClass}>
			<p className="mb-1 font-semibold text-paper-fg">{heading}</p>
			{payload.map((entry, index) => {
				const value = entry.value;
				if (typeof value !== 'number') {
					return null;
				}
				const key =
					typeof entry.dataKey === 'string' || typeof entry.dataKey === 'number'
						? entry.dataKey
						: index;
				const name =
					typeof entry.name === 'string' || typeof entry.name === 'number'
						? entry.name
						: key;
				const dataKey = entry.dataKey;
				const color =
					typeof dataKey === 'string' || typeof dataKey === 'number'
						? seriesColor(dataKey)
						: undefined;
				return (
					<p
						key={key}
						style={color !== undefined ? { color } : undefined}
						className={color === undefined ? 'text-paper-fg' : undefined}
					>
						{name}: {formatCurrencyWithCommas(value)}
					</p>
				);
			})}
		</div>
	);
}

function toPieItems(rows: DashboardAnalytics['spendingByCategory']): PieChartDataItem[] {
	return rows.map((row) => ({
		name: row.name,
		value: row.value,
		color: row.colour ?? chartSeriesColorForKey(row.groupKey),
		percent: row.percent,
		categoryId: row.categoryId,
		groupKey: row.groupKey,
	}));
}

function DashboardSkeleton() {
	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="h-7 w-64 animate-pulse rounded bg-paper" />
			</header>
			<div className={pageBodyClass}>
				<div className="flex animate-pulse flex-col gap-6">
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						{Array.from({ length: 4 }, (_, i) => (
							<div key={i} className="h-24 rounded-lg border border-paper-border bg-paper-surface" />
						))}
					</div>
					<div className="h-[320px] rounded-lg border border-paper-border bg-paper-surface" />
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
						<div className="h-[220px] rounded-lg border border-paper-border bg-paper-surface" />
						<div className="h-[220px] rounded-lg border border-paper-border bg-paper-surface" />
					</div>
				</div>
			</div>
		</PageShell>
	);
}

type BreakdownFlow = 'spending' | 'income';

type ActiveBreakdown = {
	flow: BreakdownFlow;
	groupKey: string;
	title: string;
	total: number;
};

export const Dashboard = () => {
	const dispatch = useAppDispatch();
	const { categoriesLoading, categoriesError } = useAppSelector(state => state.CategoryReducer);
	const { accountIdNumber, selectedLabel } = useAccountFilter();

	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [balanceChartMode, setBalanceChartMode] = useState<BalanceChartMode>(() =>
		readBalanceChartMode()
	);
	const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
	const [currentKpis, setCurrentKpis] = useState<DashboardKpiMetrics | null>(null);
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
	const pageSubtitle = `${selectedLabel} · ${PERIOD_ACTIVITY_LABELS[period]}`;
	const comparisonLabel = period !== 'all' ? COMPARISON_LABELS[period] : undefined;
	const dateRange = useMemo(
		() => ({ ...periodDateRange(period), accountId: accountIdNumber }),
		[period, accountIdNumber]
	);
	const previousDateRange = useMemo(
		() =>
			period !== 'all'
				? { ...previousPeriodDateRange(period), accountId: accountIdNumber }
				: null,
		[period, accountIdNumber]
	);

	const categoriesAutoFetchCommittedRef = useRef(false);
	const analyticsGenRef = useRef(0);

	useEffect(() => {
		localStorage.removeItem('groupByParentCategory');
	}, []);

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
		localStorage.setItem(BALANCE_CHART_MODE_KEY, balanceChartMode);
	}, [balanceChartMode]);

	useEffect(() => {
		const gen = analyticsGenRef.current + 1;
		analyticsGenRef.current = gen;
		setAnalyticsLoading(true);
		setAnalyticsError(null);

		const previousFetch =
			previousDateRange !== null
				? fetchDashboardKpis(previousDateRange).catch(() => null)
				: Promise.resolve(null);

		void Promise.all([
			fetchDashboardAnalytics(false, dateRange),
			fetchDashboardKpis(dateRange),
			previousFetch,
		])
			.then(([data, kpis, previous]) => {
				if (analyticsGenRef.current !== gen) {
					return;
				}
				setAnalytics(data);
				setCurrentKpis(kpis);
				setPreviousKpis(previous);
			})
			.catch((err: unknown) => {
				if (analyticsGenRef.current !== gen) {
					return;
				}
				setAnalyticsError(err instanceof Error ? err.message : 'Failed to load dashboard');
				setAnalytics(null);
				setCurrentKpis(null);
				setPreviousKpis(null);
			})
			.finally(() => {
				if (analyticsGenRef.current === gen) {
					setAnalyticsLoading(false);
				}
			});
	}, [
		period,
		dateRange.start,
		dateRange.end,
		dateRange.accountId,
		previousDateRange?.start,
		previousDateRange?.end,
		previousDateRange?.accountId,
	]);

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
				dateRange,
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
			dateRange,
		})
			.then((page) => {
				setDrilldownRows(page.items);
				setDrilldownByNameRows([]);
				setDrilldownTotal(page.total);
				setDrilldownTotalPages(page.totalPages);
			})
			.finally(() => setDrilldownLoading(false));
	}, [activeBreakdown, breakdownGroupByName, drilldownPage, dateRange]);

	const spendingByCategory = useMemo(
		() => toPieItems(analytics?.spendingByCategory ?? []),
		[analytics]
	);
	const incomeByCategory = useMemo(
		() => toPieItems(analytics?.incomeByCategory ?? []),
		[analytics]
	);
	const monthlySummary = useMemo(
		() =>
			(analytics?.monthlySummary ?? []).map((row) => ({
				...row,
				month: formatMonthLabel(row.month),
			})),
		[analytics]
	);
	const balanceStackData = useMemo(
		() =>
			analytics?.balanceStack ?? {
				accounts: [],
				rows: [],
			},
		[analytics]
	);

	const balanceChartModel = useMemo((): {
		rows: BalanceChartRow[];
		events: AccountOnboardingEvent[];
		trendLabels: TrendSegmentLabel[];
	} => {
		const points = (analytics?.balanceSeries ?? []).map((point) => ({
			date: point.date,
			val: point.balance,
		}));

		if (balanceStackData.rows.length > 0 && balanceStackData.accounts.length > 0) {
			const segments = buildBalanceTrendSegments(
				balanceStackData.rows,
				balanceStackData.accounts,
			);
			const rows = applyPortfolioTrendToRows(points, segments);
			const events = buildAccountOnboardingEvents(
				balanceStackData.rows,
				balanceStackData.accounts,
				segments,
			);
			const trendLabels = buildTrendSegmentLabels(balanceStackData.rows, segments);
			return { rows, events, trendLabels };
		}

		const totals = points.map((point) => point.val);
		const trend = portfolioBalanceChangeLine(totals);
		const rows = points.map((point, index) => ({
			...point,
			trend: trend[index] ?? null,
		}));
		const stackRows = points.map((point) => ({ date: point.date, total: point.val }));
		const trendValues: Array<number | null> = totals.map((_, index) => trend[index] ?? null);
		const trendLabels = buildTrendSegmentLabels(stackRows, [
			{ startIndex: 0, label: '', values: trendValues },
		]);
		return { rows, events: [], trendLabels };
	}, [analytics, balanceStackData]);

	const balanceChartData = balanceChartModel.rows;
	const balanceChartEvents = balanceChartModel.events;
	const balanceTrendLabels = balanceChartModel.trendLabels;
	const balanceMarkerState = useTrendEventMarkerState();
	const balanceAccountColorByKey = useMemo(
		() => balanceStackAccountColorMap(balanceStackData.accounts),
		[balanceStackData.accounts],
	);

	const balanceYDomain = useMemo(
		() =>
			balanceChartDomain(
				balanceChartData.flatMap((point) => {
					const values: number[] = [point.val];
					if (point.trend !== null) {
						values.push(point.trend);
					}
					return values;
				}),
			),
		[balanceChartData],
	);

	const balanceDateSpanDays = useMemo(() => {
		const dates =
			balanceChartMode === 'stacked'
				? balanceStackData.rows.map((row) => row.date)
				: balanceChartData.map((point) => point.date);
		return chartDateSpanDays(dates);
	}, [balanceChartMode, balanceStackData, balanceChartData]);

	const kpiMetrics = currentKpis;

	const breakdownTitle = activeBreakdown?.title ?? '';
	const breakdownTotal = activeBreakdown?.total ?? 0;

	const balanceStackAvailable = balanceStackData.accounts.length > 0;
	const showStackedBalance = balanceChartMode === 'stacked' && balanceStackAvailable;

	const balanceTrendDetail = useMemo(() => {
		if (balanceStackData.rows.length > 0 && balanceStackData.accounts.length > 0) {
			const segments = buildBalanceTrendSegments(
				balanceStackData.rows,
				balanceStackData.accounts,
			);
			const totals = balanceStackData.rows.map((row) => row.total);
			return portfolioBalanceChangeDetail(totals, segments);
		}
		const totals = balanceChartData.map((point) => point.val);
		return portfolioBalanceChangeDetail(totals, [{ startIndex: 0, label: 'Balance' }]);
	}, [balanceStackData, balanceChartData]);

	const balanceTrendHeader =
		balanceTrendDetail === null ? null : (
			<BalanceTrendHelp detail={balanceTrendDetail} />
		);

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

	const showFilteredEmpty = analytics !== null && !hasChartData;

	return (
		<PageShell variant="table">
			<Drawer
				open={activeBreakdown !== null}
				onClose={() => setActiveBreakdown(null)}
				eyebrow={breakdownIsSpending ? 'Spending breakdown' : 'Income breakdown'}
				title={breakdownTitle}
				description={
					<>
						Total{' '}
						<span
							className={cn(
								'font-medium tabular-nums',
								breakdownIsSpending ? 'text-red-400' : 'text-emerald-400'
							)}
						>
							{breakdownIsSpending
								? formatCurrencyWithCommas(-breakdownTotal)
								: formatCurrencyWithCommas(breakdownTotal)}
						</span>
						{' · '}
						{drilldownTotal}{' '}
						{drilldownTotal === 1 ? 'transaction' : 'transactions'}
					</>
				}
				headerActions={
					<button
						type="button"
						className={cn(
							'cursor-pointer self-start rounded-md border px-3 py-1.5 text-sm',
							breakdownGroupByName
								? 'border-secondary-default bg-secondary-default/15 text-secondary-default'
								: 'border-paper-border text-paper-fg hover:bg-paper'
						)}
						aria-pressed={breakdownGroupByName}
						onClick={() => setBreakdownGroupByName((v) => !v)}
					>
						Group by name
					</button>
				}
				footer={
					!breakdownGroupByName && drilldownTotalPages > 1 ? (
						<div className="flex items-center justify-between gap-2">
							<button
								type="button"
								className={cn(buttonOutlineClass, 'disabled:cursor-not-allowed disabled:opacity-40')}
								disabled={drilldownPage <= 1 || drilldownLoading}
								onClick={() => setDrilldownPage((p) => Math.max(1, p - 1))}
							>
								Previous
							</button>
							<span className="text-xs text-paper-muted">
								Page {drilldownPage} of {drilldownTotalPages}
							</span>
							<button
								type="button"
								className={cn(buttonOutlineClass, 'disabled:cursor-not-allowed disabled:opacity-40')}
								disabled={drilldownPage >= drilldownTotalPages || drilldownLoading}
								onClick={() =>
									setDrilldownPage((p) => Math.min(drilldownTotalPages, p + 1))
								}
							>
								Next
							</button>
						</div>
					) : undefined
				}
			>
				{drilldownLoading ? (
					<div className="flex items-center justify-center gap-3 py-8 text-sm text-paper-muted">
						<Loader2 className="h-5 w-5 animate-spin text-secondary-default" />
						Loading transactions…
					</div>
				) : breakdownGroupByName ? (
					drilldownByNameRows.length === 0 ? (
						<EmptyState
							compact
							icon={FileArchive}
							title="No transactions in this group"
							description={
								breakdownIsSpending
									? 'No spending transactions matched this category.'
									: 'No income transactions matched this category.'
							}
							className="py-4"
						/>
					) : (
						<ul className="space-y-2">
							{drilldownByNameRows.map((row) => (
								<li
									key={row.name}
									className="rounded-md border border-paper-border bg-paper px-3 py-2 text-sm"
								>
									<div className="flex justify-between gap-2 text-paper-fg">
										<span
											className={cn(
												'font-medium tabular-nums',
												breakdownIsSpending ? 'text-red-400' : 'text-emerald-400'
											)}
										>
											{breakdownIsSpending
												? formatCurrencyWithCommas(-row.totalDollars)
												: formatCurrencyWithCommas(row.totalDollars)}
										</span>
										<span className="shrink-0 text-paper-muted">{row.count}×</span>
									</div>
									<p className="mt-1 break-words text-paper-fg">{row.name}</p>
								</li>
							))}
						</ul>
					)
				) : drilldownRows.length === 0 ? (
					<EmptyState
						compact
						icon={FileArchive}
						title="No transactions in this group"
						description={
							breakdownIsSpending
								? 'No spending transactions matched this category.'
								: 'No income transactions matched this category.'
						}
						className="py-4"
					/>
				) : (
					<ul className="space-y-2">
						{drilldownRows.map((tx) => {
							const dollars = tx.amount / 100;
							const when = formatTransactionDate(tx.transaction_date);
							const amountClass =
								dollars < 0 ? 'text-red-400' : 'text-emerald-300/90';
							return (
								<li
									key={tx.id}
									className="rounded-md border border-paper-border bg-paper px-3 py-2 text-sm"
								>
									<div className="flex justify-between gap-2 text-paper-fg">
										<span className={cn('font-medium tabular-nums', amountClass)}>
											{formatCurrencyWithCommas(dollars)}
										</span>
										<span className="shrink-0 text-paper-muted">{when}</span>
									</div>
									<p className="mt-1 break-words text-paper-fg">{tx.description}</p>
								</li>
							);
						})}
					</ul>
				)}
			</Drawer>

			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Spending & Income Overview</h1>
							{isRefreshing ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>{pageSubtitle}</p>
					</div>
					<div className={pageActionsClass}>
						<AccountFilter className={cn(selectDarkClass, 'h-8 min-w-[10rem] px-2.5')} />
						<PeriodFilter
							value={period}
							onChange={setPeriod}
							pending={isRefreshing}
							className="flex-nowrap"
						/>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				<div
					className={cn(
						'flex flex-col gap-6 transition-opacity duration-300 ease-out',
						isRefreshing && 'opacity-55'
					)}
					aria-busy={isRefreshing}
				>
					{loadError !== null ? (
						<ErrorState
							title="Could not load dashboard"
							message={loadError}
						/>
					) : null}

					{loadError === null && kpiMetrics !== null ? (
						<KpiCards
							metrics={kpiMetrics}
							comparisonLabel={comparisonLabel}
							previousMetrics={previousKpis}
							isRefreshing={isRefreshing}
							formatCurrency={formatCurrencyWithCommas}
						/>
					) : null}

					{loadError === null && showFilteredEmpty ? (
						<EmptyState
							icon={FileArchive}
							title={
								period !== 'all'
									? 'No data for this period'
									: 'No transactions yet'
							}
							description={
								period !== 'all'
									? `No transactions in ${periodLabel}. Try a wider date range.`
									: 'Upload a bank statement PDF to see spending, income, and balance charts here.'
							}
							action={
								period === 'all' ? (
									<Link to="/statements" className={buttonAccentClass}>
										Upload statements
									</Link>
								) : undefined
							}
						/>
					) : null}

					{loadError === null && hasChartData ? (
						<div
							className={cn(
								'flex flex-col gap-6 transition-opacity duration-300 ease-out',
								isRefreshing && 'pointer-events-none'
							)}
						>
							<div className="@container/charts">
								<div className="grid grid-cols-1 gap-3 lg:grid-cols-2 @min-[80rem]/charts:grid-cols-[1.4fr_1fr_1fr]">
									<ChartCard
										className="min-w-0 lg:col-span-2 @min-[80rem]/charts:col-span-1"
										title="Receiving vs Spending"
										subtitle="Monthly totals · AUD"
										subtitleAlign="end"
									>
										<MonthlyBarGraph data={monthlySummary} compactInRow />
									</ChartCard>

									<ChartCard
										className="min-w-0"
										title="Spending by Category"
										subtitle="Click a slice to see transactions"
									>
										<CategoryPieChart
											data={spendingByCategory}
											chartLabel="Spending by Category"
											variant="donut"
											showRankedList
											onSliceClick={(item) => {
												setActiveBreakdown({
													flow: 'spending',
													groupKey: item.groupKey,
													title: item.name,
													total: item.value,
												});
											}}
										/>
									</ChartCard>

									<ChartCard
										className="min-w-0"
										title="Income by Category"
										subtitle="Click a slice to see transactions"
									>
										<CategoryPieChart
											data={incomeByCategory}
											chartLabel="Income by Category"
											variant="donut"
											showRankedList
											onSliceClick={(item) => {
												setActiveBreakdown({
													flow: 'income',
													groupKey: item.groupKey,
													title: item.name,
													total: item.value,
												});
											}}
										/>
									</ChartCard>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr]">
							<ChartCard
								title="Balance over time"
								titleExtra={balanceTrendHeader}
								subtitle={selectedLabel}
								subtitleAlign="end"
								actions={
									<SegmentedControl
										ariaLabel="Balance chart mode"
										value={balanceChartMode}
										onChange={setBalanceChartMode}
										options={[
											{ value: 'stacked', label: 'By account' },
											{ value: 'combined', label: 'Combined' },
										]}
									/>
								}
							>
								{showStackedBalance ? (
									<BalanceStackGraph
										data={balanceStackData}
										dateSpanDays={balanceDateSpanDays}
										isRefreshing={isRefreshing}
										height={DASHBOARD_CHART_HEIGHT}
									/>
								) : (
									<ResponsiveContainer width="100%" height={DASHBOARD_CHART_HEIGHT}>
										<LineChart
											data={balanceChartData}
											margin={{ top: 16, right: 12, bottom: 36, left: 4 }}
										>
											<CartesianGrid
												stroke={chartTheme.grid.stroke}
												strokeDasharray={chartTheme.grid.strokeDasharray}
												vertical={false}
											/>
											<XAxis
												dataKey="date"
												stroke={chartTheme.axis.stroke}
												tick={{ ...chartTheme.axis.tick, fontSize: 11 }}
												tickLine={false}
												axisLine={false}
												tickFormatter={(iso) =>
													formatChartAxisDate(iso, balanceDateSpanDays)
												}
												interval="preserveStartEnd"
												minTickGap={40}
												dy={8}
											/>
											<YAxis
												dataKey="val"
												domain={balanceYDomain}
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
											<Tooltip
												wrapperStyle={
													balanceMarkerState.suppressChartTooltip
														? { visibility: 'hidden' }
														: undefined
												}
												content={(props) => {
													if (balanceMarkerState.suppressChartTooltip) {
														return null;
													}
													return balanceTooltip(props);
												}}
											/>
											<Area
												type="monotone"
												dataKey="val"
												stroke="none"
												fill={chartColors.dashboardBalanceFill}
												dot={false}
												isAnimationActive={!isRefreshing}
												animationDuration={400}
												legendType="none"
											/>
											<Line
												type="monotone"
												dataKey="val"
												name="Balance"
												stroke={chartColors.dashboardBalanceStroke}
												strokeWidth={1.75}
												dot={false}
												isAnimationActive={!isRefreshing}
												animationDuration={400}
											/>
											<Line
												type="linear"
												dataKey="trend"
												name="Trend"
												stroke={chartColors.trend}
												strokeWidth={1.5}
												strokeDasharray="8 4"
												dot={false}
												connectNulls={false}
												isAnimationActive={!isRefreshing}
												animationDuration={400}
											/>
											{renderTrendSegmentLabels(balanceTrendLabels)}
											{renderTrendEventMarkers(
												balanceChartEvents,
												balanceMarkerState,
												balanceAccountColorByKey,
											)}
										</LineChart>
									</ResponsiveContainer>
								)}
							</ChartCard>

							<NetWorthChart dateRange={dateRange} variant="dashboard" />
							</div>
						</div>
					) : null}
				</div>
			</div>
		</PageShell>
	);
};
