import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	CalendarRange,
	Edit2,
	Link2,
	Loader2,
	Plus,
	Trash2,
} from 'lucide-react';
import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPill } from '@/components/CategoryPill';
import { PlannedPeriodFilter } from '@/components/dashboard/PlannedPeriodFilter';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SearchInput } from '@/components/layout/SearchInput';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { StatCard } from '@/components/layout/StatCard';
import {
	buttonAccentClass,
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	glassCardClass,
	inputDarkClass,
	dateInputClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import {
	PLANNED_CUSTOM_RANGE_STORAGE_KEY,
	PLANNED_PERIOD_STORAGE_KEY,
	PLANNED_RANGE_MODE_STORAGE_KEY,
	plannedPeriodDateRange,
	readStoredPlannedPeriod,
	type PlannedPeriod,
} from '@/components/dashboard/period';
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

const PLANNED_FORM_ID = 'planned-spending-form';

const formatMoney = (cents: number) => {
	const abs = Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${cents < 0 ? '-' : ''}$${abs}`;
};

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

function matchReasonLabel(reason: string): string {
	switch (reason) {
		case 'exact_amount':
			return 'Same amount';
		case 'amount_within_tolerance':
			return 'Close amount';
		case 'exact_date':
			return 'Same date';
		case 'date_within_tolerance':
			return 'Close date';
		case 'category_match':
			return 'Category matches';
		case 'description_match':
			return 'Description matches';
		case 'partial_payment':
			return 'Partial payment';
		default:
			return reason.replace(/_/g, ' ');
	}
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

function formatVarianceLabel(suggestion: PlannedMatchSuggestion): string {
	const parts: string[] = [];
	if (suggestion.amount_variance_cents > 0) {
		parts.push(`${formatMoney(suggestion.amount_variance_cents)} off amount`);
	}
	if (suggestion.date_variance_days > 0) {
		const days = suggestion.date_variance_days;
		parts.push(`${days} day${days === 1 ? '' : 's'} off date`);
	}
	return parts.length > 0 ? parts.join(' · ') : 'Exact amount and date';
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
			<div className="shrink-0 space-y-3 border-b border-paper-border p-4">
				<PageHeader
					title="Planned spending"
					subtitle="Upcoming expenses you expect but have not recorded yet. Items are global — the account filter does not apply here."
					icon={<CalendarRange className="h-6 w-6 text-secondary-default" />}
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
					actions={
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={openAddModal}
						>
							<Plus size="1rem" className="inline-block mr-1" />
							Add planned item
						</button>
					}
				/>

				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-h-9 flex-wrap items-center gap-3">
						<AccountFilter />
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
										setCustomRange((r) => ({
											...r,
											start: e.target.value,
										}))
									}
									className={cn(dateInputClass, 'px-2 py-1.5')}
								/>
								<span className="text-sm text-paper-muted">–</span>
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
									className={cn(dateInputClass, 'px-2 py-1.5')}
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
						<StatCard
							label="Planned total"
							value={formatMoney(searchActive ? filteredTotalCents : totalCents)}
							valueClassName={
								(searchActive ? filteredTotalCents : totalCents) >= 0
									? 'text-green-300'
									: 'text-red-300'
							}
							hint={plannedTotalHint}
							align="right"
						/>
					) : null}
				</div>

				{!rangeInvalid && items.length > 0 ? (
					<SearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search name, notes, category…"
						className="w-full lg:max-w-md"
					/>
				) : null}

				{rangeInvalid ? (
					<InlineAlert variant="warning">
						Choose a valid date range (from on or before to).
					</InlineAlert>
				) : null}

				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}
			</div>

			<div className="min-h-0 flex-grow overflow-auto p-4">
			{matchSuggestions.length > 0 ? (
				<div className="mb-4 space-y-3 rounded-lg border border-amber-500/25 bg-amber-950/20 p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="flex items-center gap-2 text-sm font-medium text-amber-100">
								<ActionableBadge />
								<span>
									{matchSuggestions.length} planned item
									{matchSuggestions.length === 1 ? '' : 's'} may match imported
									transactions
								</span>
							</p>
							<p className="mt-1 text-xs text-amber-100/70">
								Review each pair and link manually — nothing is applied until you
								confirm.
							</p>
						</div>
					</div>
					<div className="space-y-3">
						{matchSuggestions.map((suggestion) => {
							const plannedCat = categoryById(
								activeCategories,
								suggestion.planned.category_id
							);
							const txnCat =
								suggestion.transaction.category_id === null
									? null
									: categoryById(
											activeCategories,
											String(suggestion.transaction.category_id)
										);
							return (
								<div
									key={`${suggestion.planned.id}-${suggestion.transaction.id}`}
									className="rounded border border-paper-border bg-black/20 p-3"
								>
									<div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
										<div className="min-w-0">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
												Planned
											</p>
											<p className="font-medium text-paper-fg">
												{suggestion.planned.name}
											</p>
											<p className="mt-1 text-xs text-paper-muted">
												{formatMoney(suggestion.planned.amount_cents)} ·{' '}
												{formatPlannedDate(suggestion.planned.start_date)}
												{plannedCat
													? ` · ${categoryLabel(plannedCat, activeCategories)}`
													: ''}
											</p>
											{suggestion.planned.notes ? (
												<p className="mt-1 truncate text-xs text-paper-muted">
													{suggestion.planned.notes}
												</p>
											) : null}
										</div>
										<div className="hidden justify-center text-paper-muted lg:flex">
											<Link2 size="1.1rem" aria-hidden />
										</div>
										<div className="min-w-0">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
												Bank transaction
											</p>
											<p className="truncate font-medium text-paper-fg">
												{suggestion.transaction.description}
											</p>
											<p className="mt-1 text-xs text-paper-muted">
												{formatMoney(suggestion.transaction.amount)} ·{' '}
												{formatPlannedDate(suggestion.transaction.transaction_date)}{' '}
												· {suggestion.transaction.account_label}
												{txnCat
													? ` · ${categoryLabel(txnCat, activeCategories)}`
													: ''}
											</p>
										</div>
									</div>
									<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-border pt-3">
										<div className="flex flex-wrap gap-1.5">
											<span className="rounded bg-paper px-2 py-0.5 text-[10px] text-paper-muted">
												{formatVarianceLabel(suggestion)}
											</span>
											{suggestion.reasons.slice(0, 3).map((reason) => (
												<span
													key={reason}
													className="rounded bg-paper px-2 py-0.5 text-[10px] text-paper-muted"
												>
													{matchReasonLabel(reason)}
												</span>
											))}
										</div>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												className={buttonAccentClass}
												disabled={matchBusy}
												onClick={() => void handleLinkMatch(suggestion)}
											>
												Add payment link
											</button>
											<button
												type="button"
												className={buttonOutlineClass}
												disabled={matchBusy}
												onClick={() => void handleDismissMatch(suggestion)}
											>
												Not a match
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			) : null}
			{showEmpty ? (
				<EmptyState
					icon={CalendarRange}
					title="No planned spending"
					description="Add upcoming expenses to track what you expect to spend in this period."
					action={
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={openAddModal}
						>
							<Plus size="1rem" className="inline-block mr-1" />
							Add planned item
						</button>
					}
				/>
			) : null}

			{showSearchEmpty ? (
				<EmptyState
					icon={CalendarRange}
					title="No planned items match your search"
					description="Try clearing the search or using a different term."
				/>
			) : null}

			{!loading && !rangeInvalid && filteredItems.length > 0 ? (
				<div className={glassCardClass}>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-paper-border text-left text-paper-muted">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium text-right">Amount</th>
								<th className="px-4 py-3 font-medium">Date</th>
								<th className="px-4 py-3 font-medium">Category</th>
								<th className="px-4 py-3 font-medium">Notes</th>
								<th className="px-4 py-3 font-medium" />
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item) => {
								const cat = categoryById(activeCategories, item.category_id);
								const hasLinks = item.linked_transactions.length > 0;
								return (
									<tr
										key={item.id}
										className="border-b border-paper-border text-paper-fg"
									>
										<td className="px-4 py-3 font-medium">
											<span className="inline-flex items-center gap-2">
												<span>{item.name}</span>
												{suggestionByPlannedId.has(item.id) ? (
													<span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
														Match found
													</span>
												) : null}
											</span>
											{hasLinks ? (
												<p className="mt-1 text-xs text-amber-200/80">
													{formatMoney(item.linked_total_cents)} of{' '}
													{formatMoney(item.amount_cents)} linked (
													{item.linked_transactions.length} payment
													{item.linked_transactions.length === 1 ? '' : 's'})
												</p>
											) : null}
										</td>
										<td
											className={cn(
												'px-4 py-3 text-right font-mono tabular-nums',
												item.amount_cents >= 0
													? 'text-green-400'
													: 'text-red-400'
											)}
										>
											{formatMoney(item.amount_cents)}
										</td>
										<td className="px-4 py-3 text-paper-muted">
											{formatPlannedDate(item.start_date)}
										</td>
										<td className="px-4 py-3">
											{cat ? (
												<CategoryPill
													name={categoryLabel(cat, activeCategories)}
													colour={cat.colour}
												/>
											) : (
												<span className="text-paper-muted">—</span>
											)}
										</td>
										<td className="max-w-[14rem] truncate px-4 py-3 text-paper-muted">
											{item.notes ?? '—'}
										</td>
										<td className="px-4 py-3 text-right whitespace-nowrap">
											{hasLinks ? (
												<button
													type="button"
													className={cn(buttonAccentClass, 'mr-2')}
													disabled={matchBusy}
													onClick={() => void handleMarkComplete(item)}
												>
													Mark complete
												</button>
											) : null}
											<button
												type="button"
												className={cn(buttonOutlineClass, 'mr-2')}
												onClick={() => openLinkModal(item)}
											>
												<Link2 size="1rem" className="inline-block mr-1" />
												{hasLinks ? 'Add link' : 'Link'}
											</button>
											<button
												type="button"
												className={cn(buttonOutlineClass, 'mr-2')}
												onClick={() => openEditModal(item)}
											>
												<Edit2 size="1rem" className="inline-block mr-1" />
												Edit
											</button>
											<button
												type="button"
												className={buttonDangerClass}
												onClick={() => setDeleteTarget(item)}
											>
												<Trash2 size="1rem" className="inline-block mr-1" />
												Delete
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
			</div>

			<Modal
				open={modalOpen}
				onClose={closeModal}
				closeDisabled={submitting}
				title={modalMode === 'add' ? 'Add planned item' : 'Edit planned item'}
				description="When you expect this spend to occur."
				size="md"
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							form={PLANNED_FORM_ID}
							className={buttonPrimaryClass}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : modalMode === 'add' ? (
								'Add'
							) : (
								'Save'
							)}
						</button>
					</div>
				}
			>
				<form id={PLANNED_FORM_ID} onSubmit={onSubmit}>
					{modalError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{modalError}
						</InlineAlert>
					) : null}

					<div className="space-y-4">
						<div>
							<label
								htmlFor="plannedNameInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Name
							</label>
							<input
								id="plannedNameInput"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								placeholder="e.g. Holiday, Car service"
								autoFocus
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
								<label
									htmlFor="plannedAmountInput"
									className="text-sm font-medium text-paper-fg"
								>
									Amount ($)
								</label>
								<SegmentedControl
									ariaLabel="Planned amount type"
									value={amountType}
									onChange={setAmountType}
									options={[
										{
											value: 'spending',
											label: 'Spending',
											activeClassName:
												'bg-red-500/20 text-red-400 shadow-sm',
											inactiveClassName:
												'text-paper-muted hover:bg-red-500/10 hover:text-red-300',
										},
										{
											value: 'income',
											label: 'Income',
											activeClassName:
												'bg-green-500/20 text-green-400 shadow-sm',
											inactiveClassName:
												'text-paper-muted hover:bg-green-500/10 hover:text-green-300',
										},
									]}
								/>
							</div>
							<input
								id="plannedAmountInput"
								type="text"
								inputMode="decimal"
								value={amount}
								onChange={(e) => {
									const parsed = parsePlannedAmountInput(
										e.target.value,
										amountType
									);
									setAmount(parsed.value);
									setAmountType(parsed.type);
								}}
								onBlur={() => {
									const magnitudeCents = dollarsToCents(amount);
									if (magnitudeCents !== null) {
										setAmount(
											centsToDollars(Math.abs(magnitudeCents))
										);
									}
								}}
								className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
								placeholder="0.00"
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<label
								htmlFor="plannedDateInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Date
							</label>
							<input
								id="plannedDateInput"
								type="date"
								value={plannedDate}
								onChange={(e) => setPlannedDate(e.target.value)}
								className={cn(dateInputClass, 'w-full px-3 py-2')}
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<label
								htmlFor="plannedCategoryInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Category (optional)
							</label>
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
						</div>

						<div>
							<label
								htmlFor="plannedNotesInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Notes (optional)
							</label>
							<textarea
								id="plannedNotesInput"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className={cn(
									inputDarkClass,
									'min-h-[4.5rem] w-full resize-y px-3 py-2'
								)}
								placeholder="Any extra context"
								disabled={submitting}
							/>
						</div>
					</div>
				</form>
			</Modal>

			<Modal
				open={linkTarget !== null}
				onClose={closeLinkModal}
				closeDisabled={matchBusy}
				title="Link transactions"
				description={
					linkTarget !== null
						? `Select one or more bank transactions for “${linkTarget.name}”. Same spend/income sign, within ±30 days of ${formatPlannedDate(linkTarget.start_date)}.`
						: undefined
				}
				size="xl"
				fillViewport
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeLinkModal}
							disabled={matchBusy}
						>
							Cancel
						</button>
						<button
							type="button"
							className={buttonAccentClass}
							onClick={() => void handleConfirmManualLink()}
							disabled={matchBusy || selectedLinkTxnIds.length === 0}
						>
							{matchBusy ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : selectedLinkTxnIds.length > 1 ? (
								`Link ${selectedLinkTxnIds.length} transactions`
							) : (
								'Link selected'
							)}
						</button>
					</div>
				}
			>
				{linkTarget !== null ? (
					<div className="flex min-h-0 flex-1 flex-col gap-4">
						<SearchInput
							value={linkSearch}
							onChange={setLinkSearch}
							placeholder="Search transaction description…"
							className="w-full shrink-0"
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
								<p className="text-center text-sm text-paper-muted">
									No transactions found nearby. Try a different search term.
								</p>
							</div>
						) : (
							<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-paper-border">
								<table className="w-full min-w-[40rem] text-sm">
									<thead className="sticky top-0 z-10 bg-paper-surface backdrop-blur-sm">
										<tr className="border-b border-paper-border text-left text-xs uppercase tracking-wide text-paper-muted">
											<th className="w-10 px-3 py-2.5 font-medium" />
											<th className="whitespace-nowrap px-3 py-2.5 font-medium">
												Date
											</th>
											<th className="min-w-[12rem] px-3 py-2.5 font-medium">
												Description
											</th>
											<th className="whitespace-nowrap px-3 py-2.5 font-medium">
												Account
											</th>
											<th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
												Amount
											</th>
										</tr>
									</thead>
									<tbody>
										{linkCandidates.map((candidate) => {
											const selected = selectedLinkTxnIds.includes(candidate.id);
											return (
												<tr
													key={candidate.id}
													className={cn(
														'cursor-pointer border-t border-paper-border transition-colors',
														selected
															? 'bg-secondary-default/15'
															: 'hover:bg-paper'
													)}
													onClick={() => toggleLinkSelection(candidate.id)}
												>
													<td
														className="px-3 py-2.5 text-center align-middle"
														onClick={(e) => e.stopPropagation()}
													>
														<input
															type="checkbox"
															checked={selected}
															onChange={() =>
																toggleLinkSelection(candidate.id)
															}
															className="form-checkbox h-4 w-4 rounded text-secondary-default"
															aria-label={`Select transaction ${candidate.id}`}
														/>
													</td>
													<td className="whitespace-nowrap px-3 py-2.5 align-middle text-paper-muted">
														{formatPlannedDate(candidate.transaction_date)}
													</td>
													<td className="px-3 py-2.5 align-middle text-paper-fg">
														{candidate.description}
													</td>
													<td className="whitespace-nowrap px-3 py-2.5 align-middle text-paper-muted">
														{candidate.account_label}
													</td>
													<td
														className={cn(
															'whitespace-nowrap px-3 py-2.5 text-right align-middle font-mono tabular-nums',
															candidate.amount >= 0
																? 'text-green-400'
																: 'text-red-400'
														)}
													>
														{formatMoney(candidate.amount)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				) : null}
			</Modal>

			<Modal
				open={deleteTarget !== null}
				onClose={closeDeleteModal}
				closeDisabled={submitting}
				title="Delete planned item"
				description={
					deleteTarget !== null
						? `Remove “${deleteTarget.name}” from planned spending?`
						: undefined
				}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeDeleteModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="button"
							className={buttonDangerClass}
							onClick={() => void onConfirmDelete()}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : (
								'Delete'
							)}
						</button>
					</div>
				}
			/>
		</PageShell>
	);
}
