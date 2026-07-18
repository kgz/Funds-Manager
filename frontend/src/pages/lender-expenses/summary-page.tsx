import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ListChecks, Loader2 } from 'lucide-react';
import { NavLink } from 'react-router';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPill } from '@/components/CategoryPill';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import {
	BREAKDOWN_PRESET_PERIODS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	type DashboardPeriod,
	periodDateRange,
	readStoredPeriod,
} from '@/components/dashboard/period';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { StatCard } from '@/components/layout/StatCard';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	fetchLenderExpenseBucketBreakdown,
	fetchLenderExpenseSummary,
	type LenderExpenseBucketBreakdownResponse,
	type LenderExpenseSummaryResponse,
} from '@/types/lender-expenses';

const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SummaryRow = {
	bucketKey: string;
	label: string;
	totalDollars: number;
	monthlyAverageDollars: number;
	transactionCount: number;
	tone: 'default' | 'muted' | 'dim';
};

function buildSummaryRows(summary: LenderExpenseSummaryResponse): SummaryRow[] {
	const rows: SummaryRow[] = summary.buckets
		.filter((bucket) => bucket.transactionCount > 0 || bucket.totalDollars > 0)
		.map((bucket) => ({
			bucketKey: bucket.bucketKey,
			label: bucket.label,
			totalDollars: bucket.totalDollars,
			monthlyAverageDollars: bucket.monthlyAverageDollars,
			transactionCount: bucket.transactionCount,
			tone: 'default' as const,
		}));
	if (summary.unmapped.transactionCount > 0) {
		rows.push({
			bucketKey: 'unmapped',
			label: 'Unmapped / uncategorised',
			totalDollars: summary.unmapped.totalDollars,
			monthlyAverageDollars: summary.unmapped.monthlyAverageDollars,
			transactionCount: summary.unmapped.transactionCount,
			tone: 'muted',
		});
	}
	if (summary.excluded.transactionCount > 0) {
		rows.push({
			bucketKey: 'excluded',
			label: 'Excluded (income / manual)',
			totalDollars: summary.excluded.totalDollars,
			monthlyAverageDollars: summary.excluded.monthlyAverageDollars,
			transactionCount: summary.excluded.transactionCount,
			tone: 'dim',
		});
	}
	return rows;
}

function rowCanExpand(row: SummaryRow): boolean {
	return row.transactionCount > 0;
}

function BucketBreakdownRows({
	breakdown,
	loading,
}: {
	breakdown: LenderExpenseBucketBreakdownResponse | null;
	loading: boolean;
}) {
	if (loading) {
		return (
			<tr className="bg-black/20">
				<td colSpan={5} className="px-4 py-3 text-sm text-paper-muted">
					<span className="inline-flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading breakdown…
					</span>
				</td>
			</tr>
		);
	}
	if (breakdown === null || breakdown.categories.length === 0) {
		return (
			<tr className="bg-black/20">
				<td colSpan={5} className="px-4 py-3 pl-12 text-sm text-paper-muted">
					No category detail for this bucket in the selected period.
				</td>
			</tr>
		);
	}
	return (
		<>
			{breakdown.categories.map((line) => (
				<tr key={`${line.categoryId ?? 'none'}-${line.categoryPath}`} className="bg-black/20">
					<td className="px-4 py-2 pl-12 text-paper-muted">
						{line.categoryColour ? (
							<CategoryPill name={line.categoryPath} colour={line.categoryColour} />
						) : (
							<span className="text-sm">{line.categoryPath}</span>
						)}
					</td>
					<td className="px-4 py-2 text-right font-mono tabular-nums text-paper-muted">
						{formatMoney(line.totalDollars)}
					</td>
					<td className="px-4 py-2 text-right font-mono tabular-nums text-amber-200/75">
						{formatMoney(line.monthlyAverageDollars)}
					</td>
					<td className="px-4 py-2 text-right tabular-nums text-paper-muted">
						{line.transactionCount}
					</td>
					<td />
				</tr>
			))}
		</>
	);
}

function SummaryBucketRow({
	row,
	isOpen,
	isLoadingBreakdown,
	breakdown,
	onToggle,
}: {
	row: SummaryRow;
	isOpen: boolean;
	isLoadingBreakdown: boolean;
	breakdown: LenderExpenseBucketBreakdownResponse | null;
	onToggle: () => void;
}) {
	const expandable = rowCanExpand(row);
	const labelClass =
		row.tone === 'default'
			? 'text-paper-fg'
			: row.tone === 'muted'
				? 'text-paper-muted'
				: 'text-paper-muted';
	const monthlyClass =
		row.tone === 'default' ? 'text-amber-200/90' : 'text-amber-200/80';

	return (
		<Fragment>
			<tr
				className={cn(
					'border-b border-paper-border',
					labelClass,
					expandable && 'cursor-pointer hover:bg-paper'
				)}
				onClick={() => {
					if (expandable) {
						onToggle();
					}
				}}
			>
				<td className="px-4 py-3 font-medium">
					<span className="inline-flex items-center gap-2">
						{expandable ? (
							isOpen ? (
								<ChevronDown className="h-4 w-4 shrink-0 text-paper-muted" />
							) : (
								<ChevronRight className="h-4 w-4 shrink-0 text-paper-muted" />
							)
						) : (
							<span className="inline-block w-4" />
						)}
						<span>{row.label}</span>
					</span>
				</td>
				<td className="px-4 py-3 text-right font-mono tabular-nums">
					{formatMoney(row.totalDollars)}
				</td>
				<td className={cn('px-4 py-3 text-right font-mono tabular-nums', monthlyClass)}>
					{formatMoney(row.monthlyAverageDollars)}
				</td>
				<td className="px-4 py-3 text-right tabular-nums">{row.transactionCount}</td>
				<td className="px-4 py-3 text-right text-xs text-paper-muted">
					{expandable ? (isOpen ? 'Hide' : 'Show categories') : ''}
				</td>
			</tr>
			{isOpen && expandable ? (
				<BucketBreakdownRows breakdown={breakdown} loading={isLoadingBreakdown} />
			) : null}
		</Fragment>
	);
}

export function LenderExpensesSummaryPage() {
	const { accountIdNumber } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [summary, setSummary] = useState<LenderExpenseSummaryResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(() => new Set());
	const [breakdowns, setBreakdowns] = useState<
		Record<string, LenderExpenseBucketBreakdownResponse>
	>({});
	const [loadingBreakdowns, setLoadingBreakdowns] = useState<Set<string>>(() => new Set());

	const dateRange = useMemo(() => periodDateRange(period), [period]);

	const loadSummary = useCallback(async () => {
		const start = dateRange.start;
		const end = dateRange.end;
		if (start === undefined || end === undefined) {
			setSummary(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		setExpandedBuckets(new Set());
		setBreakdowns({});
		setLoadingBreakdowns(new Set());
		try {
			const data = await fetchLenderExpenseSummary({
				startDate: start,
				endDate: end,
				accountId: accountIdNumber,
			});
			setSummary(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load living expenses');
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [accountIdNumber, dateRange.end, dateRange.start]);

	useEffect(() => {
		localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		void loadSummary();
	}, [loadSummary]);

	const summaryRows = useMemo(
		() => (summary !== null ? buildSummaryRows(summary) : []),
		[summary]
	);

	const loadBreakdown = useCallback(
		async (bucketKey: string) => {
			const start = dateRange.start;
			const end = dateRange.end;
			if (start === undefined || end === undefined) {
				return;
			}
			setLoadingBreakdowns((current) => new Set(current).add(bucketKey));
			try {
				const data = await fetchLenderExpenseBucketBreakdown({
					bucketKey,
					startDate: start,
					endDate: end,
					accountId: accountIdNumber,
				});
				setBreakdowns((current) => ({ ...current, [bucketKey]: data }));
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Failed to load bucket breakdown');
			} finally {
				setLoadingBreakdowns((current) => {
					const next = new Set(current);
					next.delete(bucketKey);
					return next;
				});
			}
		},
		[accountIdNumber, dateRange.end, dateRange.start]
	);

	const toggleBucket = (bucketKey: string) => {
		setExpandedBuckets((current) => {
			const next = new Set(current);
			if (next.has(bucketKey)) {
				next.delete(bucketKey);
				return next;
			}
			next.add(bucketKey);
			if (!breakdowns[bucketKey]) {
				void loadBreakdown(bucketKey);
			}
			return next;
		});
	};

	const hasVisibleRows = summaryRows.some(
		(row) => row.totalDollars > 0 || row.transactionCount > 0
	);

	return (
		<>
			<div className="mb-6 flex flex-wrap items-center gap-3">
				<PeriodFilter
					value={period}
					onChange={setPeriod}
					periods={BREAKDOWN_PRESET_PERIODS}
					pending={loading}
					ariaLabel="Living expenses period"
				/>
				<AccountFilter />
			</div>

			<InlineAlert variant="info" className="mb-6">
				Living expenses exclude salary/income and any category you mark{' '}
				<strong className="font-medium text-paper-fg">Excluded</strong> on the mapping page.{' '}
				Click a bucket row to see which app categories make up that figure — same data the broker
				report will use. Adjust mappings on the{' '}
				<NavLink
					to="/lender-expenses/mappings"
					className="font-medium text-paper-fg underline underline-offset-2 hover:text-paper-fg"
				>
					Category mapping
				</NavLink>{' '}
				page.
			</InlineAlert>

			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{loading ? <PageLoadingState label="Calculating living expenses…" /> : null}

			{!loading && summary !== null ? (
				<>
					<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatCard
							label="Living expenses / month"
							value={formatMoney(summary.totalMonthlyDollars)}
						/>
						<StatCard
							label="All debits / month"
							value={formatMoney(summary.allDebitsMonthlyDollars)}
						/>
						<StatCard label="Months in range" value={String(summary.monthsInRange)} />
						<StatCard
							label="Period"
							value={`${summary.startDate} – ${summary.endDate}`}
						/>
					</div>

					{!hasVisibleRows ? (
						<EmptyState
							icon={ListChecks}
							title="No living expenses in this period"
							description="Try a wider range or import more statements."
						/>
					) : (
						<div className="overflow-x-auto rounded-xl border border-paper-border bg-paper">
							<table className="w-full min-w-[52rem] text-sm">
								<thead>
									<tr className="border-b border-paper-border text-left text-paper-muted">
										<th className="px-4 py-3 font-medium">Lender bucket</th>
										<th className="px-4 py-3 font-medium text-right">Total</th>
										<th className="px-4 py-3 font-medium text-right">Monthly avg</th>
										<th className="px-4 py-3 font-medium text-right">Transactions</th>
										<th className="px-4 py-3 font-medium text-right">Detail</th>
									</tr>
								</thead>
								<tbody>
									{summaryRows.map((row) => (
										<SummaryBucketRow
											key={row.bucketKey}
											row={row}
											isOpen={expandedBuckets.has(row.bucketKey)}
											isLoadingBreakdown={loadingBreakdowns.has(row.bucketKey)}
											breakdown={breakdowns[row.bucketKey] ?? null}
											onToggle={() => toggleBucket(row.bucketKey)}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			) : null}
		</>
	);
}
