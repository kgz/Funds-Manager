import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, ListChecks, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { NavLink } from 'react-router';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPill } from '@/components/CategoryPill';
import {
	BREAKDOWN_PRESET_PERIODS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	PERIOD_LABELS,
	type DashboardPeriod,
	periodDateRange,
	readStoredPeriod,
} from '@/components/dashboard/period';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import {
	glassCardClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	fetchLenderExpenseBucketBreakdown,
	fetchLenderExpenseSummary,
	type LenderExpenseBucketBreakdownResponse,
	type LenderExpenseSummaryResponse,
} from '@/types/lender-expenses';
import {
	ChildSortHeader,
	formatAmountCell,
	formatMoney,
	formatPeriodRange,
	LivingExpensesCallout,
	LivingExpensesKpiRow,
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
	periodHintLabel,
	SortDir,
	SortHeader,
	tableTdClass,
	tableThClass,
	TableLoadingRow,
} from './shared';

type SummaryRow = {
	bucketKey: string;
	label: string;
	totalDollars: number;
	monthlyAverageDollars: number;
	transactionCount: number;
	tone: 'default' | 'muted' | 'dim';
};

type BucketSortKey = 'name' | 'total' | 'monthly' | 'txns';
type ChildSortKey = 'name' | 'total' | 'monthly' | 'txns';

const LIVING_EXPENSES_PERIODS: DashboardPeriod[] = [
	...BREAKDOWN_PRESET_PERIODS,
	'all',
];

function buildSummaryRows(summary: LenderExpenseSummaryResponse): SummaryRow[] {
	const rows: SummaryRow[] = summary.buckets.map((bucket) => ({
		bucketKey: bucket.bucketKey,
		label: bucket.label,
		totalDollars: bucket.totalDollars,
		monthlyAverageDollars: bucket.monthlyAverageDollars,
		transactionCount: bucket.transactionCount,
		tone: 'default',
	}));
	rows.push({
		bucketKey: 'unmapped',
		label: 'Unmapped',
		totalDollars: summary.unmapped.totalDollars,
		monthlyAverageDollars: summary.unmapped.monthlyAverageDollars,
		transactionCount: summary.unmapped.transactionCount,
		tone: 'muted',
	});
	rows.push({
		bucketKey: 'excluded',
		label: 'Excluded',
		totalDollars: summary.excluded.totalDollars,
		monthlyAverageDollars: summary.excluded.monthlyAverageDollars,
		transactionCount: summary.excluded.transactionCount,
		tone: 'dim',
	});
	return rows;
}

function rowCanExpand(row: SummaryRow): boolean {
	return row.transactionCount > 0;
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b) * (dir === 'asc' ? 1 : -1);
	}
	if (a === b) {
		return 0;
	}
	return (a < b ? -1 : 1) * (dir === 'asc' ? 1 : -1);
}

function bucketSortValue(row: SummaryRow, key: BucketSortKey): string | number {
	if (key === 'name') {
		return row.label.toLowerCase();
	}
	if (key === 'total') {
		return row.totalDollars;
	}
	if (key === 'monthly') {
		return row.monthlyAverageDollars;
	}
	return row.transactionCount;
}

function childSortValue(
	line: LenderExpenseBucketBreakdownResponse['categories'][number],
	key: ChildSortKey
): string | number {
	if (key === 'name') {
		return line.categoryPath.toLowerCase();
	}
	if (key === 'total') {
		return line.totalDollars;
	}
	if (key === 'monthly') {
		return line.monthlyAverageDollars;
	}
	return line.transactionCount;
}

function rowToneClass(tone: SummaryRow['tone']): string {
	if (tone === 'muted') {
		return 'font-normal [&>td]:!text-paper-muted';
	}
	if (tone === 'dim') {
		return 'font-normal [&>td]:!text-[color-mix(in_oklch,var(--muted)_75%,transparent)]';
	}
	return 'font-medium [&>td]:text-paper-fg';
}

export function LenderExpensesSummaryPage() {
	const { accountIdNumber, selectedLabel } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [summary, setSummary] = useState<LenderExpenseSummaryResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(() => new Set(['housing']));
	const [breakdowns, setBreakdowns] = useState<
		Record<string, LenderExpenseBucketBreakdownResponse>
	>({});
	const [loadingBreakdowns, setLoadingBreakdowns] = useState<Set<string>>(() => new Set());
	const [bucketSortKey, setBucketSortKey] = useState<BucketSortKey>('monthly');
	const [bucketSortDir, setBucketSortDir] = useState<SortDir>('desc');
	const [childSortKey, setChildSortKey] = useState<ChildSortKey>('monthly');
	const [childSortDir, setChildSortDir] = useState<SortDir>('desc');

	const dateRange = useMemo(() => periodDateRange(period), [period]);

	const loadSummary = useCallback(async () => {
		let start = dateRange.start;
		let end = dateRange.end;
		if (period === 'all') {
			start = '2000-01-01';
			end = DateTime.now().toISODate() ?? undefined;
		}
		if (start === undefined || end === undefined) {
			setSummary(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		setExpandedBuckets(new Set(['housing']));
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
	}, [accountIdNumber, dateRange.end, dateRange.start, period]);

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

	const sortedRows = useMemo(() => {
		return [...summaryRows].sort((left, right) => {
			const cmp = compareValues(
				bucketSortValue(left, bucketSortKey),
				bucketSortValue(right, bucketSortKey),
				bucketSortDir
			);
			if (cmp !== 0) {
				return cmp;
			}
			return left.label.localeCompare(right.label);
		});
	}, [bucketSortDir, bucketSortKey, summaryRows]);

	const loadBreakdown = useCallback(
		async (bucketKey: string) => {
			let start = dateRange.start;
			let end = dateRange.end;
			if (period === 'all') {
				start = '2000-01-01';
				end = DateTime.now().toISODate() ?? undefined;
			}
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
		[accountIdNumber, dateRange.end, dateRange.start, period]
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

	const onBucketSort = (key: BucketSortKey) => {
		if (bucketSortKey === key) {
			setBucketSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setBucketSortKey(key);
		setBucketSortDir(key === 'name' ? 'asc' : 'desc');
	};

	const onChildSort = (key: ChildSortKey) => {
		if (childSortKey === key) {
			setChildSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setChildSortKey(key);
		setChildSortDir(key === 'name' ? 'asc' : 'desc');
	};

	const hasVisibleRows = summaryRows.some(
		(row) => row.totalDollars > 0 || row.transactionCount > 0
	);

	const initialLoading = loading && summary === null && error === null;
	if (initialLoading) {
		return <PageLoadingState label="Calculating living expenses…" />;
	}

	if (error !== null && summary === null) {
		return (
			<ErrorState
				title="Error loading living expenses"
				message={error}
				onRetry={() => void loadSummary()}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-2.5">
				<div className={leSegmentedClass} role="group" aria-label="Living expenses period">
					{LIVING_EXPENSES_PERIODS.map((preset) => (
						<button
							key={preset}
							type="button"
							className={cn(
								leSegmentButtonClass,
								period === preset && leSegmentButtonActiveClass
							)}
							aria-pressed={period === preset}
							onClick={() => setPeriod(preset)}
						>
							{PERIOD_LABELS[preset]}
						</button>
					))}
				</div>
				<AccountFilter />
				{loading ? (
					<Loader2
						className="h-4 w-4 animate-spin text-secondary-default"
						aria-label="Loading"
					/>
				) : null}
			</div>

			{summary !== null ? (
				<LivingExpensesKpiRow
					livingMonthly={summary.totalMonthlyDollars}
					allDebitsMonthly={summary.allDebitsMonthlyDollars}
					monthsInRange={summary.monthsInRange}
					periodRange={formatPeriodRange(summary.startDate, summary.endDate)}
				/>
			) : null}

			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
				<div className="border-b border-paper-border px-4 py-3.5">
					<h2 className={panelTitleClass}>Lender buckets</h2>
					<p className={cn(panelHintClass, 'mt-1')}>
						{selectedLabel} · {periodHintLabel(period)}
					</p>
				</div>

				<LivingExpensesCallout className="mx-4 mb-3 mt-0">
					<p className="m-0">
						Living expenses exclude salary/income and Excluded categories. Click a bucket row
						to expand category detail.{' '}
						<NavLink to="/lender-expenses/mappings">Review category mapping</NavLink>
					</p>
				</LivingExpensesCallout>

				{!loading && summary !== null && !hasVisibleRows ? (
					<div className="px-4 pb-6">
						<EmptyState
							icon={ListChecks}
							compact
							title="No living expenses in this period"
							description="Try a wider range or import more statements."
						/>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[52rem] border-collapse text-[13px]">
							<thead>
								<tr>
									<th className={cn(tableThClass, 'w-9 px-2')}>
										<span className="sr-only">Expand</span>
									</th>
									<SortHeader
										label="Lender bucket"
										active={bucketSortKey === 'name'}
										direction={bucketSortDir}
										onClick={() => onBucketSort('name')}
										className="min-w-[200px]"
									/>
									<SortHeader
										label="Total"
										active={bucketSortKey === 'total'}
										direction={bucketSortDir}
										align="right"
										onClick={() => onBucketSort('total')}
									/>
									<SortHeader
										label="Monthly avg"
										active={bucketSortKey === 'monthly'}
										direction={bucketSortDir}
										align="right"
										onClick={() => onBucketSort('monthly')}
									/>
									<SortHeader
										label="Transactions"
										active={bucketSortKey === 'txns'}
										direction={bucketSortDir}
										align="right"
										onClick={() => onBucketSort('txns')}
									/>
								</tr>
							</thead>
							<tbody>
								{sortedRows.map((row) => {
									const expandable = rowCanExpand(row);
									const isOpen = expandedBuckets.has(row.bucketKey);
									const breakdown = breakdowns[row.bucketKey] ?? null;
									const isLoadingBreakdown = loadingBreakdowns.has(row.bucketKey);
									const sortedChildren =
										breakdown === null
											? []
											: [...breakdown.categories].sort((left, right) => {
													const cmp = compareValues(
														childSortValue(left, childSortKey),
														childSortValue(right, childSortKey),
														childSortDir
													);
													if (cmp !== 0) {
														return cmp;
													}
													return left.categoryPath.localeCompare(right.categoryPath);
												});

									return (
										<Fragment key={row.bucketKey}>
											<tr
												className={cn(
													'transition-colors',
													rowToneClass(row.tone),
													expandable && 'cursor-pointer',
													isOpen &&
														'[&>td]:border-b-transparent [&>td]:bg-[color-mix(in_oklch,var(--fg)_1.5%,var(--surface))]'
												)}
												onClick={() => {
													if (expandable) {
														toggleBucket(row.bucketKey);
													}
												}}
												onKeyDown={(event) => {
													if (!expandable) {
														return;
													}
													if (event.key === 'Enter' || event.key === ' ') {
														event.preventDefault();
														toggleBucket(row.bucketKey);
													}
												}}
												tabIndex={expandable ? 0 : undefined}
											>
												<td className={cn(tableTdClass, 'w-9 px-2')}>
													{expandable ? (
														<button
															type="button"
															className="inline-grid h-7 w-7 place-items-center rounded-paper border-0 bg-transparent text-paper-muted hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg"
															aria-expanded={isOpen}
															aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${row.label}`}
															onClick={(event) => {
																event.stopPropagation();
																toggleBucket(row.bucketKey);
															}}
														>
															<ChevronRight
																className={cn(
																	'h-3.5 w-3.5 transition-transform',
																	isOpen && 'rotate-90'
																)}
																strokeWidth={2}
															/>
														</button>
													) : (
														<span className="inline-block h-7 w-7" aria-hidden />
													)}
												</td>
												<td className={tableTdClass}>{row.label}</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono font-medium tabular-nums'
													)}
												>
													{formatAmountCell(row.totalDollars)}
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono font-medium tabular-nums'
													)}
												>
													{formatAmountCell(row.monthlyAverageDollars)}
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono tabular-nums'
													)}
												>
													{row.transactionCount > 0 ? row.transactionCount : '—'}
												</td>
											</tr>
											{isOpen && expandable ? (
												<>
													<tr className="bg-[color-mix(in_oklch,var(--fg)_2%,var(--bg))]">
														<td className="border-b border-paper-border" />
														<ChildSortHeader
															label="Category"
															active={childSortKey === 'name'}
															direction={childSortDir}
															onClick={() => onChildSort('name')}
														/>
														<ChildSortHeader
															label="Total"
															active={childSortKey === 'total'}
															direction={childSortDir}
															align="right"
															onClick={() => onChildSort('total')}
														/>
														<ChildSortHeader
															label="Monthly avg"
															active={childSortKey === 'monthly'}
															direction={childSortDir}
															align="right"
															onClick={() => onChildSort('monthly')}
														/>
														<ChildSortHeader
															label="Txns"
															active={childSortKey === 'txns'}
															direction={childSortDir}
															align="right"
															onClick={() => onChildSort('txns')}
														/>
													</tr>
													{isLoadingBreakdown ? (
														<TableLoadingRow
															colSpan={5}
															label="Loading breakdown…"
														/>
													) : sortedChildren.length === 0 ? (
														<tr>
															<td colSpan={5} className={cn(tableTdClass, 'pl-8 text-paper-muted')}>
																No category detail for this bucket in the selected period.
															</td>
														</tr>
													) : (
														sortedChildren.map((line) => (
															<tr
																key={`${line.categoryId ?? 'none'}-${line.categoryPath}`}
																className="bg-[color-mix(in_oklch,var(--fg)_1%,var(--surface))]"
															>
																<td className={cn(tableTdClass, 'py-2')} />
																<td className={cn(tableTdClass, 'py-2 pl-2')}>
																	<CategoryPill
																		name={line.categoryPath}
																		colour={line.categoryColour}
																		variant="outline"
																		uncategorized={line.categoryColour == null}
																	/>
																</td>
																<td
																	className={cn(
																		tableTdClass,
																		'py-2 text-right font-mono tabular-nums text-paper-muted'
																	)}
																>
																	{formatMoney(line.totalDollars)}
																</td>
																<td
																	className={cn(
																		tableTdClass,
																		'py-2 text-right font-mono tabular-nums text-paper-muted'
																	)}
																>
																	{formatMoney(line.monthlyAverageDollars)}
																</td>
																<td
																	className={cn(
																		tableTdClass,
																		'py-2 text-right font-mono tabular-nums text-paper-muted'
																	)}
																>
																	{line.transactionCount}
																</td>
															</tr>
														))
													)}
												</>
											) : null}
										</Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
