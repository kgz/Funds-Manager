import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import {
	fetchRecurringAnalytics,
	type RecurringCandidateRow,
} from '@/store/thunks/analytics';
import { CategoryPill } from '@/components/CategoryPill';
import { cn } from '@/lib/utils/cn';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	glassCardClass,
	pageActionsClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
	selectDarkClass,
} from '@/components/layout/tokens';
import { AccountFilter } from '@/components/account-filter';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import { RepeatPaymentsHelp } from '@/components/recurring/RepeatPaymentsHelp';
import { RepeatFlowChip } from '@/components/recurring/RepeatFlowChip';
import { RepeatScoreBadge } from '@/components/recurring/RepeatScoreBadge';
import { moneyDangerClass, moneySuccessClass } from '@/lib/utils/moneySemantics';
import { ChevronRight, Loader2 } from 'lucide-react';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTableDate = (iso: string): string => {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		return iso;
	}
	return d.toLocaleDateString('en-AU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
};

function shouldShowGapSubline(cadenceLabel: string): boolean {
	return !cadenceLabel.startsWith('~every ');
}

const kpiLabelClass =
	'm-0 text-[12px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const kpiHintClass = 'm-0 mt-2 text-xs text-paper-muted';

const tableThClass =
	'sticky top-0 z-10 whitespace-nowrap border-b border-paper-border bg-paper-surface px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

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
				: (cat?.name ?? `Category ${String(categoryId)}`);
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
			<svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.6">
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
	align?: 'left' | 'right';
	onClick?: () => void;
	sortable?: boolean;
	className?: string;
};

function SortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
	sortable = true,
	className,
}: SortHeaderProps) {
	const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
	const numeric = align === 'right';

	if (!sortable || onClick === undefined) {
		return (
			<th scope="col" className={cn(tableThClass, align === 'right' && 'text-right', className)}>
				<span>{label}</span>
			</th>
		);
	}

	return (
		<th
			scope="col"
			aria-sort={ariaSort}
			className={cn(tableThClass, align === 'right' && 'text-right', className)}
		>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-inherit hover:text-paper-fg',
					active && 'text-paper-fg',
					numeric && 'justify-end'
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

type CategoryTagsProps = {
	categoryId: number | null;
	categoryList: Category[];
};

function CategoryTags({ categoryId, categoryList }: CategoryTagsProps) {
	const cat =
		categoryId !== null
			? categoryList.find((c) => String(c.id) === String(categoryId))
			: undefined;
	const showDeleted = cat?.deleted_at && categoryId !== null;

	if (categoryId !== null && cat && !cat.deleted_at) {
		return (
			<CategoryPill
				name={cat.name}
				colour={cat.colour}
				variant="outline"
				uncategorized={false}
			/>
		);
	}
	if (categoryId !== null && showDeleted) {
		return (
			<span className="inline-flex h-[26px] shrink-0 items-center rounded-full border border-paper-border bg-paper px-2.5 text-xs text-paper-muted">
				{cat?.name ?? `ID ${String(categoryId)}`} (deleted)
			</span>
		);
	}
	if (categoryId !== null && !cat) {
		return (
			<span className="inline-flex h-[26px] shrink-0 items-center rounded-full border border-paper-border bg-paper px-2.5 text-xs text-paper-muted">
				ID: {categoryId}
			</span>
		);
	}
	return (
		<CategoryPill name="Uncategorized" variant="outline" uncategorized />
	);
}

type PatternAmountProps = {
	row: RecurringCandidateRow;
};

function PatternAmountCell({ row }: PatternAmountProps) {
	const flowClass = row.flow === 'income' ? moneySuccessClass : moneyDangerClass;
	return (
		<div className="flex flex-col items-end gap-0.5">
			<span className={cn('font-mono text-[13px] font-medium tabular-nums', flowClass)}>
				{formatMoney(row.typicalAmountDollars)}
			</span>
			<span className="font-mono text-[11px] tabular-nums text-paper-muted">
				≈ {formatMoney(row.estimatedMonthlyDollars)}/mo
			</span>
		</div>
	);
}

type SectionAmountProps = {
	spendingMonthly: number;
	incomeMonthly: number;
};

function SectionAmountCell({ spendingMonthly, incomeMonthly }: SectionAmountProps) {
	return (
		<div className="flex flex-col items-end gap-0.5">
			{spendingMonthly > 0 ? (
				<span className={cn('font-mono text-[13px] font-medium tabular-nums', moneyDangerClass)}>
					{formatMoney(spendingMonthly)}
					<span className="ml-1 font-sans text-[10px] font-normal text-paper-muted">
						spend/mo
					</span>
				</span>
			) : null}
			{incomeMonthly > 0 ? (
				<span className={cn('font-mono text-[13px] font-medium tabular-nums', moneySuccessClass)}>
					{formatMoney(incomeMonthly)}
					<span className="ml-1 font-sans text-[10px] font-normal text-paper-muted">
						income/mo
					</span>
				</span>
			) : null}
			{spendingMonthly === 0 && incomeMonthly === 0 ? (
				<span className="text-paper-muted">—</span>
			) : null}
		</div>
	);
}

type RepeatKpiRowProps = {
	spendingTotal: number;
	incomeTotal: number;
	expenseCount: number;
	incomeCount: number;
};

function RepeatKpiRow({
	spendingTotal,
	incomeTotal,
	expenseCount,
	incomeCount,
}: RepeatKpiRowProps) {
	if (expenseCount === 0 && incomeCount === 0) {
		return null;
	}
	return (
		<section
			className="flex flex-wrap gap-3"
			aria-label="Repeat payment summary"
		>
			{expenseCount > 0 ? (
				<article className="min-w-[260px] flex-1 rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
					<p className={kpiLabelClass}>Estimated monthly spending</p>
					<p className={cn('m-0 mt-2 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums', moneyDangerClass)}>
						{formatMoney(spendingTotal)}
					</p>
					<p className={kpiHintClass}>
						{expenseCount} spending pattern{expenseCount === 1 ? '' : 's'}
					</p>
				</article>
			) : null}
			{incomeCount > 0 ? (
				<article className="min-w-[260px] flex-1 rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
					<p className={kpiLabelClass}>Estimated monthly income</p>
					<p className={cn('m-0 mt-2 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums', moneySuccessClass)}>
						{formatMoney(incomeTotal)}
					</p>
					<p className={kpiHintClass}>
						{incomeCount} income pattern{incomeCount === 1 ? '' : 's'}
					</p>
				</article>
			) : null}
		</section>
	);
}

type PatternRowProps = {
	row: RecurringCandidateRow;
	categoryList: Category[];
	isChild?: boolean;
};

function PatternRow({ row, categoryList, isChild = false }: PatternRowProps) {
	const flowClass = row.flow === 'income' ? moneySuccessClass : moneyDangerClass;
	return (
		<tr
			className={cn(
				isChild &&
					'[&>td]:bg-[color-mix(in_oklch,var(--fg)_1%,var(--surface))] [&>td]:py-2'
			)}
		>
			{isChild ? <td className={tableTdClass} /> : null}
			<td className={cn(tableTdClass, 'min-w-[220px] max-w-[340px]', isChild && 'pl-7')}>
				<div className="flex min-w-0 flex-col gap-[5px]">
					<div className="flex flex-wrap items-center gap-[5px]">
						{isChild ? (
							<RepeatFlowChip flow={row.flow} />
						) : (
							<>
								<CategoryTags categoryId={row.modeCategoryId} categoryList={categoryList} />
								<RepeatFlowChip flow={row.flow} />
							</>
						)}
					</div>
					<p className="m-0 truncate text-[13px] text-paper-fg" title={row.labelSample}>
						{row.labelSample}
					</p>
				</div>
			</td>
			<td className={tableTdClass}>
				<div className="flex flex-col gap-0.5">
					<span>{row.cadenceLabel}</span>
					{shouldShowGapSubline(row.cadenceLabel) ? (
						<span className="font-mono text-[11px] text-paper-muted">
							~{row.medianGapDays}d apart
						</span>
					) : null}
				</div>
			</td>
			<td className={cn(tableTdClass, 'text-right')}>
				<PatternAmountCell row={row} />
			</td>
			<td className={cn(tableTdClass, 'whitespace-nowrap text-right font-mono tabular-nums', flowClass)}>
				{formatMoney(row.minAmountDollars)} – {formatMoney(row.maxAmountDollars)}
			</td>
			<td className={cn(tableTdClass, 'w-14 text-right font-mono tabular-nums')}>
				{row.occurrences}
			</td>
			<td className={cn(tableTdClass, 'w-24 whitespace-nowrap font-mono tabular-nums')}>
				{formatTableDate(row.firstDate)}
			</td>
			<td className={cn(tableTdClass, 'w-24 whitespace-nowrap font-mono tabular-nums')}>
				{formatTableDate(row.lastDate)}
			</td>
			<td className={cn(tableTdClass, 'w-24 text-right')}>
				<RepeatScoreBadge score={row.confidence} />
			</td>
		</tr>
	);
}

type SubSortHeaderProps = {
	label: string;
	active: boolean;
	direction: SortDir;
	align?: 'left' | 'right';
	onClick: () => void;
};

function SubSortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
}: SubSortHeaderProps) {
	const numeric = align === 'right';
	return (
		<td className={cn('px-3 py-1.5', align === 'right' && 'text-right')}>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-medium uppercase tracking-[0.06em] hover:text-paper-fg',
					active ? 'text-paper-fg' : 'text-paper-muted',
					numeric && 'flex-row-reverse'
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
		</td>
	);
}

const RecurringExpensesPage = () => {
	const dispatch = useAppDispatch();
	const { accountIdNumber, selectedLabel } = useAccountFilter();
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
	const [patternSort, setPatternSort] = useState<{
		key: PatternSortKey;
		dir: SortDir;
	}>(DEFAULT_PATTERN_SORT);

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

	const sortedPatternRows = useMemo(
		() => sortPatterns(rows, patternSort.key, patternSort.dir, categoryList),
		[rows, patternSort, categoryList]
	);

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

	const cycleMainPatternSort = (key: PatternSortKey) => {
		setPatternSort((prev) => {
			if (prev.key === key) {
				return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
			}
			const numeric = key !== 'labelSample' && key !== 'cadenceLabel';
			return { key, dir: numeric ? 'desc' : 'asc' };
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

	const estimatedMonthlyTotal = useMemo(() => {
		let monthly = 0;
		for (const r of expenseRows) {
			monthly += r.estimatedMonthlyDollars;
		}
		return Math.round(monthly * 100) / 100;
	}, [expenseRows]);

	const estimatedMonthlyIncomeTotal = useMemo(() => {
		let monthly = 0;
		for (const r of incomeRows) {
			monthly += r.estimatedMonthlyDollars;
		}
		return Math.round(monthly * 100) / 100;
	}, [incomeRows]);

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

	const emptyMessage =
		'No repeat patterns found — lower "minimum occurrences" or add more history.';

	const tableHint = `${selectedLabel} · min ${minOccurrences} occurrences`;

	const patternSortActive = (key: PatternSortKey) =>
		!groupByCategory && patternSort.key === key;
	const patternSortDir = (key: PatternSortKey) =>
		patternSortActive(key) ? patternSort.dir : 'asc';

	const sectionSortActive = (key: SectionSortKey) =>
		groupByCategory && sectionSort.key === key;
	const sectionSortDir = (key: SectionSortKey) =>
		sectionSortActive(key) ? sectionSort.dir : 'asc';

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<h1 className={pageTitleClass}>Repeat payments</h1>
							<RepeatPaymentsHelp />
							{loading ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Recurring debits and credits detected from statement history — refreshed
							as new statements import.
						</p>
					</div>
					<div className={pageActionsClass}>
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
						<label className="inline-flex items-center gap-2 whitespace-nowrap text-[12.5px] text-paper-muted">
							<span>Minimum occurrences</span>
							<select
								value={minOccurrences}
								onChange={(e) =>
									setMinOccurrences(Number.parseInt(e.target.value, 10))
								}
								className={cn(selectDarkClass, 'w-16 px-2 py-1.5')}
								aria-label="Minimum occurrences"
							>
								<option value={3} className="bg-paper-surface text-paper-fg">
									3
								</option>
								<option value={4} className="bg-paper-surface text-paper-fg">
									4
								</option>
								<option value={5} className="bg-paper-surface text-paper-fg">
									5
								</option>
								<option value={6} className="bg-paper-surface text-paper-fg">
									6
								</option>
							</select>
						</label>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				<div className="flex flex-col gap-6">
					<RepeatKpiRow
						spendingTotal={estimatedMonthlyTotal}
						incomeTotal={estimatedMonthlyIncomeTotal}
						expenseCount={expenseRows.length}
						incomeCount={incomeRows.length}
					/>

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>
								{groupByCategory ? 'By category' : 'By pattern'}
							</h2>
							<p className={cn(panelHintClass, 'mt-1')}>{tableHint}</p>
						</div>

						{groupByCategory ? (
							<p className="m-0 border-b border-paper-border bg-[color-mix(in_oklch,var(--fg)_1.5%,var(--surface))] px-4 py-2.5 text-[12.5px] text-paper-muted">
								Grouped by category — click a row to see the individual payments
								behind it.
							</p>
						) : null}

						<div className="overflow-x-auto">
							<table className="w-full min-w-[960px] border-collapse">
								<thead>
									<tr>
										{groupByCategory ? (
											<th className={cn(tableThClass, 'w-10')}>
												<span className="sr-only">Expand</span>
											</th>
										) : null}
										<SortHeader
											label={groupByCategory ? 'Category' : 'Description'}
											active={
												groupByCategory
													? sectionSortActive('label')
													: patternSortActive('labelSample')
											}
											direction={
												groupByCategory
													? sectionSortDir('label')
													: patternSortDir('labelSample')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('label')
													: cycleMainPatternSort('labelSample')
											}
											className="min-w-[220px] max-w-[340px]"
										/>
										<SortHeader
											label="Frequency"
											active={
												groupByCategory
													? false
													: patternSortActive('cadenceLabel')
											}
											direction={patternSortDir('cadenceLabel')}
											onClick={
												groupByCategory
													? undefined
													: () => cycleMainPatternSort('cadenceLabel')
											}
											sortable={!groupByCategory}
										/>
										<SortHeader
											label="Amount · per month"
											align="right"
											active={
												groupByCategory
													? sectionSortActive('typical')
													: patternSortActive('typicalAmountDollars')
											}
											direction={
												groupByCategory
													? sectionSortDir('typical')
													: patternSortDir('typicalAmountDollars')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('typical')
													: cycleMainPatternSort('typicalAmountDollars')
											}
										/>
										<SortHeader
											label="Min / max"
											align="right"
											active={
												groupByCategory
													? false
													: patternSortActive('minAmountDollars')
											}
											direction={patternSortDir('minAmountDollars')}
											onClick={
												groupByCategory
													? undefined
													: () => cycleMainPatternSort('minAmountDollars')
											}
											sortable={!groupByCategory}
										/>
										<SortHeader
											label="Times seen"
											align="right"
											active={
												groupByCategory
													? sectionSortActive('occurrences')
													: patternSortActive('occurrences')
											}
											direction={
												groupByCategory
													? sectionSortDir('occurrences')
													: patternSortDir('occurrences')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('occurrences')
													: cycleMainPatternSort('occurrences')
											}
											className="w-14"
										/>
										<SortHeader
											label="First"
											active={
												groupByCategory
													? sectionSortActive('firstDate')
													: patternSortActive('firstDate')
											}
											direction={
												groupByCategory
													? sectionSortDir('firstDate')
													: patternSortDir('firstDate')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('firstDate')
													: cycleMainPatternSort('firstDate')
											}
											className="w-24"
										/>
										<SortHeader
											label="Last"
											active={
												groupByCategory
													? sectionSortActive('lastDate')
													: patternSortActive('lastDate')
											}
											direction={
												groupByCategory
													? sectionSortDir('lastDate')
													: patternSortDir('lastDate')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('lastDate')
													: cycleMainPatternSort('lastDate')
											}
											className="w-24"
										/>
										<SortHeader
											label="Match score"
											align="right"
											active={
												groupByCategory
													? sectionSortActive('confidence')
													: patternSortActive('confidence')
											}
											direction={
												groupByCategory
													? sectionSortDir('confidence')
													: patternSortDir('confidence')
											}
											onClick={() =>
												groupByCategory
													? cycleSectionSort('confidence')
													: cycleMainPatternSort('confidence')
											}
											className="w-24"
										/>
									</tr>
								</thead>
								<tbody>
									{loading && (groupByCategory ? sortedSections.length === 0 : sortedPatternRows.length === 0)
										? Array.from({ length: 8 }).map((_, rowIndex) => (
												<tr key={`skel-${String(rowIndex)}`} className="animate-pulse">
													{groupByCategory ? (
														<td className={tableTdClass}>
															<div className="h-4 w-4 rounded bg-paper-border" />
														</td>
													) : null}
													{Array.from({ length: 8 }).map((__, colIndex) => (
														<td
															key={`skel-${String(rowIndex)}-${String(colIndex)}`}
															className={tableTdClass}
														>
															<div className="h-4 w-3/4 rounded bg-paper-border" />
														</td>
													))}
												</tr>
											))
										: null}

									{!loading && tableEmpty ? (
										<tr>
											<td
												colSpan={groupByCategory ? 9 : 8}
												className="px-4 py-10 text-center text-[13px] text-paper-muted"
											>
												{emptyMessage}
											</td>
										</tr>
									) : null}

									{!groupByCategory
										? sortedPatternRows.map((row) => (
												<PatternRow
													key={row.rowId}
													row={row}
													categoryList={categoryList}
												/>
											))
										: null}

									{groupByCategory
										? sortedSections.map((section) => {
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
															className={cn(
																'cursor-pointer font-medium transition-colors hover:[&>td]:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]',
																isOpen &&
																	'[&>td]:border-b-transparent [&>td]:bg-[color-mix(in_oklch,var(--fg)_1.5%,var(--surface))]'
															)}
															onClick={() => toggleSection(section.sectionKey)}
														>
															<td className={cn(tableTdClass, 'w-10')}>
																<button
																	type="button"
																	className="inline-grid h-7 w-7 place-items-center rounded-paper border-0 bg-transparent p-0 text-paper-muted transition-[background,color] hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg"
																	aria-expanded={isOpen}
																	aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${section.label}`}
																	onClick={(e) => {
																		e.stopPropagation();
																		toggleSection(section.sectionKey);
																	}}
																>
																	<ChevronRight
																		className={cn(
																			'h-3 w-3 transition-transform duration-150',
																			isOpen && 'rotate-90'
																		)}
																		strokeWidth={2.2}
																	/>
																</button>
															</td>
															<td className={cn(tableTdClass, 'min-w-[220px] max-w-[340px]')}>
																<div className="flex min-w-0 flex-col gap-[5px]">
																	<CategoryTags
																		categoryId={section.categoryId}
																		categoryList={categoryList}
																	/>
																	<p className="m-0 text-[11px] text-paper-muted">
																		{agg.patternCount} pattern
																		{agg.patternCount === 1 ? '' : 's'} · click to
																		expand
																	</p>
																</div>
															</td>
															<td className={tableTdClass}>
																<span className="text-paper-muted">—</span>
															</td>
															<td className={cn(tableTdClass, 'text-right')}>
																<SectionAmountCell
																	spendingMonthly={section.spendingMonthly}
																	incomeMonthly={section.incomeMonthly}
																/>
															</td>
															<td className={cn(tableTdClass, 'text-right')}>
																<span className="text-paper-muted">—</span>
															</td>
															<td className={cn(tableTdClass, 'text-right font-mono tabular-nums')}>
																{agg.occurrences}
															</td>
															<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
																{formatTableDate(agg.firstDate)}
															</td>
															<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
																{formatTableDate(agg.lastDate)}
															</td>
															<td className={cn(tableTdClass, 'text-right')}>
																<RepeatScoreBadge score={agg.confidence} />
															</td>
														</tr>
														{isOpen ? (
															<>
																<tr
																	className="border-y border-paper-border bg-[color-mix(in_oklch,var(--fg)_2%,var(--bg))] [&>td]:py-1.5"
																	onClick={(e) => e.stopPropagation()}
																>
																	<td className={tableTdClass} />
																	<SubSortHeader
																		label="Description"
																		active={subSort.key === 'labelSample'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'labelSample'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Frequency"
																		active={subSort.key === 'cadenceLabel'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'cadenceLabel'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Amount · per month"
																		align="right"
																		active={subSort.key === 'typicalAmountDollars'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'typicalAmountDollars'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Min / max"
																		align="right"
																		active={subSort.key === 'minAmountDollars'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'minAmountDollars'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Seen"
																		align="right"
																		active={subSort.key === 'occurrences'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'occurrences'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="First"
																		active={subSort.key === 'firstDate'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'firstDate'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Last"
																		active={subSort.key === 'lastDate'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'lastDate'
																			)
																		}
																	/>
																	<SubSortHeader
																		label="Score"
																		align="right"
																		active={subSort.key === 'confidence'}
																		direction={subSort.dir}
																		onClick={() =>
																			cyclePatternSort(
																				section.sectionKey,
																				'confidence'
																			)
																		}
																	/>
																</tr>
																{sortedPatterns.map((pattern) => (
																	<PatternRow
																		key={pattern.rowId}
																		row={pattern}
																		categoryList={categoryList}
																		isChild
																	/>
																))}
															</>
														) : null}
													</Fragment>
												);
											})
										: null}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>
		</PageShell>
	);
};

export default RecurringExpensesPage;
