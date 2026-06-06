import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllCategories } from "@/store/thunks/category.get.all";
import {
	fetchDashboardAnalytics,
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
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from 'recharts';
import { AlertCircle, FileArchive, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getMappings } from "@/store/thunks/mapping.get.all";

// --- Helper Functions (Consider moving to a utils file) ---

// Helper function for currency formatting with commas and optional decimals
const formatCurrencyWithCommas = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '$--'; // Handle null/undefined balance
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
				<div className="h-9 w-44 rounded-md bg-white/10" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
				<div className="lg:col-span-2 h-[400px] rounded-xl border border-white/10 bg-white/5" />
				<div className="lg:col-span-2 h-[340px] rounded-xl border border-white/10 bg-white/5" />
			</div>
		</div>
	);
}

function DashboardEmptyState() {
	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
			<div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
				<FileArchive className="mx-auto h-12 w-12 text-white/40" />
				<h2 className="mt-4 text-lg font-semibold text-white">No transactions yet</h2>
				<p className="mt-2 text-sm text-white/60">
					Upload a bank statement PDF to see spending, income, and balance charts here.
				</p>
				<Link
					to="/statements"
					className="mt-6 inline-flex rounded-md border border-secondary-default bg-secondary-default/20 px-4 py-2 text-sm font-medium text-white hover:bg-secondary-default/30"
				>
					Upload statements
				</Link>
			</div>
		</div>
	);
}

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

function GroupByParentToggle({
	enabled,
	onChange,
}: {
	enabled: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<div
			className="inline-flex rounded-md border border-white/20 p-0.5"
			role="group"
			aria-label="Category grouping"
		>
			<button
				type="button"
				className={`rounded px-3 py-1.5 text-sm transition-colors ${
					!enabled
						? 'border-secondary-default bg-secondary-default/20 text-white'
						: 'text-white/70 hover:text-white'
				}`}
				aria-pressed={!enabled}
				onClick={() => onChange(false)}
			>
				By category
			</button>
			<button
				type="button"
				className={`rounded px-3 py-1.5 text-sm transition-colors ${
					enabled
						? 'border-secondary-default bg-secondary-default/20 text-white'
						: 'text-white/70 hover:text-white'
				}`}
				aria-pressed={enabled}
				onClick={() => onChange(true)}
			>
				By parent
			</button>
		</div>
	);
}

export const Dashboard = () => {

	 const dispatch = useAppDispatch();
		const { categoriesLoading, categoriesError } = useAppSelector(state => state.CategoryReducer);

		const [groupByParentCategory, setGroupByParentCategory] = useState<boolean>(() => {
			return localStorage.getItem('groupByParentCategory') === 'true';
		});

		const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
		const [analyticsLoading, setAnalyticsLoading] = useState(true);
		const [analyticsError, setAnalyticsError] = useState<string | null>(null);

		const [spendingBreakdownGroupKey, setSpendingBreakdownGroupKey] = useState<string | null>(null);
		const [breakdownGroupByName, setBreakdownGroupByName] = useState(false);
		const [drilldownRows, setDrilldownRows] = useState<Transaction[]>([]);
		const [drilldownByNameRows, setDrilldownByNameRows] = useState<SpendingNameRow[]>([]);
		const [drilldownTotal, setDrilldownTotal] = useState(0);
		const [drilldownPage, setDrilldownPage] = useState(1);
		const [drilldownTotalPages, setDrilldownTotalPages] = useState(0);
		const [drilldownLoading, setDrilldownLoading] = useState(false);

		const DRILLDOWN_PER_PAGE = 50;

		const categoriesAutoFetchCommittedRef = useRef(false);
		const analyticsGenRef = useRef(0);
	
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
			localStorage.setItem('groupByParentCategory', String(groupByParentCategory));
		}, [groupByParentCategory]);

		useEffect(() => {
			const gen = analyticsGenRef.current + 1;
			analyticsGenRef.current = gen;
			setAnalyticsLoading(true);
			setAnalyticsError(null);
			void fetchDashboardAnalytics(groupByParentCategory)
				.then((data) => {
					if (analyticsGenRef.current !== gen) {
						return;
					}
					setAnalytics(data);
				})
				.catch((err: unknown) => {
					if (analyticsGenRef.current !== gen) {
						return;
					}
					setAnalyticsError(err instanceof Error ? err.message : 'Failed to load dashboard');
					setAnalytics(null);
				})
				.finally(() => {
					if (analyticsGenRef.current === gen) {
						setAnalyticsLoading(false);
					}
				});
		}, [groupByParentCategory]);

		useEffect(() => {
			setDrilldownPage(1);
		}, [spendingBreakdownGroupKey, groupByParentCategory, breakdownGroupByName]);

		useEffect(() => {
			if (spendingBreakdownGroupKey === null) {
				setBreakdownGroupByName(false);
				setDrilldownRows([]);
				setDrilldownByNameRows([]);
				setDrilldownTotal(0);
				setDrilldownTotalPages(0);
				return;
			}
			setDrilldownLoading(true);
			if (breakdownGroupByName) {
				void fetchSpendingDrilldownByName({
					groupKey: spendingBreakdownGroupKey,
					groupByParent: groupByParentCategory,
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
			void fetchSpendingDrilldown({
				groupKey: spendingBreakdownGroupKey,
				groupByParent: groupByParentCategory,
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
		}, [
			spendingBreakdownGroupKey,
			groupByParentCategory,
			breakdownGroupByName,
			drilldownPage,
		]);

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

	const spendingBreakdownTitle = useMemo(() => {
		if (spendingBreakdownGroupKey === null) {
			return '';
		}
		const row = spendingByCategory.find((d) => d.groupKey === spendingBreakdownGroupKey);
		return row?.name ?? 'Category';
	}, [spendingByCategory, spendingBreakdownGroupKey]);

	const spendingBreakdownRows = drilldownRows;

	const spendingBreakdownTotal = useMemo(() => {
		const row = spendingByCategory.find((d) => d.groupKey === spendingBreakdownGroupKey);
		return row?.value ?? 0;
	}, [spendingByCategory, spendingBreakdownGroupKey]);

	const isLoading = analyticsLoading || categoriesLoading;
	const loadError = analyticsError ?? categoriesError;

	if (isLoading && analytics === null) {
		return <DashboardSkeleton />;
	}

	if (loadError !== null) {
		return <DashboardErrorState message={loadError} />;
	}

	if (analytics === null || (spendingByCategory.length === 0 && incomeByCategory.length === 0 && monthlySummary.length === 0)) {
		return <DashboardEmptyState />;
	}

    return (
      <div className="p-4 md:p-6 space-y-8">
		{spendingBreakdownGroupKey !== null ? (
			<>
				<div
					role="presentation"
					className="fixed inset-0 z-40 bg-black/50"
					onClick={() => {
						setSpendingBreakdownGroupKey(null);
					}}
				/>
				<aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-gray-950 shadow-2xl">
					<div className="flex shrink-0 flex-col gap-3 border-b border-white/10 p-4">
						<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-white/50">
								Spending breakdown
							</p>
							<h2 className="text-lg font-semibold text-white">{spendingBreakdownTitle}</h2>
							<p className="mt-1 text-sm text-white/70">
								Total{' '}
								<span className="font-medium tabular-nums text-red-400">
									{formatCurrencyWithCommas(-spendingBreakdownTotal)}
								</span>
								{' · '}
								{drilldownTotal}{' '}
								{drilldownTotal === 1 ? 'transaction' : 'transactions'}
							</p>
						</div>
						<button
							type="button"
							className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
							aria-label="Close"
							onClick={() => {
								setSpendingBreakdownGroupKey(null);
							}}
						>
							<X className="h-5 w-5" />
						</button>
						</div>
						<button
							type="button"
							className={`self-start rounded-md border px-3 py-1.5 text-sm ${
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
								<p className="text-center text-sm text-white/50">No spending transactions in this group.</p>
							) : (
							<ul className="space-y-2">
								{drilldownByNameRows.map((row) => (
									<li
										key={row.name}
										className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
									>
										<div className="flex justify-between gap-2 text-white">
											<span className="font-medium tabular-nums text-red-400">
												{formatCurrencyWithCommas(-row.totalDollars)}
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
						) : spendingBreakdownRows.length === 0 ? (
							<p className="text-center text-sm text-white/50">No spending transactions in this group.</p>
						) : (
							<ul className="space-y-2">
								{spendingBreakdownRows.map((tx) => {
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
									className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40"
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
									className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40"
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
		<div className="flex flex-wrap justify-between items-center gap-4 mb-6">
			<h2 className="text-2xl font-semibold text-white">Spending & Income Overview</h2>
			<GroupByParentToggle
				enabled={groupByParentCategory}
				onChange={setGroupByParentCategory}
			/>
		</div>

		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<ChartCard
				title="Spending by Category"
				subtitle="Click a slice to see transactions"
			>
				<CategoryPieChart
					data={spendingByCategory}
					chartLabel="Spending by Category"
					onSliceClick={(item) => {
						setSpendingBreakdownGroupKey(item.groupKey);
					}}
				/>
			</ChartCard>

			<ChartCard title="Income by Category">
				<CategoryPieChart data={incomeByCategory} chartLabel="Income by Category" />
			</ChartCard>

			<ChartCard title="Monthly Profit / Loss" className="lg:col-span-2">
				<MonthlyBarGraph data={monthlySummary} />
			</ChartCard>

			<ChartCard title="Balance Over Time" className="lg:col-span-2">
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
						<Legend wrapperStyle={chartTheme.legend.wrapperStyle} />
						<Line type="monotone" dataKey="val" name="Balance" stroke="#82ca9d" dot={false} />
						<ReferenceLine
							y={
								runningTotalData.length === 0
									? 0
									: runningTotalData.reduce((sum, d) => sum + d.val, 0) /
										runningTotalData.length
							}
							stroke="#ffc658"
							label={{ value: "Avg", position: "right", fill: "#ffc658" }}
							name="Average Balance"
						/>
						<ReferenceLine
							y={
								runningTotalData.length === 0
									? 0
									: Math.min(...runningTotalData.map((d) => d.val))
							}
							stroke="#f87171"
							label={{ value: "Min", position: "right", fill: "#f87171" }}
							name="Min Balance"
						/>
						<ReferenceLine
							y={
								runningTotalData.length === 0
									? 0
									: Math.max(...runningTotalData.map((d) => d.val))
							}
							stroke="#4ade80"
							label={{ value: "Max", position: "right", fill: "#4ade80" }}
							name="Max Balance"
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartCard>
		</div>
      </div>
    );
  };
  