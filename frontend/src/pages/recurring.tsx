import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import {
	fetchRecurringAnalytics,
	type RecurringCandidateRow,
} from '@/store/thunks/analytics';
import { CategoryPill } from '@/components/CategoryPill';
import {
	Table,
	type SortDirection,
	type TColumn,
} from '@/components/table';
import { cn } from '@/lib/utils/cn';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import { inputDarkClass } from '@/components/layout/tokens';
import { AccountFilter } from '@/components/account-filter';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import { RepeatPaymentsHelp } from '@/components/recurring/RepeatPaymentsHelp';
import { ChevronDown, ChevronRight, Repeat } from 'lucide-react';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Keep render/key correlation generic so the column union doesn't collapse to never.
function renderCell<TData>(col: TColumn<TData>, row: TData): ReactNode {
	return col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '');
}

const mainAmountClass = (flow: RecurringCandidateRow['flow']) =>
	flow === 'income' ? 'text-green-400' : 'text-red-300';

const rangeAmountClass = (flow: RecurringCandidateRow['flow']) =>
	flow === 'income' ? 'text-green-400/90' : 'text-red-300/90';

type RecurringSection = {
	sectionKey: string;
	categoryId: number | null;
	label: string;
	colour: string | undefined;
	rows: RecurringCandidateRow[];
	spendingMonthly: number;
	incomeMonthly: number;
};

function buildRecurringSections(
	rows: RecurringCandidateRow[],
	categoryList: Category[]
): RecurringSection[] {
	const byKey = new Map<string, RecurringCandidateRow[]>();
	for (const r of rows) {
		const k =
			r.modeCategoryId === null || r.modeCategoryId === undefined
				? '__uncat__'
				: String(r.modeCategoryId);
		const bucket = byKey.get(k) ?? [];
		bucket.push(r);
		byKey.set(k, bucket);
	}
	const sections: RecurringSection[] = [];
	for (const [k, bucket] of byKey) {
		bucket.sort((a, b) => b.confidence - a.confidence);
		const categoryId = k === '__uncat__' ? null : Number(k);
		const cat =
			categoryId !== null
				? categoryList.find((c) => String(c.id) === String(categoryId))
				: undefined;
		const label =
			categoryId === null
				? 'Uncategorized'
				: cat?.name ?? `Category ${String(categoryId)}`;
		let spendingMonthly = 0;
		let incomeMonthly = 0;
		for (const r of bucket) {
			if (r.flow === 'expense') {
				spendingMonthly += r.estimatedMonthlyDollars;
			} else {
				incomeMonthly += r.estimatedMonthlyDollars;
			}
		}
		sections.push({
			sectionKey: k,
			categoryId,
			label,
			colour: cat?.colour,
			rows: bucket,
			spendingMonthly: Math.round(spendingMonthly * 100) / 100,
			incomeMonthly: Math.round(incomeMonthly * 100) / 100,
		});
	}
	sections.sort((a, b) => {
		if (a.categoryId === null && b.categoryId !== null) {
			return 1;
		}
		if (a.categoryId !== null && b.categoryId === null) {
			return -1;
		}
		return a.label.localeCompare(b.label);
	});
	return sections;
}

/** One table row per category when “Group by category” is on. */
type RecurringCategoryAggRow = {
	rowId: string;
	labelSample: string;
	modeCategoryId: number | null;
	patternCount: number;
	cadenceLabel: string;
	medianGapDays: number;
	typicalAmountDollars: number;
	spendingMonthly: number;
	incomeMonthly: number;
	minAmountDollars: number;
	maxAmountDollars: number;
	occurrences: number;
	firstDate: string;
	lastDate: string;
	confidence: number;
	flow: 'expense';
};

function sectionToAggRow(section: RecurringSection): RecurringCategoryAggRow {
	let firstDate = section.rows[0]?.firstDate ?? '';
	let lastDate = section.rows[0]?.lastDate ?? '';
	let maxConf = 0;
	let hits = 0;
	for (const r of section.rows) {
		if (r.firstDate < firstDate) {
			firstDate = r.firstDate;
		}
		if (r.lastDate > lastDate) {
			lastDate = r.lastDate;
		}
		if (r.confidence > maxConf) {
			maxConf = r.confidence;
		}
		hits += r.occurrences;
	}
	return {
		rowId: `agg:${section.sectionKey}`,
		labelSample: section.label,
		modeCategoryId: section.categoryId,
		patternCount: section.rows.length,
		cadenceLabel: '—',
		medianGapDays: 0,
		typicalAmountDollars: 0,
		spendingMonthly: section.spendingMonthly,
		incomeMonthly: section.incomeMonthly,
		minAmountDollars: 0,
		maxAmountDollars: 0,
		occurrences: hits,
		firstDate,
		lastDate,
		confidence: maxConf,
		flow: 'expense',
	};
}

type SortDir = 'asc' | 'desc';

type SectionSortKey =
	| 'label'
	| 'typical'
	| 'occurrences'
	| 'firstDate'
	| 'lastDate'
	| 'confidence';

type PatternSortKey =
	| 'labelSample'
	| 'cadenceLabel'
	| 'medianGapDays'
	| 'typicalAmountDollars'
	| 'minAmountDollars'
	| 'occurrences'
	| 'firstDate'
	| 'lastDate'
	| 'confidence';

function sectionSortKeyFromAggKey(
	k: keyof RecurringCategoryAggRow
): SectionSortKey | null {
	if (k === 'labelSample') {
		return 'label';
	}
	if (k === 'typicalAmountDollars') {
		return 'typical';
	}
	if (k === 'occurrences') {
		return 'occurrences';
	}
	if (k === 'firstDate') {
		return 'firstDate';
	}
	if (k === 'lastDate') {
		return 'lastDate';
	}
	if (k === 'confidence') {
		return 'confidence';
	}
	return null;
}

function sortSectionsList(
	sections: RecurringSection[],
	key: SectionSortKey,
	dir: SortDir
): RecurringSection[] {
	const out = [...sections];
	const mult = dir === 'asc' ? 1 : -1;
	out.sort((a, b) => {
		const ra = sectionToAggRow(a);
		const rb = sectionToAggRow(b);
		switch (key) {
			case 'label': {
				if (a.categoryId === null && b.categoryId !== null) {
					return 1;
				}
				if (a.categoryId !== null && b.categoryId === null) {
					return -1;
				}
				return mult * ra.labelSample.localeCompare(rb.labelSample);
			}
			case 'typical':
				return (
					mult *
					(ra.spendingMonthly +
						ra.incomeMonthly -
						(rb.spendingMonthly + rb.incomeMonthly))
				);
			case 'occurrences':
				return mult * (ra.occurrences - rb.occurrences);
			case 'firstDate':
				return mult * ra.firstDate.localeCompare(rb.firstDate);
			case 'lastDate':
				return mult * ra.lastDate.localeCompare(rb.lastDate);
			case 'confidence':
				return mult * (ra.confidence - rb.confidence);
			default:
				return 0;
		}
	});
	return out;
}

function patternSortKeyFromColumnKey(
	k: keyof RecurringCandidateRow
): PatternSortKey | null {
	switch (k) {
		case 'labelSample':
		case 'cadenceLabel':
		case 'medianGapDays':
		case 'typicalAmountDollars':
		case 'minAmountDollars':
		case 'occurrences':
		case 'firstDate':
		case 'lastDate':
		case 'confidence':
			return k;
		default:
			return null;
	}
}

function sortPatterns(
	bucket: RecurringCandidateRow[],
	key: PatternSortKey,
	dir: SortDir,
	categoryList: Category[]
): RecurringCandidateRow[] {
	const out = [...bucket];
	const mult = dir === 'asc' ? 1 : -1;
	const catName = (id: number | null) => {
		if (id === null) {
			return '\uffff';
		}
		const c = categoryList.find((x) => String(x.id) === String(id));
		return c?.name ?? String(id);
	};
	out.sort((a, b) => {
		switch (key) {
			case 'labelSample': {
				const byCat = catName(a.modeCategoryId).localeCompare(
					catName(b.modeCategoryId)
				);
				if (byCat !== 0) {
					return mult * byCat;
				}
				return mult * a.labelSample.localeCompare(b.labelSample);
			}
			case 'cadenceLabel':
				return mult * a.cadenceLabel.localeCompare(b.cadenceLabel);
			case 'medianGapDays':
				return mult * (a.medianGapDays - b.medianGapDays);
			case 'typicalAmountDollars': {
				const byMo = a.estimatedMonthlyDollars - b.estimatedMonthlyDollars;
				if (byMo !== 0) {
					return mult * byMo;
				}
				return mult * (a.typicalAmountDollars - b.typicalAmountDollars);
			}
			case 'minAmountDollars':
				return mult * (a.minAmountDollars - b.minAmountDollars);
			case 'occurrences':
				return mult * (a.occurrences - b.occurrences);
			case 'firstDate':
				return mult * a.firstDate.localeCompare(b.firstDate);
			case 'lastDate':
				return mult * a.lastDate.localeCompare(b.lastDate);
			case 'confidence':
				return mult * (a.confidence - b.confidence);
			default:
				return 0;
		}
	});
	return out;
}

const DEFAULT_PATTERN_SORT: { key: PatternSortKey; dir: SortDir } = {
	key: 'confidence',
	dir: 'desc',
};

const RecurringExpensesPage = () => {
	const dispatch = useAppDispatch();
	const { accountIdNumber } = useAccountFilter();
	const { categories, categoriesLoading, categoriesError } = useAppSelector(
		(s) => s.CategoryReducer
	);
	const categoryList = useMemo<Category[]>(() => {
		return Array.isArray(categories) ? categories : [];
	}, [categories]);

	const [minOccurrences, setMinOccurrences] = useState(3);
	const [apiRows, setApiRows] = useState<RecurringCandidateRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [groupByCategory, setGroupByCategory] = useState<boolean>(() => {
		if (typeof window === 'undefined') {
			return false;
		}
		return localStorage.getItem('recurringGroupByCategory') === 'true';
	});

	useEffect(() => {
		localStorage.setItem('recurringGroupByCategory', String(groupByCategory));
	}, [groupByCategory]);

	const [expandedSections, setExpandedSections] = useState<Set<string>>(
		() => new Set()
	);
	const [sectionSort, setSectionSort] = useState<{
		key: SectionSortKey;
		dir: SortDir;
	}>({ key: 'label', dir: 'asc' });
	const [subSortBySection, setSubSortBySection] = useState<
		Record<string, { key: PatternSortKey; dir: SortDir }>
	>({});
	const [detailSort, setDetailSort] = useState<{
		key: keyof RecurringCandidateRow;
		direction: SortDirection;
	}>({ key: 'confidence', direction: 'desc' });

	useEffect(() => {
		setLoading(true);
		setError(null);
		void fetchRecurringAnalytics(minOccurrences, accountIdNumber)
			.then((rows) => setApiRows(rows))
			.catch((err: unknown) => {
				setApiRows([]);
				setError(err instanceof Error ? err.message : 'Failed to load recurring patterns');
			})
			.finally(() => setLoading(false));
	}, [minOccurrences, accountIdNumber]);

	const categoriesFetchRef = useRef(false);
	useEffect(() => {
		if (categoryList.length > 0 || categoriesError || categoriesLoading) {
			return;
		}
		if (categoriesFetchRef.current) {
			return;
		}
		categoriesFetchRef.current = true;
		void dispatch(getAllCategories());
	}, [dispatch, categoryList.length, categoriesError, categoriesLoading]);

	const expenseRows = useMemo(
		() => apiRows.filter((r) => r.flow === 'expense'),
		[apiRows]
	);
	const incomeRows = useMemo(
		() => apiRows.filter((r) => r.flow === 'income'),
		[apiRows]
	);
	const rows = useMemo(() => {
		const merged = [...apiRows];
		merged.sort((a, b) => b.confidence - a.confidence);
		return merged;
	}, [apiRows]);

	const handleDetailSortChange = (
		sortKey: keyof RecurringCandidateRow | null,
		direction: SortDirection
	) => {
		if (sortKey === null) {
			return;
		}
		setDetailSort((prev) => {
			if (prev.key === sortKey) {
				return { key: sortKey, direction };
			}
			const numeric = sortKey !== 'labelSample';
			return {
				key: sortKey,
				direction: numeric ? 'desc' : 'asc',
			};
		});
	};

	const sortedDetailRows = useMemo(() => {
		const pk = patternSortKeyFromColumnKey(detailSort.key);
		if (pk === null) {
			return rows;
		}
		return sortPatterns(
			rows,
			pk,
			detailSort.direction === 'asc' ? 'asc' : 'desc',
			categoryList
		);
	}, [rows, detailSort, categoryList]);

	const sections = useMemo(() => {
		if (!groupByCategory || rows.length === 0) {
			return [];
		}
		return buildRecurringSections(rows, categoryList);
	}, [groupByCategory, rows, categoryList]);

	const sortedSections = useMemo(
		() => sortSectionsList(sections, sectionSort.key, sectionSort.dir),
		[sections, sectionSort]
	);

	const subSortFor = (sectionKey: string) =>
		subSortBySection[sectionKey] ?? DEFAULT_PATTERN_SORT;

	const cycleSectionSort = (key: SectionSortKey) => {
		setSectionSort((prev) => {
			if (prev.key === key) {
				return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
			}
			const numeric = key !== 'label';
			return { key, dir: numeric ? 'desc' : 'asc' };
		});
	};

	const cyclePatternSort = (sectionKey: string, key: PatternSortKey) => {
		setSubSortBySection((prev) => {
			const cur = prev[sectionKey] ?? DEFAULT_PATTERN_SORT;
			if (cur.key === key) {
				return {
					...prev,
					[sectionKey]: { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' },
				};
			}
			const numeric = key !== 'labelSample';
			return {
				...prev,
				[sectionKey]: { key, dir: numeric ? 'desc' : 'asc' },
			};
		});
	};

	const toggleSection = (sectionKey: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(sectionKey)) {
				next.delete(sectionKey);
			} else {
				next.add(sectionKey);
			}
			return next;
		});
	};

	const { estimatedMonthlyTotal } = useMemo(() => {
		let monthly = 0;
		for (const r of expenseRows) {
			monthly += r.estimatedMonthlyDollars;
		}
		return {
			estimatedMonthlyTotal: Math.round(monthly * 100) / 100,
		};
	}, [expenseRows]);

	const { estimatedMonthlyIncomeTotal } = useMemo(() => {
		let monthly = 0;
		for (const r of incomeRows) {
			monthly += r.estimatedMonthlyDollars;
		}
		return {
			estimatedMonthlyIncomeTotal: Math.round(monthly * 100) / 100,
		};
	}, [incomeRows]);

	const detailColumns: TColumn<RecurringCandidateRow>[] = useMemo(
		() => [
			{
				key: 'labelSample',
				label: 'Example description',
				sortable: true,
				sortFunction: (a, b, rowA, rowB) => {
					const catName = (id: number | null) => {
						if (id === null) {
							return '\uffff';
						}
						const c = categoryList.find((x) => String(x.id) === String(id));
						return c?.name ?? String(id);
					};
					const byCat = catName(rowA.modeCategoryId).localeCompare(
						catName(rowB.modeCategoryId)
					);
					if (byCat !== 0) {
						return byCat;
					}
					return a.localeCompare(b);
				},
				render: (v, row) => {
					const cat =
						row.modeCategoryId !== null
							? categoryList.find(
									(c) => String(c.id) === String(row.modeCategoryId)
								)
							: undefined;
					const showDeleted =
						cat?.deleted_at && row.modeCategoryId !== null;
					return (
						<div className="max-w-md">
							<div className="flex flex-wrap gap-1 mb-1.5">
								{row.modeCategoryId !== null && cat && !cat.deleted_at ? (
									<CategoryPill name={cat.name} colour={cat.colour} />
								) : row.modeCategoryId !== null && showDeleted ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-paper-fg bg-gray-600 shrink-0">
										{cat?.name ?? `ID ${row.modeCategoryId}`} (deleted)
									</span>
								) : row.modeCategoryId !== null && !cat ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-paper-fg bg-gray-600 shrink-0">
										ID: {row.modeCategoryId}
									</span>
								) : (
									<span className="inline-block px-2 py-0.5 rounded text-xs italic text-gray-400 bg-gray-700 shrink-0">
										Uncategorized
									</span>
								)}
								<span
									className={
										row.flow === 'income'
											? 'inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide shrink-0 border border-green-500/45 text-green-400/95'
											: 'inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide shrink-0 border border-red-500/35 text-red-300/90'
									}
								>
									{row.flow === 'income' ? 'Income' : 'Spending'}
								</span>
							</div>
							<p className="text-sm truncate" title={v}>
								{v}
							</p>
						</div>
					);
				},
			},
			{
				key: 'cadenceLabel',
				label: 'Cadence',
				sortable: true,
				render: (v) => <span className="text-sm">{v}</span>,
			},
			{
				key: 'medianGapDays',
				label: 'Typical spacing (days)',
				sortable: true,
				render: (v) => (
					<span className="font-mono text-sm">{v}</span>
				),
			},
			{
				key: 'typicalAmountDollars',
				label: 'Amount · per month',
				sortable: true,
				sortFunction: (a, b, rowA, rowB) => {
					const byMo =
						rowA.estimatedMonthlyDollars - rowB.estimatedMonthlyDollars;
					if (byMo !== 0) {
						return byMo;
					}
					return a - b;
				},
				render: (v, row) => (
					<div className="flex flex-col gap-1 py-0.5 min-w-[6.75rem]">
						<span
							className={`font-mono text-sm tabular-nums leading-none ${mainAmountClass(row.flow)}`}
						>
							{formatMoney(v)}
						</span>
						<span className="font-mono text-[11px] tabular-nums leading-none text-paper-muted">
							<span className="text-paper-muted mr-0.5" aria-hidden>
								≈
							</span>
							{formatMoney(row.estimatedMonthlyDollars)}
							<span className="text-paper-muted font-sans font-normal text-[10px] ml-1">
								/mo
							</span>
						</span>
					</div>
				),
			},
			{
				key: 'minAmountDollars',
				label: 'Min / max',
				sortable: true,
				render: (_v, row) => (
					<span
						className={`font-mono text-sm ${rangeAmountClass(row.flow)}`}
					>
						{formatMoney(row.minAmountDollars)} —{' '}
						{formatMoney(row.maxAmountDollars)}
					</span>
				),
				sortFunction: (_a, _b, rowA, rowB) =>
					rowA.minAmountDollars - rowB.minAmountDollars,
			},
			{
				key: 'occurrences',
				label: 'Times seen',
				sortable: true,
				render: (v) => <span className="text-center">{v}</span>,
				cellClassName: 'text-center',
				headerClassName: 'text-center',
			},
			{
				key: 'firstDate',
				label: 'First',
				sortable: true,
			},
			{
				key: 'lastDate',
				label: 'Last',
				sortable: true,
			},
			{
				key: 'confidence',
				label: 'Match score',
				sortable: true,
				render: (v) => (
					<span
						className={
							v >= 70
								? 'text-green-400'
								: v >= 45
									? 'text-amber-300'
									: 'text-gray-400'
						}
					>
						{v}
					</span>
				),
			},
		],
		[categoryList]
	);

	const categoryColumns: TColumn<RecurringCategoryAggRow>[] = useMemo(
		() => [
			{
				key: 'labelSample',
				label: 'Category',
				sortable: true,
				sortFunction: (a, b) => a.localeCompare(b),
				render: (_v, row) => {
					const cat =
						row.modeCategoryId !== null
							? categoryList.find(
									(c) => String(c.id) === String(row.modeCategoryId)
								)
							: undefined;
					const showDeleted =
						cat?.deleted_at && row.modeCategoryId !== null;
					return (
						<div className="max-w-md">
							<div className="flex flex-wrap items-center gap-2">
								{row.modeCategoryId !== null && cat && !cat.deleted_at ? (
									<CategoryPill name={cat.name} colour={cat.colour} />
								) : row.modeCategoryId !== null && showDeleted ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-paper-fg bg-gray-600 shrink-0">
										{cat?.name ?? `ID ${row.modeCategoryId}`} (deleted)
									</span>
								) : row.modeCategoryId !== null && !cat ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-paper-fg bg-gray-600 shrink-0">
										ID: {row.modeCategoryId}
									</span>
								) : (
									<span className="inline-block px-2 py-0.5 rounded text-xs italic text-gray-400 bg-gray-700 shrink-0">
										Uncategorized
									</span>
								)}
							</div>
							<p className="text-[10px] text-paper-muted mt-1">
								{row.patternCount} pattern{row.patternCount === 1 ? '' : 's'} ·
								click to expand
							</p>
						</div>
					);
				},
			},
			{
				key: 'cadenceLabel',
				label: 'Cadence',
				sortable: false,
				render: () => <span className="text-sm text-paper-muted">—</span>,
			},
			{
				key: 'medianGapDays',
				label: 'Typical spacing (days)',
				sortable: false,
				render: () => (
					<span className="font-mono text-sm text-paper-muted">—</span>
				),
			},
			{
				key: 'typicalAmountDollars',
				label: 'Est. per month',
				sortable: true,
				sortFunction: (_a, _b, rowA, rowB) => {
					const t =
						rowA.spendingMonthly +
						rowA.incomeMonthly -
						(rowB.spendingMonthly + rowB.incomeMonthly);
					if (t !== 0) {
						return t;
					}
					return rowA.labelSample.localeCompare(rowB.labelSample);
				},
				render: (_v, row) => (
					<div className="flex flex-col gap-1 py-0.5 min-w-[6.75rem]">
						{row.spendingMonthly > 0 ? (
							<span className="font-mono text-sm tabular-nums text-red-300 leading-none">
								{formatMoney(row.spendingMonthly)}
								<span className="text-paper-muted font-sans font-normal text-[10px] ml-1">
									spend/mo
								</span>
							</span>
						) : null}
						{row.incomeMonthly > 0 ? (
							<span className="font-mono text-sm tabular-nums text-green-400 leading-none">
								{formatMoney(row.incomeMonthly)}
								<span className="text-paper-muted font-sans font-normal text-[10px] ml-1">
									income/mo
								</span>
							</span>
						) : null}
						{row.spendingMonthly === 0 && row.incomeMonthly === 0 ? (
							<span className="text-paper-muted text-sm">—</span>
						) : null}
					</div>
				),
			},
			{
				key: 'minAmountDollars',
				label: 'Min / max',
				sortable: false,
				render: () => (
					<span className="font-mono text-sm text-paper-muted">—</span>
				),
			},
			{
				key: 'occurrences',
				label: 'Times seen',
				sortable: true,
				sortFunction: (a, b) => a - b,
				render: (v) => <span className="text-center">{v}</span>,
				cellClassName: 'text-center',
				headerClassName: 'text-center',
			},
			{
				key: 'firstDate',
				label: 'First',
				sortable: true,
			},
			{
				key: 'lastDate',
				label: 'Last',
				sortable: true,
			},
			{
				key: 'confidence',
				label: 'Match score',
				sortable: true,
				sortFunction: (a, b) => a - b,
				render: (v) => (
					<span
						className={
							v >= 70
								? 'text-green-400'
								: v >= 45
									? 'text-amber-300'
									: 'text-gray-400'
						}
					>
						{v}
					</span>
				),
			},
		],
		[categoryList]
	);

	const initialLoading = loading && apiRows.length === 0 && !error;

	if (initialLoading) {
		return <PageLoadingState label="Loading repeat payments…" />;
	}

	if (error) {
		return (
			<ErrorState
				title="Could not load repeat payments"
				message={error}
			/>
		);
	}

	const tableEmpty =
		groupByCategory
			? sections.length === 0 && !loading
			: rows.length === 0 && !loading;

	return (
		<PageShell variant="table" className="p-4">
			<PageHeader
				title="Repeat payments"
				icon={<Repeat className="h-6 w-6 text-secondary-default" />}
				meta={<RepeatPaymentsHelp />}
				actions={
					expenseRows.length > 0 || incomeRows.length > 0 ? (
						<div className="flex flex-row flex-wrap items-stretch justify-end gap-3">
							{expenseRows.length > 0 ? (
								<StatCard
									label="Estimated monthly spending"
									value={formatMoney(estimatedMonthlyTotal)}
									valueClassName="text-red-300"
									hint={`${expenseRows.length} spending pattern${expenseRows.length === 1 ? '' : 's'}`}
								/>
							) : null}
							{incomeRows.length > 0 ? (
								<StatCard
									align="right"
									label="Estimated monthly income"
									value={formatMoney(estimatedMonthlyIncomeTotal)}
									valueClassName="text-green-400"
									hint={`${incomeRows.length} income pattern${incomeRows.length === 1 ? '' : 's'}`}
								/>
							) : null}
						</div>
					) : null
				}
			/>

			{groupByCategory ? (
				<p className="mb-3 text-sm text-paper-muted">
					Grouped by category — click a row to see the individual payments behind
					it.
				</p>
			) : null}

			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
				<div className="flex flex-wrap items-center gap-3">
					<AccountFilter />
					<SegmentedControl
						ariaLabel="Repeat payments view"
						value={groupByCategory ? 'category' : 'pattern'}
						onChange={(next) => setGroupByCategory(next === 'category')}
						options={[
							{ value: 'pattern', label: 'By pattern' },
							{ value: 'category', label: 'By category' },
						]}
					/>
				</div>
				<label className="flex items-center gap-2 text-sm text-paper-fg">
					<span>Minimum occurrences</span>
					<select
						value={minOccurrences}
						onChange={(e) =>
							setMinOccurrences(Number.parseInt(e.target.value, 10))
						}
						className={cn(inputDarkClass, 'px-2 py-1')}
					>
						<option value={2}>2</option>
						<option value={3}>3</option>
						<option value={4}>4</option>
						<option value={5}>5</option>
					</select>
				</label>
			</div>

			<div className="flex-grow overflow-hidden min-h-0">
				{groupByCategory ? (
					<div className="flex flex-col h-full bg-primary-default text-gray-200">
						<div className="flex-grow overflow-auto min-h-0">
							<table className="w-full min-w-[960px]">
								<thead
									className={cn(
										'border-b border-paper-border bg-paper-surface backdrop-blur-sm',
										'sticky top-0 z-10'
									)}
								>
									<tr>
										<th className="px-4 py-3 w-10" />
										{categoryColumns.map((col) => {
											const sk = sectionSortKeyFromAggKey(col.key);
											const headerSortable =
												Boolean(col.sortable) && sk !== null;
											return (
												<th
													key={String(col.key)}
													className={cn(
														'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400',
														col.headerClassName
													)}
												>
													{headerSortable && sk !== null ? (
														<button
															type="button"
															onClick={() => cycleSectionSort(sk)}
															className={cn(
																'w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
																col.headerClassName,
																sectionSort.key === sk
																	? 'text-secondary-default'
																	: 'text-gray-400'
															)}
														>
															{col.label}
															{sectionSort.key === sk
																? sectionSort.dir === 'asc'
																	? ' ▲'
																	: ' ▼'
																: ''}
														</button>
													) : (
														<span
															className={cn(
																'text-gray-400',
																col.headerClassName
															)}
														>
															{col.label}
														</span>
													)}
												</th>
											);
										})}
									</tr>
								</thead>
								<tbody className="divide-y divide-paper-border">
									{loading && sortedSections.length === 0
										? Array.from({ length: 8 }).map((_, rowIndex) => (
												<tr key={`skel-${String(rowIndex)}`} className="animate-pulse">
													<td className="px-4 py-3">
														<div className="h-4 w-4 rounded bg-gray-700" />
													</td>
													{categoryColumns.map((_, colIndex) => (
														<td
															key={`skel-${String(rowIndex)}-${String(colIndex)}`}
															className="px-4 py-3"
														>
															<div className="h-4 w-3/4 rounded bg-gray-700" />
														</td>
													))}
												</tr>
											))
										: null}
									{!loading && sortedSections.length === 0 ? (
										<tr>
											<td
												colSpan={1 + categoryColumns.length}
												className="text-center py-10 px-4 text-gray-500"
											>
												{tableEmpty
													? 'No repeat patterns found — lower “minimum occurrences” or add more history.'
													: 'Loading…'}
											</td>
										</tr>
									) : null}
									{sortedSections.map((section) => {
										const isOpen = expandedSections.has(section.sectionKey);
										const agg = sectionToAggRow(section);
										const subSort = subSortFor(section.sectionKey);
										const sortedPatterns = sortPatterns(
											section.rows,
											subSort.key,
											subSort.dir,
											categoryList
										);
										return (
											<Fragment key={section.sectionKey}>
												<tr
													className="hover:bg-paper cursor-pointer transition-colors"
													onClick={() => toggleSection(section.sectionKey)}
												>
													<td className="px-4 py-3 align-middle text-paper-muted">
														{isOpen ? (
															<ChevronDown className="w-4 h-4" />
														) : (
															<ChevronRight className="w-4 h-4" />
														)}
													</td>
													{categoryColumns.map((col) => (
														<td
															key={String(col.key)}
															className={cn(
																'px-4 py-3 whitespace-nowrap text-sm text-gray-300',
																col.cellClassName
															)}
														>
															{renderCell(col, agg)}
														</td>
													))}
												</tr>
												{isOpen ? (
													<>
														<tr
															className="bg-paper-surface border-y border-paper-border"
															onClick={(e) => e.stopPropagation()}
														>
															<td className="px-4 py-2" />
															{detailColumns.map((col) => {
																const pk = patternSortKeyFromColumnKey(
																	col.key
																);
																const subHeaderSortable =
																	Boolean(col.sortable) && pk !== null;
																return (
																	<td
																		key={String(col.key)}
																		className={cn(
																			'px-4 py-2',
																			col.headerClassName
																		)}
																	>
																		{subHeaderSortable && pk !== null ? (
																			<button
																				type="button"
																				onClick={() =>
																					cyclePatternSort(
																						section.sectionKey,
																						pk
																					)
																				}
																				className={cn(
																					'text-[10px] font-medium uppercase tracking-wider w-full bg-transparent border-0 p-0 cursor-pointer hover:text-secondary-default',
																					col.headerClassName,
																					subSort.key === pk
																						? 'text-secondary-default'
																						: 'text-gray-500'
																				)}
																			>
																				{col.label}
																				{subSort.key === pk
																					? subSort.dir === 'asc'
																						? ' ▲'
																						: ' ▼'
																					: ''}
																			</button>
																		) : (
																			<span
																				className={cn(
																					'text-[10px] font-medium uppercase tracking-wider text-gray-500',
																					col.headerClassName
																				)}
																			>
																				{col.label}
																			</span>
																		)}
																	</td>
																);
															})}
														</tr>
														{sortedPatterns.map((pattern) => (
															<tr
																key={pattern.rowId}
																className="bg-paper-surface/60 hover:bg-gray-900/50"
																onClick={(e) => e.stopPropagation()}
															>
																<td className="px-4 py-2" />
																{detailColumns.map((col) => (
																	<td
																		key={String(col.key)}
																		className={cn(
																			'px-4 py-2 whitespace-nowrap text-sm text-gray-300',
																			col.cellClassName
																		)}
																	>
																		{renderCell(col, pattern)}
																	</td>
																))}
															</tr>
														))}
													</>
												) : null}
											</Fragment>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<Table<RecurringCandidateRow>
						columns={detailColumns}
						data={sortedDetailRows}
						rowKey="rowId"
						header={{ sticky: true }}
						loading={loading}
						sortState={{
							key: detailSort.key,
							direction: detailSort.direction,
						}}
						onSortChange={handleDetailSortChange}
						emptyStateMessage={
							tableEmpty
								? 'No repeat patterns found — lower “minimum occurrences” or add more history.'
								: 'Loading…'
						}
					/>
				)}
			</div>
		</PageShell>
	);
};

export default RecurringExpensesPage;
