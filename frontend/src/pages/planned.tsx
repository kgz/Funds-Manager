import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import {
	CalendarRange,
	Check,
	Edit2,
	Link2,
	Loader2,
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPill } from '@/components/CategoryPill';
import { PlannedPeriodFilter } from '@/components/dashboard/PlannedPeriodFilter';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { PlannedMatchCallout } from '@/components/planned/PlannedMatchCallout';
import {
	dateInputClass,
	eyebrowClass,
	glassCardClass,
	inputDarkClass,
	pageActionsClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import {
	formatPlannedMoneyFromCents,
	formatSignedMoneyFromCents,
	moneyClassForPlannedCents,
	moneyClassForSignedCents,
} from '@/lib/utils/moneySemantics';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import {
	PLANNED_CUSTOM_RANGE_STORAGE_KEY,
	PLANNED_PERIOD_STORAGE_KEY,
	PLANNED_RANGE_MODE_STORAGE_KEY,
	plannedPeriodDateRange,
	readStoredPlannedPeriod,
	type PlannedPeriod,
} from '@/components/dashboard/period';
import {
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
	tableTdClass,
	tableThClass,
} from '@/pages/lender-expenses/shared';
import { useDebounce } from '@/hooks/useDebounce';
import { notifyPlannedMatchesChanged } from '@/hooks/useActionableItemCount';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import {
	createPlannedSpending,
	deletePlannedSpending,
	getPlannedSpending,
	updatePlannedSpending,
} from '@/store/thunks/plannedSpending';
import {
	centsToDollars,
	dollarsToCents,
	fetchPlannedMatchSuggestions,
	fetchPlannedLinkCandidates,
	markPlannedComplete,
	parsePlannedAmountInput,
	plannedAmountTypeFromCents,
	resolvePlannedMatch,
	signedPlannedAmountCents,
	type PlannedAmountType,
	type PlannedMatchSuggestion,
	type PlannedMatchTransaction,
	type PlannedSpendingItem,
} from '@/types/plannedSpending';

type PlannedRangeMode = 'preset' | 'custom';
type ModalMode = 'add' | 'edit';
type PlannedSortKey = 'name' | 'amount' | 'date' | 'category';
type SortDir = 'asc' | 'desc';

const plannedBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const plannedBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const plannedBtnSmClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-paper-border bg-paper-surface px-2 text-xs font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const plannedBtnAccentSmClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-[color-mix(in_oklch,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))] px-2.5 text-xs font-medium tracking-[0.02em] text-secondary-default transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_18%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const plannedBtnDangerSmClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-[color-mix(in_oklch,var(--danger)_38%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_6%,var(--surface))] px-2 text-xs font-medium tracking-[0.02em] text-[color:var(--danger)] transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_14%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const plannedDialogClass =
	'fixed inset-0 m-auto h-fit w-[min(480px,calc(100vw-32px))] max-h-[min(640px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const plannedDialogWideClass =
	'fixed inset-0 m-auto h-[min(720px,calc(100vh-48px))] w-[min(760px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

function formatPlannedDate(isoDate: string): string {
	return DateTime.fromISO(isoDate).toFormat('d MMM yyyy');
}

function defaultCustomRange(): { start: string; end: string } {
	const start = DateTime.now().toISODate();
	const end = DateTime.now().endOf('year').toISODate();
	return {
		start: start ?? '',
		end: end ?? '',
	};
}

function readPlannedRangeMode(): PlannedRangeMode {
	const stored = localStorage.getItem(PLANNED_RANGE_MODE_STORAGE_KEY);
	return stored === 'custom' ? 'custom' : 'preset';
}

function readCustomRange(): { start: string; end: string } {
	try {
		const raw = localStorage.getItem(PLANNED_CUSTOM_RANGE_STORAGE_KEY);
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

function categoryById(
	categories: Category[],
	categoryId: string | null
): Category | null {
	if (categoryId === null) {
		return null;
	}
	return categories.find((cat) => cat.id === categoryId) ?? null;
}

function categoryLabel(cat: Category, categories: Category[]): string {
	if (cat.parent_category_id) {
		const parent = categories.find((p) => p.id === cat.parent_category_id);
		if (parent) {
			return `${parent.name} › ${cat.name}`;
		}
	}
	return cat.name;
}

function matchesPlannedSearch(
	item: PlannedSpendingItem,
	query: string,
	categories: Category[]
): boolean {
	const normalized = query.trim().toLowerCase();
	if (normalized.length === 0) {
		return true;
	}
	if (item.name.toLowerCase().includes(normalized)) {
		return true;
	}
	if (item.notes !== null && item.notes.toLowerCase().includes(normalized)) {
		return true;
	}
	const cat = categoryById(categories, item.category_id);
	if (cat !== null && categoryLabel(cat, categories).toLowerCase().includes(normalized)) {
		return true;
	}
	return false;
}

function sortPlannedItems(
	items: PlannedSpendingItem[],
	key: PlannedSortKey,
	dir: SortDir,
	categories: Category[]
): PlannedSpendingItem[] {
	const mult = dir === 'asc' ? 1 : -1;
	return [...items].sort((a, b) => {
		switch (key) {
			case 'name':
				return mult * a.name.localeCompare(b.name);
			case 'amount':
				return mult * (a.amount_cents - b.amount_cents);
			case 'date':
				return mult * a.start_date.localeCompare(b.start_date);
			case 'category': {
				const catA = categoryById(categories, a.category_id);
				const catB = categoryById(categories, b.category_id);
				const labelA = catA ? categoryLabel(catA, categories) : '';
				const labelB = catB ? categoryLabel(catB, categories) : '';
				return mult * labelA.localeCompare(labelB);
			}
			default:
				return 0;
		}
	});
}

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
	className?: string;
};

function SortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
	className,
}: SortHeaderProps) {
	const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
	const numeric = align === 'right';

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

function defaultLinkSearch(item: PlannedSpendingItem): string {
	if (item.notes !== null) {
		const firstSegment = item.notes.split(/[\s—–-]+/)[0]?.trim() ?? '';
		if (firstSegment.length >= 3) {
			return firstSegment;
		}
	}
	const words = item.name
		.split(/\s+/)
		.map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
		.filter((word) => word.length >= 4);
	return words[0] ?? '';
}

export default function PlannedSpendingPage() {
	const dispatch = useAppDispatch();
	const { items, totalCents, loading, error } = useAppSelector(
		(state) => state.PlannedReducer
	);
	const { categories } = useAppSelector((state) => state.CategoryReducer);

	const [rangeMode, setRangeMode] = useState<PlannedRangeMode>(readPlannedRangeMode);
	const [period, setPeriod] = useState<PlannedPeriod>(readStoredPlannedPeriod);
	const [customRange, setCustomRange] = useState(readCustomRange);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingItem, setEditingItem] = useState<PlannedSpendingItem | null>(null);
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [amountType, setAmountType] = useState<PlannedAmountType>('spending');
	const [plannedDate, setPlannedDate] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [notes, setNotes] = useState('');
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<PlannedSpendingItem | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const [matchSuggestions, setMatchSuggestions] = useState<PlannedMatchSuggestion[]>([]);
	const [matchBusy, setMatchBusy] = useState(false);
	const [linkTarget, setLinkTarget] = useState<PlannedSpendingItem | null>(null);
	const [linkSearch, setLinkSearch] = useState('');
	const debouncedLinkSearch = useDebounce(linkSearch, 300);
	const [linkCandidates, setLinkCandidates] = useState<PlannedMatchTransaction[]>([]);
	const [linkCandidatesLoading, setLinkCandidatesLoading] = useState(false);
	const [linkCandidatesError, setLinkCandidatesError] = useState<string | null>(null);
	const [selectedLinkTxnIds, setSelectedLinkTxnIds] = useState<number[]>([]);
	const [sortKey, setSortKey] = useState<PlannedSortKey>('date');
	const [sortDir, setSortDir] = useState<SortDir>('asc');

	const itemDialogRef = useRef<HTMLDialogElement>(null);
	const linkDialogRef = useRef<HTMLDialogElement>(null);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);

	const toggleLinkSelection = (transactionId: number) => {
		setSelectedLinkTxnIds((current) =>
			current.includes(transactionId)
				? current.filter((id) => id !== transactionId)
				: [...current, transactionId]
		);
	};

	const reloadMatchSuggestions = useCallback(() => {
		void fetchPlannedMatchSuggestions()
			.then(setMatchSuggestions)
			.catch(() => setMatchSuggestions([]));
		notifyPlannedMatchesChanged();
	}, []);

	useEffect(() => {
		reloadMatchSuggestions();
	}, [reloadMatchSuggestions]);

	useEffect(() => {
		const dialog = itemDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (modalOpen && !dialog.open) {
			dialog.showModal();
		} else if (!modalOpen && dialog.open) {
			dialog.close();
		}
	}, [modalOpen]);

	useEffect(() => {
		const dialog = linkDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (linkTarget !== null && !dialog.open) {
			dialog.showModal();
		} else if (linkTarget === null && dialog.open) {
			dialog.close();
		}
	}, [linkTarget]);

	useEffect(() => {
		const dialog = deleteDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (deleteTarget !== null && !dialog.open) {
			dialog.showModal();
		} else if (deleteTarget === null && dialog.open) {
			dialog.close();
		}
	}, [deleteTarget]);

	useEffect(() => {
		if (linkTarget === null) {
			return;
		}
		let cancelled = false;
		setLinkCandidatesLoading(true);
		setLinkCandidatesError(null);
		void fetchPlannedLinkCandidates(linkTarget.id, debouncedLinkSearch)
			.then((rows) => {
				if (cancelled) {
					return;
				}
				setLinkCandidates(rows);
				setSelectedLinkTxnIds((current) =>
					current.filter((id) => rows.some((row) => row.id === id))
				);
			})
			.catch((err: unknown) => {
				if (cancelled) {
					return;
				}
				setLinkCandidates([]);
				setLinkCandidatesError(
					err instanceof Error ? err.message : 'Failed to load transactions'
				);
			})
			.finally(() => {
				if (!cancelled) {
					setLinkCandidatesLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [linkTarget, debouncedLinkSearch]);

	const activeCategories = useMemo(
		() => categories.filter((cat) => !cat.deleted_at),
		[categories]
	);

	const effectiveRange = useMemo(() => {
		if (rangeMode === 'custom') {
			return customRange;
		}
		const preset = plannedPeriodDateRange(period);
		return {
			start: preset.start ?? '',
			end: preset.end ?? '',
		};
	}, [rangeMode, period, customRange]);

	const { start, end } = effectiveRange;
	const showAllItems =
		rangeMode === 'preset' && period === 'all';
	const showFutureOnly =
		rangeMode === 'preset' && period === 'future';
	const rangeInvalid =
		showAllItems
			? false
			: start.length < 10 ||
				(!showFutureOnly &&
					(end.length < 10 || start > end));

	useEffect(() => {
		localStorage.setItem(PLANNED_RANGE_MODE_STORAGE_KEY, rangeMode);
	}, [rangeMode]);

	useEffect(() => {
		if (rangeMode === 'preset') {
			localStorage.setItem(PLANNED_PERIOD_STORAGE_KEY, period);
		}
	}, [rangeMode, period]);

	useEffect(() => {
		if (rangeMode === 'custom') {
			localStorage.setItem(
				PLANNED_CUSTOM_RANGE_STORAGE_KEY,
				JSON.stringify(customRange)
			);
		}
	}, [rangeMode, customRange]);

	useEffect(() => {
		void dispatch(getAllCategories({ withCounts: false }));
	}, [dispatch]);

	const reload = useCallback(() => {
		if (rangeInvalid) {
			return;
		}
		void dispatch(
			getPlannedSpending(
				showAllItems
					? {}
					: showFutureOnly
						? { from: start }
						: { from: start, to: end }
			)
		);
	}, [dispatch, rangeInvalid, showAllItems, showFutureOnly, start, end]);

	useEffect(() => {
		reload();
	}, [reload]);

	const filteredItems = useMemo(
		() =>
			items.filter((item) =>
				matchesPlannedSearch(item, debouncedSearchQuery, activeCategories)
			),
		[items, debouncedSearchQuery, activeCategories]
	);

	const sortedItems = useMemo(
		() => sortPlannedItems(filteredItems, sortKey, sortDir, activeCategories),
		[filteredItems, sortKey, sortDir, activeCategories]
	);

	const onSort = (key: PlannedSortKey) => {
		if (sortKey === key) {
			setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortKey(key);
		setSortDir(key === 'name' || key === 'category' ? 'asc' : 'desc');
	};

	const filteredTotalCents = useMemo(
		() => filteredItems.reduce((sum, item) => sum + item.amount_cents, 0),
		[filteredItems]
	);

	const searchActive = debouncedSearchQuery.trim().length > 0;

	const suggestionByPlannedId = useMemo(() => {
		const map = new Map<string, PlannedMatchSuggestion>();
		for (const suggestion of matchSuggestions) {
			map.set(suggestion.planned.id, suggestion);
		}
		return map;
	}, [matchSuggestions]);

	const handleLinkMatch = async (suggestion: PlannedMatchSuggestion) => {
		setMatchBusy(true);
		try {
			await resolvePlannedMatch(
				suggestion.planned.id,
				suggestion.transaction.id,
				'link'
			);
			reload();
			reloadMatchSuggestions();
		} finally {
			setMatchBusy(false);
		}
	};

	const handleDismissMatch = async (suggestion: PlannedMatchSuggestion) => {
		setMatchBusy(true);
		try {
			await resolvePlannedMatch(
				suggestion.planned.id,
				suggestion.transaction.id,
				'dismiss'
			);
			reloadMatchSuggestions();
		} finally {
			setMatchBusy(false);
		}
	};

	const openLinkModal = (item: PlannedSpendingItem) => {
		setLinkTarget(item);
		setLinkSearch(defaultLinkSearch(item));
		setSelectedLinkTxnIds([]);
		setLinkCandidatesError(null);
	};

	const resetLinkModal = () => {
		setLinkTarget(null);
		setLinkSearch('');
		setLinkCandidates([]);
		setSelectedLinkTxnIds([]);
		setLinkCandidatesError(null);
	};

	const closeLinkModal = () => {
		if (matchBusy) {
			return;
		}
		resetLinkModal();
	};

	const handleConfirmManualLink = async () => {
		if (linkTarget === null || selectedLinkTxnIds.length === 0) {
			return;
		}
		setMatchBusy(true);
		try {
			for (const transactionId of selectedLinkTxnIds) {
				await resolvePlannedMatch(linkTarget.id, transactionId, 'link');
			}
			resetLinkModal();
			reload();
			reloadMatchSuggestions();
		} finally {
			setMatchBusy(false);
		}
	};

	const handleMarkComplete = async (item: PlannedSpendingItem) => {
		setMatchBusy(true);
		try {
			await markPlannedComplete(item.id);
			reload();
			reloadMatchSuggestions();
		} finally {
			setMatchBusy(false);
		}
	};

	const openAddModal = () => {
		setModalMode('add');
		setEditingItem(null);
		setName('');
		setAmount('');
		setAmountType('spending');
		setPlannedDate(DateTime.now().toISODate() ?? '');
		setCategoryId('');
		setNotes('');
		setModalError(null);
		setModalOpen(true);
	};

	const openEditModal = (item: PlannedSpendingItem) => {
		setModalMode('edit');
		setEditingItem(item);
		setName(item.name);
		setAmount(centsToDollars(Math.abs(item.amount_cents)));
		setAmountType(plannedAmountTypeFromCents(item.amount_cents));
		setPlannedDate(item.start_date);
		setCategoryId(item.category_id ?? '');
		setNotes(item.notes ?? '');
		setModalError(null);
		setModalOpen(true);
	};

	const closeModal = () => {
		if (submitting) {
			return;
		}
		setModalOpen(false);
		setEditingItem(null);
		setModalError(null);
	};

	const closeDeleteModal = () => {
		if (submitting) {
			return;
		}
		setDeleteTarget(null);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setModalError('Name is required');
			return;
		}
		const magnitudeCents = dollarsToCents(amount);
		if (magnitudeCents === null) {
			setModalError('Enter a non-zero amount');
			return;
		}
		const amountCents = signedPlannedAmountCents(magnitudeCents, amountType);
		if (plannedDate.length < 10) {
			setModalError('Date is required');
			return;
		}

		let categoryIdPayload: number | null = null;
		if (categoryId.length > 0) {
			const parsed = Number(categoryId);
			if (!Number.isFinite(parsed)) {
				setModalError('Invalid category');
				return;
			}
			categoryIdPayload = parsed;
		}

		const trimmedNotes = notes.trim();
		const notesPayload = trimmedNotes.length > 0 ? trimmedNotes : null;

		setSubmitting(true);
		setModalError(null);

		const result =
			modalMode === 'add'
				? await dispatch(
						createPlannedSpending({
							name: trimmedName,
							amount_cents: amountCents,
							start_date: plannedDate,
							category_id: categoryIdPayload,
							notes: notesPayload,
						})
					)
				: editingItem !== null
					? await dispatch(
							updatePlannedSpending({
								id: editingItem.id,
								payload: {
									name: trimmedName,
									amount_cents: amountCents,
									start_date: plannedDate,
									end_date: null,
									category_id: categoryIdPayload,
									notes: notesPayload,
								},
							})
						)
					: null;

		setSubmitting(false);

		if (result === null) {
			return;
		}

		const thunk =
			modalMode === 'add' ? createPlannedSpending : updatePlannedSpending;
		if (thunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save planned item'));
			return;
		}

		closeModal();
		reload();
	};

	const onConfirmDelete = async () => {
		if (deleteTarget === null) {
			return;
		}
		setSubmitting(true);
		const result = await dispatch(deletePlannedSpending(deleteTarget.id));
		setSubmitting(false);

		if (deletePlannedSpending.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to delete planned item'));
			return;
		}

		closeDeleteModal();
		reload();
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;
	const showEmpty =
		!loading && !rangeInvalid && items.length === 0 && error === null;
	const showSearchEmpty =
		!loading &&
		!rangeInvalid &&
		items.length > 0 &&
		filteredItems.length === 0 &&
		searchActive &&
		error === null;

	const displayTotalCents = searchActive ? filteredTotalCents : totalCents;

	const plannedTotalHint = (() => {
		if (searchActive) {
			return `${filteredItems.length} of ${items.length} items match search.`;
		}
		if (showAllItems) {
			return 'All planned items.';
		}
		if (showFutureOnly) {
			return 'Items dated today or later.';
		}
		return 'Items dated in this period.';
	})();

	if (initialLoading) {
		return <PageLoadingState label="Loading planned spending…" />;
	}

	if (error !== null && items.length === 0) {
		return (
			<ErrorState
				title="Could not load planned spending"
				message={error}
				onRetry={reload}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<h1 className={pageTitleClass}>Planned spending</h1>
							{isRefreshing ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Upcoming expenses you expect but haven&apos;t recorded yet. Items are
							global — the account filter does not apply here.
						</p>
					</div>
					<div className={pageActionsClass}>
						<button type="button" className={plannedBtnPrimaryClass} onClick={openAddModal}>
							<Plus className="h-3.5 w-3.5" aria-hidden />
							Add planned item
						</button>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap items-center gap-2.5">
						<AccountFilter />
						<span className="text-[10.5px] italic text-paper-muted">context only</span>

						<div className={leSegmentedClass} role="group" aria-label="Date range mode">
							{(['preset', 'custom'] as const).map((mode) => (
								<button
									key={mode}
									type="button"
									className={cn(
										leSegmentButtonClass,
										rangeMode === mode && leSegmentButtonActiveClass
									)}
									aria-pressed={rangeMode === mode}
									onClick={() => setRangeMode(mode)}
								>
									{mode === 'preset' ? 'Presets' : 'Custom'}
								</button>
							))}
						</div>

						{rangeMode === 'preset' ? (
							<PlannedPeriodFilter
								value={period}
								onChange={setPeriod}
								pending={loading}
								ariaLabel="Planned spending period"
							/>
						) : (
							<div className="flex flex-wrap items-center gap-2">
								<input
									type="date"
									aria-label="From date"
									value={customRange.start}
									onChange={(e) =>
										setCustomRange((r) => ({ ...r, start: e.target.value }))
									}
									className={cn(dateInputClass, 'h-8 px-2.5')}
								/>
								<span className="text-xs text-paper-muted">to</span>
								<input
									type="date"
									aria-label="To date"
									value={customRange.end}
									onChange={(e) =>
										setCustomRange((r) => ({ ...r, end: e.target.value }))
									}
									className={cn(dateInputClass, 'h-8 px-2.5')}
								/>
								<button
									type="button"
									onClick={() => setCustomRange(defaultCustomRange())}
									className={plannedBtnClass}
								>
									Reset
								</button>
							</div>
						)}

						{!rangeInvalid ? (
							<div
								className={cn(
									'ml-auto flex flex-col items-end gap-0.5 rounded-paper border border-paper-border',
									'bg-[color-mix(in_oklch,var(--warn)_3%,var(--surface))] px-4 py-2'
								)}
							>
								<span className="text-[10px] font-medium uppercase tracking-[0.06em] text-paper-muted">
									Planned total
								</span>
								<strong
									className={cn(
										'font-mono text-lg font-medium tabular-nums tracking-[-0.01em]',
										moneyClassForSignedCents(displayTotalCents)
									)}
								>
									{formatSignedMoneyFromCents(displayTotalCents)}
								</strong>
								<span className="max-w-[220px] text-right text-[11px] text-paper-muted">
									{plannedTotalHint}
								</span>
							</div>
						) : null}
					</div>

					{rangeInvalid ? (
						<InlineAlert variant="warning">
							Choose a valid date range (from on or before to).
						</InlineAlert>
					) : null}

					{error !== null && items.length > 0 ? (
						<InlineAlert variant="error">{error}</InlineAlert>
					) : null}

					{!rangeInvalid && items.length > 0 ? (
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search name, notes, category…"
							aria-label="Search planned items"
							className={cn(inputDarkClass, 'h-8 w-full max-w-[420px] px-2.5')}
						/>
					) : null}

					<PlannedMatchCallout
						suggestions={matchSuggestions}
						categories={activeCategories}
						busy={matchBusy}
						onLink={(suggestion) => void handleLinkMatch(suggestion)}
						onDismiss={(suggestion) => void handleDismissMatch(suggestion)}
					/>

					{showEmpty ? (
						<div className="rounded-lg border border-paper-border bg-paper-surface px-6 py-12 text-center">
							<div
								className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted"
								aria-hidden
							>
								<CalendarRange className="h-5 w-5" />
							</div>
							<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
								No planned spending
							</h3>
							<p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] leading-[1.45] text-paper-muted">
								Add upcoming expenses to track what you expect to spend in this period.
							</p>
							<div className="mt-4">
								<button
									type="button"
									className={plannedBtnPrimaryClass}
									onClick={openAddModal}
								>
									<Plus className="h-3.5 w-3.5" aria-hidden />
									Add planned item
								</button>
							</div>
						</div>
					) : null}

					{showSearchEmpty ? (
						<div className="rounded-lg border border-paper-border bg-paper-surface px-6 py-12 text-center">
							<div
								className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted"
								aria-hidden
							>
								<Search className="h-5 w-5" />
							</div>
							<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
								No planned items match your search
							</h3>
							<p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] leading-[1.45] text-paper-muted">
								Try clearing the search or using a different term.
							</p>
						</div>
					) : null}

					{!loading && !rangeInvalid && sortedItems.length > 0 ? (
						<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
							<div className="border-b border-paper-border px-4 py-3.5">
								<h2 className={panelTitleClass}>Planned items</h2>
								<p className={panelHintClass}>
									{sortedItems.length} item{sortedItems.length === 1 ? '' : 's'}
								</p>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[56rem] border-collapse text-[13px]">
									<thead>
										<tr>
											<SortHeader
												label="Name"
												active={sortKey === 'name'}
												direction={sortDir}
												onClick={() => onSort('name')}
												className="min-w-[200px] max-w-[320px]"
											/>
											<SortHeader
												label="Amount"
												active={sortKey === 'amount'}
												direction={sortDir}
												align="right"
												onClick={() => onSort('amount')}
												className="w-[110px]"
											/>
											<SortHeader
												label="Date"
												active={sortKey === 'date'}
												direction={sortDir}
												onClick={() => onSort('date')}
												className="w-[100px] whitespace-nowrap"
											/>
											<SortHeader
												label="Category"
												active={sortKey === 'category'}
												direction={sortDir}
												onClick={() => onSort('category')}
												className="min-w-[150px]"
											/>
											<th scope="col" className={cn(tableThClass, 'max-w-[200px]')}>
												Notes
											</th>
											<th scope="col" className={cn(tableThClass, 'w-[1%]')}>
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{sortedItems.map((item) => {
											const cat = categoryById(activeCategories, item.category_id);
											const hasLinks = item.linked_transactions.length > 0;
											return (
												<tr key={item.id} className="text-paper-fg">
													<td className={tableTdClass}>
														<div className="flex flex-wrap items-center gap-1.5">
															<span className="font-medium text-paper-fg">
																{item.name}
															</span>
															{suggestionByPlannedId.has(item.id) ? (
																<span className="inline-flex h-[18px] items-center rounded-full border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] px-1.5 text-[9.5px] font-medium uppercase tracking-[0.04em] text-[oklch(45%_0.12_75)]">
																	Match found
																</span>
															) : null}
														</div>
														{hasLinks ? (
															<p className="m-0 mt-1 text-[11px] text-[oklch(45%_0.12_75)]">
																{formatSignedMoneyFromCents(item.linked_total_cents)}{' '}
																of {formatPlannedMoneyFromCents(item.amount_cents)}{' '}
																linked ({item.linked_transactions.length} payment
																{item.linked_transactions.length === 1 ? '' : 's'})
															</p>
														) : null}
													</td>
													<td
														className={cn(
															tableTdClass,
															'text-right font-mono tabular-nums',
															moneyClassForPlannedCents(item.amount_cents)
														)}
													>
														{formatPlannedMoneyFromCents(item.amount_cents)}
													</td>
													<td className={cn(tableTdClass, 'whitespace-nowrap text-paper-muted')}>
														{formatPlannedDate(item.start_date)}
													</td>
													<td className={tableTdClass}>
														{cat ? (
															<CategoryPill
																name={categoryLabel(cat, activeCategories)}
																colour={cat.colour}
																variant="outline"
															/>
														) : (
															<span className="text-paper-muted">—</span>
														)}
													</td>
													<td className={cn(tableTdClass, 'max-w-[200px]')}>
														<span className="block truncate text-paper-muted">
															{item.notes ?? '—'}
														</span>
													</td>
													<td className={tableTdClass}>
														<div className="flex flex-nowrap justify-end gap-1.5">
															{hasLinks ? (
																<button
																	type="button"
																	className={plannedBtnAccentSmClass}
																	disabled={matchBusy}
																	onClick={() => void handleMarkComplete(item)}
																>
																	<Check className="h-3 w-3" aria-hidden />
																	Mark complete
																</button>
															) : null}
															<button
																type="button"
																className={plannedBtnSmClass}
																onClick={() => openLinkModal(item)}
															>
																<Link2 className="h-3 w-3" aria-hidden />
																{hasLinks ? 'Add link' : 'Link'}
															</button>
															<button
																type="button"
																className={plannedBtnSmClass}
																onClick={() => openEditModal(item)}
															>
																<Edit2 className="h-3 w-3" aria-hidden />
																Edit
															</button>
															<button
																type="button"
																className={plannedBtnDangerSmClass}
																onClick={() => setDeleteTarget(item)}
															>
																<Trash2 className="h-3 w-3" aria-hidden />
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</section>
					) : null}
				</div>
			</div>

			<dialog
				ref={itemDialogRef}
				className={plannedDialogClass}
				onCancel={(event) => {
					event.preventDefault();
					if (!submitting) {
						closeModal();
					}
				}}
				onClose={closeModal}
			>
				<form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
					<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Planned spending</span>
							<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg">
								{modalMode === 'add' ? 'Add planned item' : 'Edit planned item'}
							</h2>
							<p className="m-0 mt-1 text-[12.5px] text-paper-muted">
								When you expect this spend to occur.
							</p>
						</div>
						<button
							type="button"
							onClick={closeModal}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					<div className="flex flex-col gap-3.5 overflow-y-auto px-[22px] py-[18px]">
						{modalError !== null ? (
							<p className="m-0 rounded-paper border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_8%,var(--surface))] px-2.5 py-2 text-xs text-[color:var(--danger)]">
								{modalError}
							</p>
						) : null}

						<label className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
								Name
							</span>
							<input
								id="plannedNameInput"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
								placeholder="e.g. Holiday, Car service"
								autoFocus
								disabled={submitting}
								required
							/>
						</label>

						<div className="flex flex-col gap-1.5">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
									Amount ($)
								</span>
								<div
									className={leSegmentedClass}
									role="group"
									aria-label="Planned amount type"
								>
									{(['spending', 'income'] as const).map((type) => (
										<button
											key={type}
											type="button"
											className={cn(
												leSegmentButtonClass,
												amountType === type && leSegmentButtonActiveClass,
												amountType === type &&
													type === 'spending' &&
													'!bg-[color-mix(in_oklch,var(--danger)_16%,var(--surface))] !text-[color:var(--danger)]',
												amountType === type &&
													type === 'income' &&
													'!bg-[color-mix(in_oklch,var(--success)_16%,var(--surface))] !text-[color:var(--success)]'
											)}
											aria-pressed={amountType === type}
											onClick={() => setAmountType(type)}
											disabled={submitting}
										>
											{type === 'spending' ? 'Spending' : 'Income'}
										</button>
									))}
								</div>
							</div>
							<input
								id="plannedAmountInput"
								type="text"
								inputMode="decimal"
								value={amount}
								onChange={(e) => {
									const parsed = parsePlannedAmountInput(e.target.value, amountType);
									setAmount(parsed.value);
									setAmountType(parsed.type);
								}}
								onBlur={() => {
									const magnitudeCents = dollarsToCents(amount);
									if (magnitudeCents !== null) {
										setAmount(centsToDollars(Math.abs(magnitudeCents)));
									}
								}}
								className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono tabular-nums')}
								placeholder="0.00"
								disabled={submitting}
								required
							/>
						</div>

						<label className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
								Date
							</span>
							<input
								id="plannedDateInput"
								type="date"
								value={plannedDate}
								onChange={(e) => setPlannedDate(e.target.value)}
								className={cn(dateInputClass, 'h-8 w-full px-2.5')}
								disabled={submitting}
								required
							/>
						</label>

						<label className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
								Category (optional)
							</span>
							<CategoryPicker
								value={categoryId}
								categories={categories}
								onChange={setCategoryId}
								placeholder="None"
								searchable
								variant="form"
								disabled={submitting}
								className="w-full"
							/>
						</label>

						<label className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
								Notes (optional)
							</span>
							<textarea
								id="plannedNotesInput"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className={cn(
									inputDarkClass,
									'min-h-[70px] w-full resize-y px-2.5 py-2'
								)}
								placeholder="Any extra context"
								disabled={submitting}
							/>
						</label>
					</div>

					<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							className={plannedBtnClass}
							onClick={closeModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button type="submit" className={plannedBtnPrimaryClass} disabled={submitting}>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : modalMode === 'add' ? (
								'Add'
							) : (
								'Save'
							)}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				ref={linkDialogRef}
				className={plannedDialogWideClass}
				onCancel={(event) => {
					event.preventDefault();
					if (!matchBusy) {
						closeLinkModal();
					}
				}}
				onClose={resetLinkModal}
			>
				{linkTarget !== null ? (
					<div className="flex h-full min-h-0 flex-col">
						<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
							<div className="min-w-0">
								<span className={cn(eyebrowClass, 'mb-1 block')}>Link transactions</span>
								<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg">
									Link transactions
								</h2>
								<p className="m-0 mt-1 text-[12.5px] text-paper-muted">
									Select one or more bank transactions for &ldquo;{linkTarget.name}
									&rdquo;. Same spend/income sign, within ±30 days of{' '}
									{formatPlannedDate(linkTarget.start_date)}.
								</p>
							</div>
							<button
								type="button"
								onClick={closeLinkModal}
								disabled={matchBusy}
								className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
								aria-label="Close"
							>
								<X className="h-4 w-4" strokeWidth={2} />
							</button>
						</div>

						<div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-[22px] py-[18px]">
							<input
								type="search"
								value={linkSearch}
								onChange={(e) => setLinkSearch(e.target.value)}
								placeholder="Search transaction description…"
								aria-label="Search transactions"
								className={cn(inputDarkClass, 'h-8 w-full shrink-0 px-2.5')}
							/>
							{linkCandidatesError !== null ? (
								<InlineAlert variant="error" className="shrink-0">
									{linkCandidatesError}
								</InlineAlert>
							) : null}
							{linkCandidatesLoading ? (
								<div className="flex flex-1 items-center justify-center text-paper-muted">
									<Loader2 className="h-5 w-5 animate-spin" />
								</div>
							) : linkCandidates.length === 0 ? (
								<div className="flex flex-1 items-center justify-center">
									<p className="m-0 text-center text-sm text-paper-muted">
										No transactions found nearby. Try a different search term.
									</p>
								</div>
							) : (
								<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-paper-border">
									<table className="w-full min-w-[40rem] border-collapse text-[13px]">
										<thead>
											<tr>
												<th className={cn(tableThClass, 'w-10')} />
												<th className={tableThClass}>Date</th>
												<th className={cn(tableThClass, 'min-w-[12rem]')}>
													Description
												</th>
												<th className={tableThClass}>Account</th>
												<th className={cn(tableThClass, 'text-right')}>Amount</th>
											</tr>
										</thead>
										<tbody>
											{linkCandidates.map((candidate) => {
												const selected = selectedLinkTxnIds.includes(candidate.id);
												return (
													<tr
														key={candidate.id}
														className={cn(
															'cursor-pointer transition-colors',
															selected
																? 'bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))]'
																: 'hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]'
														)}
														onClick={() => toggleLinkSelection(candidate.id)}
													>
														<td
															className={tableTdClass}
															onClick={(e) => e.stopPropagation()}
														>
															<input
																type="checkbox"
																checked={selected}
																onChange={() => toggleLinkSelection(candidate.id)}
																className="h-4 w-4 cursor-pointer accent-paper-fg"
																aria-label={`Select transaction ${candidate.id}`}
															/>
														</td>
														<td
															className={cn(
																tableTdClass,
																'whitespace-nowrap text-paper-muted'
															)}
														>
															{formatPlannedDate(candidate.transaction_date)}
														</td>
														<td className={tableTdClass}>{candidate.description}</td>
														<td
															className={cn(
																tableTdClass,
																'whitespace-nowrap text-paper-muted'
															)}
														>
															{candidate.account_label}
														</td>
														<td
															className={cn(
																tableTdClass,
																'text-right font-mono tabular-nums',
																moneyClassForSignedCents(candidate.amount)
															)}
														>
															{formatSignedMoneyFromCents(candidate.amount)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
							<button
								type="button"
								className={plannedBtnClass}
								onClick={closeLinkModal}
								disabled={matchBusy}
							>
								Cancel
							</button>
							<button
								type="button"
								className={plannedBtnPrimaryClass}
								onClick={() => void handleConfirmManualLink()}
								disabled={matchBusy || selectedLinkTxnIds.length === 0}
							>
								{matchBusy ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : selectedLinkTxnIds.length > 1 ? (
									`Link ${selectedLinkTxnIds.length} transactions`
								) : (
									'Link selected'
								)}
							</button>
						</div>
					</div>
				) : null}
			</dialog>

			<dialog
				ref={deleteDialogRef}
				className={plannedDialogClass}
				onCancel={(event) => {
					event.preventDefault();
					if (!submitting) {
						closeDeleteModal();
					}
				}}
				onClose={closeDeleteModal}
			>
				<div className="flex min-h-0 flex-col">
					<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Planned spending</span>
							<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg">
								Delete planned item
							</h2>
							{deleteTarget !== null ? (
								<p className="m-0 mt-1 text-[12.5px] text-paper-muted">
									Remove &ldquo;{deleteTarget.name}&rdquo; from planned spending?
								</p>
							) : null}
						</div>
						<button
							type="button"
							onClick={closeDeleteModal}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							className={plannedBtnClass}
							onClick={closeDeleteModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="button"
							className={plannedBtnDangerSmClass}
							onClick={() => void onConfirmDelete()}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Delete'
							)}
						</button>
					</div>
				</div>
			</dialog>
		</PageShell>
	);
}
