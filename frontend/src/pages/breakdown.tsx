import { Fragment, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	fetchBreakdownAnalytics,
	type BreakdownParentRow,
} from '@/store/thunks/analytics';
import { contrastTextColor } from '@/lib/contrastTextColor';
import { cn } from '@/lib/utils/cn';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { buttonOutlineClass, inputDarkClass } from '@/components/layout/tokens';
import { ChevronDown, ChevronRight, LayoutList } from 'lucide-react';

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

function defaultDateRange(): { start: string; end: string } {
	const end = DateTime.now().toISODate();
	const start = DateTime.now().minus({ months: 3 }).toISODate();
	return {
		start: start ?? '',
		end: end ?? '',
	};
}

const BreakdownPage = () => {
	const [{ start, end }, setRange] = useState(defaultDateRange);
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


	useEffect(() => {
		if (!start || !end) {
			return;
		}
		setLoading(true);
		setError(null);
		void fetchBreakdownAnalytics(start, end)
			.then((rows: BreakdownParentRow[]) => setParents(rows))
			.catch((err: unknown) => {
				setParents([]);
				setError(err instanceof Error ? err.message : 'Failed to load breakdown');
			})
			.finally(() => setLoading(false));
	}, [start, end]);

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

	const initialLoading = loading && parents.length === 0 && !error;

	if (initialLoading) {
		return <PageLoadingState label="Loading breakdown…" />;
	}

	if (error) {
		return (
			<ErrorState title="Could not load breakdown" message={error} />
		);
	}

	const rangeInvalid = start.length < 10 || end.length < 10 || start > end;

	return (
		<PageShell variant="table" className="p-4 text-gray-200">
			<PageHeader
				title="Breakdown"
				subtitle="Spending and income by category for the range. Expand a category to see grouped descriptions (same keys as repeat payments)."
				icon={<LayoutList className="h-6 w-6 text-secondary-default" />}
				actions={
					<div className="flex flex-col items-end gap-3">
						<div className="flex flex-wrap items-end gap-3 text-sm">
							<label className="flex flex-col gap-1 text-white/70">
								<span className="text-[11px] uppercase tracking-wide text-white/45">
									From
								</span>
								<input
									type="date"
									value={start}
									onChange={(e) =>
										setRange((r) => ({ ...r, start: e.target.value }))
									}
									className={cn(inputDarkClass, 'px-2 py-1.5')}
								/>
							</label>
							<label className="flex flex-col gap-1 text-white/70">
								<span className="text-[11px] uppercase tracking-wide text-white/45">
									To
								</span>
								<input
									type="date"
									value={end}
									onChange={(e) =>
										setRange((r) => ({ ...r, end: e.target.value }))
									}
									className={cn(inputDarkClass, 'px-2 py-1.5')}
								/>
							</label>
							<button
								type="button"
								onClick={() => setRange(defaultDateRange())}
								className={buttonOutlineClass}
							>
								Last 3 months
							</button>
						</div>
						{rangeInvalid ? (
							<p className="text-xs text-amber-400">Choose a valid date range.</p>
						) : (
							<div className="space-y-0.5 text-right text-xs text-white/50">
								<p>
									Period spending{' '}
									<span className="font-mono text-red-300/95">
										{formatMoney(totals.spending)}
									</span>
								</p>
								<p>
									Period income{' '}
									<span className="font-mono text-green-400/95">
										{formatMoney(totals.income)}
									</span>
								</p>
							</div>
						)}
					</div>
				}
			/>

			<div className="flex-grow overflow-auto min-h-0">
				{rangeInvalid ? null : (
					<table className="w-full min-w-[720px] text-left">
						<thead className="sticky top-0 z-10 bg-gray-900 border-b border-white/10">
							<tr>
								<th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-10" />
								<th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">
									<button
										type="button"
										onClick={() => cycleParentSort('label')}
										className={cn(
											'text-left w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
											parentSort.key === 'label'
												? 'text-secondary-default'
												: 'text-gray-400'
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
												: 'text-gray-400'
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
												: 'text-gray-400'
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
												: 'text-gray-400'
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
												: 'text-gray-400'
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
												: 'text-gray-400'
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
							{sortedParents.length === 0 && !loading ? (
								<tr>
									<td
										colSpan={7}
										className="px-4 py-10 text-center text-gray-500"
									>
										No transactions in this range.
									</td>
								</tr>
							) : null}
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
														<span className="text-sm italic text-gray-400">
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
																	: 'text-gray-500'
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
																	: 'text-gray-500'
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
																	: 'text-gray-500'
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
																	: 'text-gray-500'
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
																	: 'text-gray-500'
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
																	className="text-[10px] text-gray-500 truncate max-w-xl mt-0.5"
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
				)}
				{loading ? (
					<p className="text-sm text-white/45 px-4 py-2">Refreshing…</p>
				) : null}
			</div>
		</PageShell>
	);
};

export default BreakdownPage;
