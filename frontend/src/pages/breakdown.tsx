import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	fetchBreakdownAnalytics,
	type BreakdownParentRow,
} from '@/store/thunks/analytics';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import {
	BREAKDOWN_CUSTOM_RANGE_STORAGE_KEY,
	BREAKDOWN_PERIOD_STORAGE_KEY,
	BREAKDOWN_PRESET_PERIODS,
	BREAKDOWN_RANGE_MODE_STORAGE_KEY,
	periodDateRange,
	type DashboardPeriod,
} from '@/components/dashboard/period';
import { contrastTextColor } from '@/lib/contrastTextColor';
import { cn } from '@/lib/utils/cn';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { GlassCard } from '@/components/layout/GlassCard';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { StatCard } from '@/components/layout/StatCard';
import { buttonOutlineClass, inputDarkClass } from '@/components/layout/tokens';
import { ChevronDown, ChevronRight, LayoutList, Loader2 } from 'lucide-react';

type BreakdownRangeMode = 'preset' | 'custom';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

type SubBreakdownRow = {
	key: string;
	labelSample: string;
	spending: number;
	income: number;
	count: number;
};

type ParentBreakdownRow = {
	sectionKey: string;
	categoryId: number | null;
	label: string;
	colour: string | undefined;
	spending: number;
	income: number;
	txnCount: number;
	subRows: SubBreakdownRow[];
};

type ParentSortKey =
	| 'label'
	| 'spending'
	| 'spendShare'
	| 'income'
	| 'net'
	| 'txnCount';
type SubSortKey = 'label' | 'spending' | 'spendShare' | 'income' | 'count';
type SortDir = 'asc' | 'desc';

function parentLabelSortKey(row: ParentBreakdownRow): string {
	return row.categoryId === null ? `\uffff${row.label}` : row.label;
}

function sortParents(
	rows: ParentBreakdownRow[],
	key: ParentSortKey,
	dir: SortDir,
	periodSpending: number
): ParentBreakdownRow[] {
	const out = [...rows];
	const mult = dir === 'asc' ? 1 : -1;
	out.sort((a, b) => {
		switch (key) {
			case 'label':
				return mult * parentLabelSortKey(a).localeCompare(parentLabelSortKey(b));
			case 'spending':
				return mult * (a.spending - b.spending);
			case 'spendShare': {
				const pa = periodSpending > 0 ? a.spending / periodSpending : 0;
				const pb = periodSpending > 0 ? b.spending / periodSpending : 0;
				return mult * (pa - pb);
			}
			case 'income':
				return mult * (a.income - b.income);
			case 'net':
				return mult * (a.income - a.spending - (b.income - b.spending));
			case 'txnCount':
				return mult * (a.txnCount - b.txnCount);
			default:
				return 0;
		}
	});
	return out;
}

function sortSubs(
	rows: SubBreakdownRow[],
	categorySpending: number,
	key: SubSortKey,
	dir: SortDir
): SubBreakdownRow[] {
	const out = [...rows];
	const mult = dir === 'asc' ? 1 : -1;
	out.sort((a, b) => {
		switch (key) {
			case 'label':
				return mult * a.labelSample.localeCompare(b.labelSample);
			case 'spending':
				return mult * (a.spending - b.spending);
			case 'spendShare': {
				const pa = categorySpending > 0 ? a.spending / categorySpending : 0;
				const pb = categorySpending > 0 ? b.spending / categorySpending : 0;
				return mult * (pa - pb);
			}
			case 'income':
				return mult * (a.income - b.income);
			case 'count':
				return mult * (a.count - b.count);
			default:
				return 0;
		}
	});
	return out;
}

function defaultCustomRange(): { start: string; end: string } {
	const end = DateTime.now().toISODate();
	const start = DateTime.now().minus({ months: 3 }).toISODate();
	return {
		start: start ?? '',
		end: end ?? '',
	};
}

function readBreakdownRangeMode(): BreakdownRangeMode {
	const stored = localStorage.getItem(BREAKDOWN_RANGE_MODE_STORAGE_KEY);
	return stored === 'custom' ? 'custom' : 'preset';
}

function readBreakdownPeriod(): DashboardPeriod {
	const stored = localStorage.getItem(BREAKDOWN_PERIOD_STORAGE_KEY);
	if (
		stored !== null &&
		BREAKDOWN_PRESET_PERIODS.includes(stored as DashboardPeriod)
	) {
		return stored as DashboardPeriod;
	}
	return 'last-3-months';
}

function readCustomRange(): { start: string; end: string } {
	try {
		const raw = localStorage.getItem(BREAKDOWN_CUSTOM_RANGE_STORAGE_KEY);
		if (raw === null) {
			return defaultCustomRange();
		}
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'start' in parsed &&
			'end' in parsed &&
			typeof Reflect.get(parsed, 'start') === 'string' &&
			typeof Reflect.get(parsed, 'end') === 'string'
		) {
			return {
				start: Reflect.get(parsed, 'start'),
				end: Reflect.get(parsed, 'end'),
			};
		}
	} catch {
		// ignore
	}
	return defaultCustomRange();
}

const BreakdownPage = () => {
	const [rangeMode, setRangeMode] = useState<BreakdownRangeMode>(readBreakdownRangeMode);
	const [period, setPeriod] = useState<DashboardPeriod>(readBreakdownPeriod);
	const [customRange, setCustomRange] = useState(readCustomRange);
	const [parents, setParents] = useState<ParentBreakdownRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [parentSort, setParentSort] = useState<{
		key: ParentSortKey;
		dir: SortDir;
	}>({ key: 'label', dir: 'asc' });
	const [subSortBySection, setSubSortBySection] = useState<
		Record<string, { key: SubSortKey; dir: SortDir }>
	>({});


	const effectiveRange = useMemo(() => {
		if (rangeMode === 'custom') {
			return customRange;
		}
		const preset = periodDateRange(period);
		return {
			start: preset.start ?? '',
			end: preset.end ?? '',
		};
	}, [rangeMode, period, customRange]);

	const { start, end } = effectiveRange;
	const rangeInvalid =
		start.length < 10 || end.length < 10 || start > end;

	useEffect(() => {
		localStorage.setItem(BREAKDOWN_RANGE_MODE_STORAGE_KEY, rangeMode);
	}, [rangeMode]);

	useEffect(() => {
		localStorage.setItem(BREAKDOWN_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		localStorage.setItem(
			BREAKDOWN_CUSTOM_RANGE_STORAGE_KEY,
			JSON.stringify(customRange)
		);
	}, [customRange]);

	const reload = useCallback(async () => {
		if (rangeInvalid || !start || !end) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const rows = await fetchBreakdownAnalytics(start, end);
			setParents(rows);
		} catch (err: unknown) {
			setParents([]);
			setError(err instanceof Error ? err.message : 'Failed to load breakdown');
		} finally {
			setLoading(false);
		}
	}, [end, rangeInvalid, start]);

	useEffect(() => {
		if (rangeInvalid || !start || !end) {
			setLoading(false);
			return;
		}
		void reload();
	}, [end, rangeInvalid, reload, start]);

	const totals = useMemo(() => {
		let spend = 0;
		let inc = 0;
		for (const p of parents) {
			spend += p.spending;
			inc += p.income;
		}
		return { spending: round2(spend), income: round2(inc) };
	}, [parents]);

	const sortedParents = useMemo(
		() => sortParents(parents, parentSort.key, parentSort.dir, totals.spending),
		[parents, parentSort, totals.spending]
	);

	const cycleParentSort = (key: ParentSortKey) => {
		setParentSort((prev) => {
			if (prev.key === key) {
				return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
			}
			const numeric = key !== 'label';
			return { key, dir: numeric ? 'desc' : 'asc' };
		});
	};

	const cycleSubSort = (sectionKey: string, key: SubSortKey) => {
		setSubSortBySection((prev) => {
			const cur = prev[sectionKey] ?? { key: 'spending', dir: 'desc' };
			if (cur.key === key) {
				return {
					...prev,
					[sectionKey]: { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' },
				};
			}
			const numeric = key !== 'label';
			return {
				...prev,
				[sectionKey]: { key, dir: numeric ? 'desc' : 'asc' },
			};
		});
	};

	const subSortFor = (sectionKey: string) =>
		subSortBySection[sectionKey] ?? { key: 'spending' as SubSortKey, dir: 'desc' as SortDir };

	const toggleSection = (sectionKey: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(sectionKey)) {
				next.delete(sectionKey);
			} else {
				next.add(sectionKey);
			}
			return next;
		});
	};

	const initialLoading = loading && parents.length === 0 && error === null;
	const isRefreshing = loading && parents.length > 0;
	const showEmpty =
		!loading && !rangeInvalid && sortedParents.length === 0 && error === null;
	const netTotal = round2(totals.income - totals.spending);

	if (initialLoading) {
		return <PageLoadingState label="Loading breakdown…" />;
	}

	if (error !== null && parents.length === 0) {
		return (
			<ErrorState
				title="Could not load breakdown"
				message={error}
				onRetry={() => void reload()}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<div className="space-y-3 border-b border-white/10 p-4">
				<PageHeader
					title="Breakdown"
					subtitle="Spending and income by category. Expand a row to see grouped descriptions (same keys as repeat payments)."
					icon={<LayoutList className="h-6 w-6 text-secondary-default" />}
					className="mb-0"
					pending={isRefreshing}
					meta={
						loading ? (
							<Loader2
								className="h-4 w-4 animate-spin text-secondary-default"
								aria-label="Loading"
							/>
						) : null
					}
				/>

				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-h-9 flex-wrap items-center gap-3">
						<SegmentedControl
							ariaLabel="Date range mode"
							value={rangeMode}
							onChange={setRangeMode}
							options={[
								{ value: 'preset', label: 'Presets' },
								{ value: 'custom', label: 'Custom' },
							]}
						/>
						{rangeMode === 'preset' ? (
							<PeriodFilter
								value={period}
								onChange={setPeriod}
								periods={BREAKDOWN_PRESET_PERIODS}
								pending={loading}
								ariaLabel="Breakdown period"
							/>
						) : (
							<div className="flex flex-wrap items-center gap-2">
								<input
									type="date"
									aria-label="From date"
									value={customRange.start}
									onChange={(e) =>
										setCustomRange((r) => ({
											...r,
											start: e.target.value,
										}))
									}
									className={cn(inputDarkClass, 'px-2 py-1.5')}
								/>
								<span className="text-sm text-white/40">–</span>
								<input
									type="date"
									aria-label="To date"
									value={customRange.end}
									onChange={(e) =>
										setCustomRange((r) => ({
											...r,
											end: e.target.value,
										}))
									}
									className={cn(inputDarkClass, 'px-2 py-1.5')}
								/>
								<button
									type="button"
									onClick={() => setCustomRange(defaultCustomRange())}
									className={buttonOutlineClass}
								>
									Reset
								</button>
							</div>
						)}
					</div>

					{!rangeInvalid ? (
						<div className="flex flex-wrap gap-3">
							<StatCard
								label="Period spending"
								value={formatMoney(totals.spending)}
								valueClassName="text-red-300"
							/>
							<StatCard
								label="Period income"
								value={formatMoney(totals.income)}
								valueClassName="text-green-400"
							/>
							<StatCard
								label="Net"
								value={formatMoney(netTotal)}
								valueClassName={
									netTotal > 0
										? 'text-green-400'
										: netTotal < 0
											? 'text-red-300'
											: 'text-white/70'
								}
							/>
						</div>
					) : null}
				</div>

				{rangeInvalid ? (
					<InlineAlert variant="warning">
						Choose a valid date range (from must be on or before to).
					</InlineAlert>
				) : null}

				{error !== null && parents.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}
			</div>

			<div
				className={cn(
					'min-h-0 flex-grow overflow-auto p-4 transition-opacity duration-300',
					isRefreshing && 'opacity-55'
				)}
				aria-busy={isRefreshing}
			>
				{rangeInvalid ? null : showEmpty ? (
					<EmptyState
						compact
						icon={LayoutList}
						title="No transactions in this range"
						description="Try a wider period or upload statements for more months."
						className="py-12"
					/>
				) : (
					<GlassCard className="overflow-hidden p-0">
					<table className="w-full min-w-[720px] text-left">
						<thead className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/95 backdrop-blur-sm">
							<tr>
								<th className="px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider w-10" />
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">
									<button
										type="button"
										onClick={() => cycleParentSort('label')}
										className={cn(
											'text-left w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'label'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										Category
										{parentSort.key === 'label'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">
									<button
										type="button"
										onClick={() => cycleParentSort('spending')}
										className={cn(
											'text-left w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'spending'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										Spending
										{parentSort.key === 'spending'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-right">
									<button
										type="button"
										onClick={() => cycleParentSort('spendShare')}
										className={cn(
											'text-right w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'spendShare'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										% of spending
										{parentSort.key === 'spendShare'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">
									<button
										type="button"
										onClick={() => cycleParentSort('income')}
										className={cn(
											'text-left w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'income'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										Income
										{parentSort.key === 'income'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">
									<button
										type="button"
										onClick={() => cycleParentSort('net')}
										className={cn(
											'text-left w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'net'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										Net
										{parentSort.key === 'net'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-center">
									<button
										type="button"
										onClick={() => cycleParentSort('txnCount')}
										className={cn(
											'text-center w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'txnCount'
												? 'text-secondary-default'
												: 'text-white/50'
										)}
									>
										Txns
										{parentSort.key === 'txnCount'
											? parentSort.dir === 'asc'
												? ' ▲'
												: ' ▼'
											: ''}
									</button>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/10">
							{sortedParents.map((p) => {
								const isOpen = expanded.has(p.sectionKey);
								const subSort = subSortFor(p.sectionKey);
								const sortedSubs = sortSubs(
									p.subRows,
									p.spending,
									subSort.key,
									subSort.dir
								);
								const spendPct =
									totals.spending > 0 && p.spending > 0
										? `${((p.spending / totals.spending) * 100).toFixed(1)}%`
										: totals.spending > 0 && p.spending === 0
											? '0.0%'
											: '—';
								const catNet = round2(p.income - p.spending);
								return (
									<Fragment key={p.sectionKey}>
										<tr
											className="hover:bg-white/5 cursor-pointer transition-colors"
											onClick={() => toggleSection(p.sectionKey)}
										>
											<td className="px-4 py-3 align-middle text-white/50">
												{isOpen ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													{p.categoryId !== null && p.colour ? (
														<span
															className="inline-block px-2 py-0.5 rounded text-xs shrink-0"
															style={{
																backgroundColor: p.colour,
																color: contrastTextColor(p.colour),
															}}
														>
															{p.label}
														</span>
													) : p.categoryId === null ? (
														<span className="text-sm italic text-white/45">
															{p.label}
														</span>
													) : (
														<span className="text-sm text-white/90">
															{p.label}
														</span>
													)}
												</div>
											</td>
											<td className="px-4 py-3 font-mono text-sm text-red-300/95">
												{p.spending > 0 ? formatMoney(p.spending) : '—'}
											</td>
											<td
												className="px-4 py-3 font-mono text-sm text-white/75 text-right tabular-nums"
												title={
													totals.spending > 0
														? `Share of period spending (${formatMoney(totals.spending)})`
														: undefined
												}
											>
												{spendPct}
											</td>
											<td className="px-4 py-3 font-mono text-sm text-green-400/95">
												{p.income > 0 ? formatMoney(p.income) : '—'}
											</td>
											<td
												className={cn(
													'px-4 py-3 font-mono text-sm tabular-nums',
													catNet > 0
														? 'text-green-400/95'
														: catNet < 0
															? 'text-red-300/95'
															: 'text-white/45'
												)}
												title="Income minus spending for this category"
											>
												{catNet === 0 &&
												p.spending === 0 &&
												p.income === 0
													? '—'
													: formatMoney(catNet)}
											</td>
											<td className="px-4 py-3 text-center text-sm">
												{p.txnCount}
											</td>
										</tr>
										{isOpen ? (
											<>
												<tr
													className="bg-gray-950/95 border-y border-white/5"
													onClick={(e) => e.stopPropagation()}
												>
													<td className="px-4 py-2" />
													<td className="px-4 py-2 pl-10">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'label')
															}
															className={cn(
																'text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
																subSort.key === 'label'
																	? 'text-secondary-default'
																	: 'text-white/45'
															)}
														>
															Description
															{subSort.key === 'label'
																? subSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													</td>
													<td className="px-4 py-2">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'spending')
															}
															className={cn(
																'text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
																subSort.key === 'spending'
																	? 'text-secondary-default'
																	: 'text-white/45'
															)}
														>
															Spending
															{subSort.key === 'spending'
																? subSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													</td>
													<td className="px-4 py-2 text-right">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'spendShare')
															}
															className={cn(
																'text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default text-right w-full',
																subSort.key === 'spendShare'
																	? 'text-secondary-default'
																	: 'text-white/45'
															)}
														>
															% of spending
															{subSort.key === 'spendShare'
																? subSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													</td>
													<td className="px-4 py-2">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'income')
															}
															className={cn(
																'text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
																subSort.key === 'income'
																	? 'text-secondary-default'
																	: 'text-white/45'
															)}
														>
															Income
															{subSort.key === 'income'
																? subSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													</td>
													<td className="px-4 py-2" />
													<td className="px-4 py-2 text-center">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'count')
															}
															className={cn(
																'text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default w-full text-center',
																subSort.key === 'count'
																	? 'text-secondary-default'
																	: 'text-white/45'
															)}
														>
															Txns
															{subSort.key === 'count'
																? subSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													</td>
												</tr>
												{sortedSubs.map((s) => {
													const subSpendPct =
														p.spending > 0 && s.spending > 0
															? `${((s.spending / p.spending) * 100).toFixed(1)}%`
															: p.spending > 0 && s.spending === 0
																? '0.0%'
																: '—';
													const spendAvg =
														s.count > 0 && s.spending > 0
															? s.spending / s.count
															: null;
													const incomeAvg =
														s.count > 0 && s.income > 0
															? s.income / s.count
															: null;
													const showChipUnderSpending =
														s.count > 1 &&
														(s.spending > 0 ||
															(s.spending === 0 && s.income === 0));
													const showChipUnderIncome =
														s.count > 1 &&
														s.spending === 0 &&
														s.income > 0;
													const chipTitle = (avg: number | null) =>
														avg !== null
															? `${String(s.count)} transactions · avg ${formatMoney(avg)} per txn`
															: `${String(s.count)} transactions in this group`;
													return (
														<tr
															key={`${p.sectionKey}:${s.key}`}
															className="bg-gray-950/60 hover:bg-gray-900/50"
															onClick={(e) => e.stopPropagation()}
														>
															<td className="px-4 py-2" />
															<td className="px-4 py-2 pl-10">
																<p
																	className="text-sm text-white/85 truncate max-w-xl"
																	title={s.labelSample}
																>
																	{s.labelSample}
																</p>
																<p
																	className="text-[10px] text-white/45 truncate max-w-xl mt-0.5"
																	title={s.key}
																>
																	{s.key}
																</p>
															</td>
															<td className="px-4 py-2 font-mono text-xs text-red-300/90 align-top">
																<div className="flex flex-col gap-1 items-start">
																	<span>
																		{s.spending > 0
																			? formatMoney(s.spending)
																			: '—'}
																	</span>
																	{showChipUnderSpending ? (
																		<span
																			className="text-[11px] font-mono tabular-nums text-white/45 border border-white/15 rounded px-1.5 py-0"
																			title={chipTitle(spendAvg)}
																		>
																			×{s.count}
																			{spendAvg !== null ? (
																				<>
																					{' '}
																					<span className="text-white/35">
																						@
																					</span>{' '}
																					{formatMoney(spendAvg)}
																				</>
																			) : null}
																		</span>
																	) : null}
																</div>
															</td>
															<td
																className="px-4 py-2 font-mono text-xs text-white/70 text-right tabular-nums"
																title={
																	p.spending > 0
																		? `Share of category spending (${formatMoney(p.spending)})`
																		: undefined
																}
															>
																{subSpendPct}
															</td>
															<td className="px-4 py-2 font-mono text-xs text-green-400/90 align-top">
																<div className="flex flex-col gap-1 items-start">
																	<span>
																		{s.income > 0
																			? formatMoney(s.income)
																			: '—'}
																	</span>
																	{showChipUnderIncome ? (
																		<span
																			className="text-[11px] font-mono tabular-nums text-white/45 border border-white/15 rounded px-1.5 py-0"
																			title={chipTitle(incomeAvg)}
																		>
																			×{s.count}
																			{incomeAvg !== null ? (
																				<>
																					{' '}
																					<span className="text-white/35">
																						@
																					</span>{' '}
																					{formatMoney(incomeAvg)}
																				</>
																			) : null}
																		</span>
																	) : null}
																</div>
															</td>
															<td className="px-4 py-2" />
															<td className="px-4 py-2 text-center text-xs">
																{s.count}
															</td>
														</tr>
													);
												})}
											</>
										) : null}
									</Fragment>
								);
							})}
						</tbody>
					</table>
					</GlassCard>
				)}
			</div>
		</PageShell>
	);
};

export default BreakdownPage;
