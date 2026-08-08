import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { fetchBreakdownAnalytics } from '@/store/thunks/analytics';
import { AccountFilter } from '@/components/account-filter';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	BREAKDOWN_CUSTOM_RANGE_STORAGE_KEY,
	BREAKDOWN_PERIOD_STORAGE_KEY,
	BREAKDOWN_PRESET_PERIODS,
	BREAKDOWN_RANGE_MODE_STORAGE_KEY,
	PERIOD_LABELS,
	periodDateRange,
	type DashboardPeriod,
} from '@/components/dashboard/period';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { cn } from '@/lib/utils/cn';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { PeriodSummary } from '@/components/breakdown/PeriodSummary';
import { SpendShareCell } from '@/components/breakdown/SpendShareCell';
import {
	buttonOutlineClass,
	buttonPrimaryClass,
	dateInputClass,
	glassCardClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
	selectDarkClass,
} from '@/components/layout/tokens';
import { chartColors } from '@/graphs/theme';
import { ChevronDown, ChevronRight, LayoutList, Loader2, MoveRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories } from '@/store/thunks/category.get.all';
import { bulkPatchTransactionCategoriesByGroup } from '@/types/transaction';

type BreakdownRangeMode = 'preset' | 'custom';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

import {
	moneyDangerClass,
	moneySuccessClass,
	formatMoneyNeg,
	formatMoneyPos,
	formatNetMoney,
} from '@/lib/utils/moneySemantics';

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

type MoveGroupTarget = {
	groupKey: string;
	labelSample: string;
	sourceCategoryId: number | null;
	parentLabel: string;
	count: number;
};

function parseOptionalCategoryId(value: string): number | null {
	if (value.trim().length === 0) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
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

type SortIndicatorProps = {
	active: boolean;
	direction: SortDir;
};

function SortIndicator({ active, direction }: SortIndicatorProps) {
	return (
		<span
			className={cn(
				'inline-grid h-3 w-2.5 shrink-0 opacity-35 transition-opacity',
				active && 'opacity-100'
			)}
			aria-hidden
		>
			<svg
				viewBox="0 0 10 12"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
			>
				<path
					d="M2 4.2 5 1.5 8 4.2"
					opacity={active && direction === 'desc' ? 0.28 : 1}
				/>
				<path
					d="M2 7.8 5 10.5 8 7.8"
					opacity={active && direction === 'asc' ? 0.28 : 1}
				/>
			</svg>
		</span>
	);
}

type SortHeaderProps = {
	label: string;
	active: boolean;
	direction: SortDir;
	align?: 'left' | 'right' | 'center';
	onClick: () => void;
};

function SortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
}: SortHeaderProps) {
	const ariaSort = active
		? direction === 'asc'
			? 'ascending'
			: 'descending'
		: 'none';
	const numeric = align !== 'left';

	return (
		<th
			scope="col"
			aria-sort={ariaSort}
			className={cn(
				'px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em]',
				align === 'right' && 'text-right',
				align === 'center' && 'text-center'
			)}
		>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-paper-muted hover:text-paper-fg',
					active && 'text-paper-fg',
					align === 'right' && 'justify-end',
					align === 'center' && 'justify-center'
				)}
			>
				{numeric ? (
					<>
						<SortIndicator active={active} direction={direction} />
						{label}
					</>
				) : (
					<>
						{label}
						<SortIndicator active={active} direction={direction} />
					</>
				)}
			</button>
		</th>
	);
}

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
			'end' in parsed
		) {
			const start = Reflect.get(parsed, 'start');
			const end = Reflect.get(parsed, 'end');
			if (typeof start === 'string' && typeof end === 'string') {
				return { start, end };
			}
		}
	} catch {
		// ignore
	}
	return defaultCustomRange();
}

const BreakdownPage = () => {
	const dispatch = useAppDispatch();
	const { categories } = useAppSelector((state) => state.CategoryReducer);
	const { accountIdNumber, selectedLabel } = useAccountFilter();
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
	}>({ key: 'spending', dir: 'desc' });
	const [subSortBySection, setSubSortBySection] = useState<
		Record<string, { key: SubSortKey; dir: SortDir }>
	>({});
	const [moveTarget, setMoveTarget] = useState<MoveGroupTarget | null>(null);
	const [moveCategoryId, setMoveCategoryId] = useState('');
	const [moveSaving, setMoveSaving] = useState(false);
	const [moveError, setMoveError] = useState<string | null>(null);

	useEffect(() => {
		if (categories.length === 0) {
			void dispatch(getAllCategories({ withCounts: false, accountId: accountIdNumber }));
		}
	}, [accountIdNumber, categories.length, dispatch]);

	const openMoveModal = (parent: ParentBreakdownRow, sub: SubBreakdownRow) => {
		setMoveTarget({
			groupKey: sub.key,
			labelSample: sub.labelSample,
			sourceCategoryId: parent.categoryId,
			parentLabel: parent.label,
			count: sub.count,
		});
		setMoveCategoryId('');
		setMoveError(null);
	};

	const closeMoveModal = () => {
		if (moveSaving) {
			return;
		}
		setMoveTarget(null);
		setMoveError(null);
	};

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

	const tableHint = useMemo(() => {
		if (rangeMode === 'custom') {
			const startDt = DateTime.fromISO(start);
			const endDt = DateTime.fromISO(end);
			if (startDt.isValid && endDt.isValid) {
				return `${selectedLabel} · ${startDt.toFormat('d LLL yyyy')} – ${endDt.toFormat('d LLL yyyy')}`;
			}
		}
		const periodLabel = PERIOD_LABELS[period];
		return `${selectedLabel} · ${periodLabel.charAt(0).toLowerCase()}${periodLabel.slice(1)}`;
	}, [rangeMode, start, end, period, selectedLabel]);

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
			const rows = await fetchBreakdownAnalytics(start, end, accountIdNumber);
			setParents(rows);
		} catch (err: unknown) {
			setParents([]);
			setError(err instanceof Error ? err.message : 'Failed to load breakdown');
		} finally {
			setLoading(false);
		}
	}, [accountIdNumber, end, rangeInvalid, start]);

	const confirmMove = async () => {
		if (moveTarget === null || rangeInvalid || !start || !end) {
			return;
		}
		setMoveSaving(true);
		setMoveError(null);
		try {
			const updated = await bulkPatchTransactionCategoriesByGroup({
				groupKey: moveTarget.groupKey,
				sourceCategoryId: moveTarget.sourceCategoryId,
				startDate: start,
				endDate: end,
				accountId: accountIdNumber,
				categoryId: parseOptionalCategoryId(moveCategoryId),
			});
			if (updated === 0) {
				setMoveError('No matching transactions found in this period.');
				return;
			}
			setMoveTarget(null);
			await reload();
		} catch (err: unknown) {
			setMoveError(err instanceof Error ? err.message : 'Failed to move transactions');
		} finally {
			setMoveSaving(false);
		}
	};

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
			<header className={pageHeaderClass}>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className={pageTitleClass}>Breakdown</h1>
						{isRefreshing ? (
							<Loader2
								className="h-4 w-4 animate-spin text-secondary-default"
								aria-label="Loading"
							/>
						) : null}
					</div>
					<p className={pageSubtitleClass}>
						Spending and income by category · expand rows for grouped descriptions
						(same keys as repeat payments)
					</p>
				</div>
			</header>

			<div
				className={cn(
					pageBodyClass,
					'flex flex-col gap-6 transition-opacity duration-300',
					isRefreshing && 'opacity-55'
				)}
				aria-busy={isRefreshing}
			>
				<div className="flex flex-wrap items-center gap-2.5">
					<AccountFilter className={cn(selectDarkClass, 'h-8 min-w-[10rem] px-2.5')} />
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
							className="flex-nowrap"
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
								className={cn(dateInputClass, 'h-8 px-2')}
							/>
							<span className="text-[13px] text-paper-muted">to</span>
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
								className={cn(dateInputClass, 'h-8 px-2')}
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
					{!rangeInvalid ? (
						<PeriodSummary
							className="ml-auto"
							spending={totals.spending}
							income={totals.income}
							net={netTotal}
						/>
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

				{rangeInvalid ? null : showEmpty ? (
					<EmptyState
						compact
						icon={LayoutList}
						title="No transactions in this range"
						description="Try a wider period or upload statements for more months."
						className="py-12"
					/>
				) : (
					<div className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="border-b border-paper-border px-4 py-3.5">
						<h2 className={panelTitleClass}>By category</h2>
						<p className={panelHintClass}>{tableHint}</p>
					</div>
					<table className="w-full min-w-[720px] text-left text-[13px]">
						<thead className="sticky top-0 z-10 border-b border-paper-border bg-paper">
							<tr>
								<th className="w-10 px-3 py-2.5">
									<span className="sr-only">Expand</span>
								</th>
								<SortHeader
									label="Category"
									active={parentSort.key === 'label'}
									direction={parentSort.dir}
									onClick={() => cycleParentSort('label')}
								/>
								<SortHeader
									label="Spending"
									active={parentSort.key === 'spending'}
									direction={parentSort.dir}
									align="right"
									onClick={() => cycleParentSort('spending')}
								/>
								<SortHeader
									label="% of spending"
									active={parentSort.key === 'spendShare'}
									direction={parentSort.dir}
									align="center"
									onClick={() => cycleParentSort('spendShare')}
								/>
								<SortHeader
									label="Income"
									active={parentSort.key === 'income'}
									direction={parentSort.dir}
									align="right"
									onClick={() => cycleParentSort('income')}
								/>
								<SortHeader
									label="Net"
									active={parentSort.key === 'net'}
									direction={parentSort.dir}
									align="right"
									onClick={() => cycleParentSort('net')}
								/>
								<SortHeader
									label="Txns"
									active={parentSort.key === 'txnCount'}
									direction={parentSort.dir}
									align="right"
									onClick={() => cycleParentSort('txnCount')}
								/>
								<th className="w-24 px-2 py-2.5">
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-paper-border">
							{sortedParents.map((p) => {
								const isOpen = expanded.has(p.sectionKey);
								const subSort = subSortFor(p.sectionKey);
								const sortedSubs = sortSubs(
									p.subRows,
									p.spending,
									subSort.key,
									subSort.dir
								);
								const spendPctValue =
									totals.spending > 0 && p.spending > 0
										? (p.spending / totals.spending) * 100
										: totals.spending > 0 && p.spending === 0
											? 0
											: null;
								const catNet = round2(p.income - p.spending);
								return (
									<Fragment key={p.sectionKey}>
										<tr
											className="hover:bg-paper cursor-pointer transition-colors"
											onClick={() => toggleSection(p.sectionKey)}
										>
											<td className="px-3 py-2.5 align-middle text-paper-muted">
												{isOpen ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
											</td>
											<td className="px-3 py-2.5">
												<div className="flex flex-wrap items-center gap-2">
													<span
														className={cn(
															'inline-flex h-[26px] max-w-[220px] items-center gap-[7px] rounded-full border border-paper-border bg-paper px-2.5 pl-2 text-xs font-medium text-paper-fg',
															p.categoryId === null &&
																'font-normal italic text-paper-muted'
														)}
													>
														<span
															className="h-2 w-2 shrink-0 rounded-full"
															style={{
																backgroundColor:
																	p.colour ?? chartColors.other,
															}}
															aria-hidden
														/>
														<span className="truncate">{p.label}</span>
													</span>
												</div>
											</td>
											<td
												className={cn(
													'px-3 py-2.5 text-right font-mono text-[13px] tabular-nums',
													p.spending > 0 && moneyDangerClass
												)}
											>
												{p.spending > 0 ? formatMoneyNeg(p.spending) : '—'}
											</td>
											<td
												className="px-3 py-2.5 text-right"
												title={
													totals.spending > 0
														? `Share of period spending (${formatMoney(totals.spending)})`
														: undefined
												}
											>
												<div className="w-full">
													<SpendShareCell
														percent={spendPctValue}
														barColor={p.colour ?? chartColors.other}
													/>
												</div>
											</td>
											<td
												className={cn(
													'px-3 py-2.5 text-right font-mono text-[13px] tabular-nums',
													p.income > 0 && moneySuccessClass
												)}
											>
												{p.income > 0 ? formatMoneyPos(p.income) : '—'}
											</td>
											<td
												className={cn(
													'px-3 py-2.5 text-right font-mono text-[13px] tabular-nums',
													catNet === 0 && 'text-paper-muted',
													catNet > 0 && moneySuccessClass,
													catNet < 0 && moneyDangerClass
												)}
												title="Income minus spending for this category"
											>
												{catNet === 0 &&
												p.spending === 0 &&
												p.income === 0
													? '—'
													: formatNetMoney(catNet)}
											</td>
											<td className="px-3 py-2.5 text-right text-[13px]">
												{p.txnCount}
											</td>
											<td className="px-2 py-3" />
										</tr>
										{isOpen ? (
											<>
												<tr
													className="border-y border-paper-border bg-[color-mix(in_oklch,var(--fg)_2%,var(--bg))]"
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
																	: 'text-paper-muted'
															)}
														>
															Description
															<SortIndicator
																active={subSort.key === 'label'}
																direction={subSort.dir}
															/>
														</button>
													</td>
													<td className="px-4 py-2 text-right">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'spending')
															}
															className={cn(
																'inline-flex cursor-pointer flex-row-reverse items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-wider hover:text-secondary-default',
																subSort.key === 'spending'
																	? 'text-secondary-default'
																	: 'text-paper-muted'
															)}
														>
															Spending
															<SortIndicator
																active={subSort.key === 'spending'}
																direction={subSort.dir}
															/>
														</button>
													</td>
													<td className="px-4 py-2 text-center">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'spendShare')
															}
															className={cn(
																'inline-flex w-full cursor-pointer items-center justify-center gap-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-wider hover:text-secondary-default',
																subSort.key === 'spendShare'
																	? 'text-secondary-default'
																	: 'text-paper-muted'
															)}
														>
															% of spending
															<SortIndicator
																active={subSort.key === 'spendShare'}
																direction={subSort.dir}
															/>
														</button>
													</td>
													<td className="px-4 py-2 text-right">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'income')
															}
															className={cn(
																'inline-flex cursor-pointer flex-row-reverse items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-wider hover:text-secondary-default',
																subSort.key === 'income'
																	? 'text-secondary-default'
																	: 'text-paper-muted'
															)}
														>
															Income
															<SortIndicator
																active={subSort.key === 'income'}
																direction={subSort.dir}
															/>
														</button>
													</td>
													<td className="px-4 py-2" />
													<td className="px-4 py-2 text-right">
														<button
															type="button"
															onClick={() =>
																cycleSubSort(p.sectionKey, 'count')
															}
															className={cn(
																'inline-flex w-full cursor-pointer flex-row-reverse items-center justify-start gap-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-wider hover:text-secondary-default',
																subSort.key === 'count'
																	? 'text-secondary-default'
																	: 'text-paper-muted'
															)}
														>
															Txns
															<SortIndicator
																active={subSort.key === 'count'}
																direction={subSort.dir}
															/>
														</button>
													</td>
													<td className="px-2 py-2 text-[10px] font-medium uppercase tracking-wider text-paper-muted">
														Move
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
															className="bg-[color-mix(in_oklch,var(--fg)_1%,var(--surface))] transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
															onClick={(e) => e.stopPropagation()}
														>
															<td className="px-4 py-2" />
															<td className="px-4 py-2 pl-10">
																<p
																	className="max-w-xl truncate text-[12.5px] text-paper-fg"
																	title={s.labelSample}
																>
																	{s.labelSample}
																</p>
															</td>
															<td
																className={cn(
																	'px-4 py-2 text-right align-top font-mono text-[13px] tabular-nums',
																	s.spending > 0 && moneyDangerClass
																)}
															>
																<div className="flex flex-col items-end gap-1">
																	<span>
																		{s.spending > 0
																			? formatMoneyNeg(s.spending)
																			: '—'}
																	</span>
																	{showChipUnderSpending ? (
																		<span
																			className="text-[11px] font-mono tabular-nums text-paper-muted border border-paper-border rounded px-1.5 py-0"
																			title={chipTitle(spendAvg)}
																		>
																			×{s.count}
																			{spendAvg !== null ? (
																				<>
																					{' '}
																					<span className="text-paper-muted">
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
																className="px-4 py-2 text-right font-mono text-[13px] tabular-nums text-paper-muted"
																title={
																	p.spending > 0
																		? `Share of category spending (${formatMoney(p.spending)})`
																		: undefined
																}
															>
																{subSpendPct}
															</td>
															<td
																className={cn(
																	'px-4 py-2 text-right align-top font-mono text-[13px] tabular-nums',
																	s.income > 0 && moneySuccessClass
																)}
															>
																<div className="flex flex-col items-end gap-1">
																	<span>
																		{s.income > 0
																			? formatMoneyPos(s.income)
																			: '—'}
																	</span>
																	{showChipUnderIncome ? (
																		<span
																			className="text-[11px] font-mono tabular-nums text-paper-muted border border-paper-border rounded px-1.5 py-0"
																			title={chipTitle(incomeAvg)}
																		>
																			×{s.count}
																			{incomeAvg !== null ? (
																				<>
																					{' '}
																					<span className="text-paper-muted">
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
															<td className="px-4 py-2 text-right text-[13px]">
																{s.count}
															</td>
															<td className="px-2 py-2 text-right">
																<button
																	type="button"
																	className={cn(buttonOutlineClass, 'gap-1.5')}
																	onClick={() => openMoveModal(p, s)}
																>
																	Move
																	<MoveRight className="h-3 w-3" aria-hidden />
																</button>
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
					</div>
				)}
			</div>

			<Modal
				open={moveTarget !== null}
				onClose={closeMoveModal}
				closeDisabled={moveSaving}
				title="Move to category"
				description={
					moveTarget !== null
						? `${moveTarget.count} transaction${moveTarget.count === 1 ? '' : 's'} matching “${moveTarget.labelSample}” under ${moveTarget.parentLabel} in this period.`
						: undefined
				}
				footer={
					<>
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeMoveModal}
							disabled={moveSaving}
						>
							Cancel
						</button>
						<button
							type="button"
							className={cn(buttonPrimaryClass, 'min-w-[5rem]')}
							onClick={() => void confirmMove()}
							disabled={moveSaving || moveCategoryId.trim().length === 0}
						>
							{moveSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Move'}
						</button>
					</>
				}
			>
				{moveError !== null ? <InlineAlert variant="error">{moveError}</InlineAlert> : null}
				<CategoryPicker
					value={moveCategoryId}
					categories={categories}
					onChange={setMoveCategoryId}
					disabled={moveSaving}
					searchable
					variant="form"
					placeholder="Choose category"
				/>
			</Modal>
		</PageShell>
	);
};

export default BreakdownPage;
