import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { CalendarRange, Check, Edit2, Link2, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { PlannedPeriodFilter } from '@/components/dashboard/PlannedPeriodFilter';
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
	selectDarkClass,
} from '@/components/layout/tokens';
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
import { cn } from '@/lib/utils/cn';
import {
	formatPlannedMoneyFromCents,
	formatSignedMoneyFromCents,
	moneyClassForPlannedCents,
	moneyClassForSignedCents,
} from '@/lib/utils/moneySemantics';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllAccounts } from '@/store/thunks/account.get.all';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getLiabilities } from '@/store/thunks/liabilities';
import {
	createPlannedSpending,
	deletePlannedSpending,
	getPlannedSpending,
	updatePlannedSpending,
} from '@/store/thunks/plannedSpending';
import { accountDisplayLabel } from '@/types/account';
import {
	bpsToPercentText,
	parsePercentToBps,
	type Liability,
} from '@/types/liabilities';
import {
	centsToDollars,
	dollarsToCents,
	fetchPlannedLinkCandidates,
	fetchPlannedMatchSuggestions,
	markPlannedComplete,
	parsePlannedAmountInput,
	plannedAmountTypeFromCents,
	resolvePlannedMatch,
	signedPlannedAmountCents,
	type PlanKind,
	type PlannedAmountType,
	type PlannedMatchSuggestion,
	type PlannedMatchTransaction,
	type PlannedSpendingItem,
} from '@/types/plannedSpending';

type PlannedRangeMode = 'preset' | 'custom';
type ModalMode = 'add' | 'edit';
type KindFilter = 'all' | 'cashflow' | 'loans';
type SortKey = 'kind' | 'name' | 'amount' | 'date' | 'liability';
type SortDir = 'asc' | 'desc';

const buttonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';
const smallButtonClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-paper-border bg-paper-surface px-2 text-xs font-medium text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:opacity-50';
const accentButtonClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-[color-mix(in_oklch,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))] px-2.5 text-xs font-medium text-secondary-default disabled:opacity-50';
const dangerButtonClass =
	'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-paper border border-[color-mix(in_oklch,var(--danger)_38%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_6%,var(--surface))] px-2 text-xs font-medium text-[color:var(--danger)] disabled:opacity-50';
const dialogClass =
	'fixed inset-0 m-auto h-fit w-[min(520px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';
const wideDialogClass =
	'fixed inset-0 m-auto h-[min(720px,calc(100vh-48px))] w-[min(760px,calc(100vw-32px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';
const fieldClass = 'flex flex-col gap-1.5';
const fieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted';

const PLAN_KIND_OPTIONS: { value: PlanKind; title: string; subtitle: string }[] = [
	{ value: 'cashflow', title: 'Cashflow', subtitle: 'Dated spend or income' },
	{ value: 'loan_redraw', title: 'Loan redraw', subtitle: 'Credit account · raise loan' },
	{ value: 'loan_refinance', title: 'Refinance', subtitle: 'Settle old · new terms' },
	{
		value: 'loan_repayment_change',
		title: 'Repayment change',
		subtitle: 'New repayment or rate',
	},
];
const RANGE_MODES: PlannedRangeMode[] = ['preset', 'custom'];
const AMOUNT_TYPES: PlannedAmountType[] = ['spending', 'income'];

function isPlanKind(value: string | null): value is PlanKind {
	return (
		value === 'cashflow' ||
		value === 'loan_redraw' ||
		value === 'loan_refinance' ||
		value === 'loan_repayment_change'
	);
}

function isLoanKind(kind: PlanKind): boolean {
	return kind !== 'cashflow';
}

function formatDate(date: string): string {
	return DateTime.fromISO(date).toFormat('d MMM yyyy');
}

function defaultCustomRange(): { start: string; end: string } {
	return {
		start: DateTime.now().toISODate() ?? '',
		end: DateTime.now().endOf('year').toISODate() ?? '',
	};
}

function readRangeMode(): PlannedRangeMode {
	return localStorage.getItem(PLANNED_RANGE_MODE_STORAGE_KEY) === 'custom'
		? 'custom'
		: 'preset';
}

function readCustomRange(): { start: string; end: string } {
	try {
		const raw = localStorage.getItem(PLANNED_CUSTOM_RANGE_STORAGE_KEY);
		if (raw !== null) {
			const parsed: unknown = JSON.parse(raw);
			if (parsed !== null && typeof parsed === 'object') {
				const start = Reflect.get(parsed, 'start');
				const end = Reflect.get(parsed, 'end');
				if (typeof start === 'string' && typeof end === 'string') {
					return { start, end };
				}
			}
		}
	} catch {
		return defaultCustomRange();
	}
	return defaultCustomRange();
}

function categoryById(categories: Category[], id: string | null): Category | null {
	return id === null ? null : categories.find((category) => category.id === id) ?? null;
}

function categoryLabel(category: Category, categories: Category[]): string {
	const parent = category.parent_category_id
		? categories.find((entry) => entry.id === category.parent_category_id)
		: null;
	return parent ? `${parent.name} › ${category.name}` : category.name;
}

function liabilityById(liabilities: Liability[], id: string | null): Liability | null {
	return id === null ? null : liabilities.find((liability) => liability.id === id) ?? null;
}

function kindLabel(kind: PlanKind): string {
	switch (kind) {
		case 'loan_redraw':
			return 'Redraw';
		case 'loan_refinance':
			return 'Refinance';
		case 'loan_repayment_change':
			return 'Repayment';
		default:
			return 'Cashflow';
	}
}

function kindBadgeClass(kind: PlanKind): string {
	const base =
		'inline-flex h-[18px] items-center whitespace-nowrap rounded-[4px] border px-[7px] text-[10px] font-semibold tracking-[0.02em]';
	switch (kind) {
		case 'loan_redraw':
			return cn(
				base,
				'border-[color-mix(in_oklch,var(--warn)_36%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] text-[oklch(42%_0.1_75)]'
			);
		case 'loan_refinance':
			return cn(
				base,
				'border-[color-mix(in_oklch,var(--fg)_18%,var(--border))] bg-[color-mix(in_oklch,var(--fg)_4%,var(--surface))] text-paper-fg'
			);
		case 'loan_repayment_change':
			return cn(
				base,
				'border-[color-mix(in_oklch,var(--success)_32%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[color-mix(in_oklch,var(--success)_75%,var(--fg))]'
			);
		default:
			return cn(
				base,
				'border-[color-mix(in_oklch,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))] text-[color-mix(in_oklch,var(--accent)_70%,var(--fg))]'
			);
	}
}

function parseOptionalId(value: string): number | null {
	if (value.length === 0) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function displayAmount(item: PlannedSpendingItem): number {
	return item.plan_kind === 'loan_repayment_change'
		? item.repayment_cents ?? item.amount_cents
		: item.amount_cents;
}

function formatMoneyMagnitude(cents: number): string {
	return `$${Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export default function PlanningPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const dispatch = useAppDispatch();
	const { items, totalCents, loading, error } = useAppSelector(
		(state) => state.PlannedReducer
	);
	const { categories } = useAppSelector((state) => state.CategoryReducer);
	const { accounts } = useAppSelector((state) => state.AccountReducer);
	const { items: liabilities } = useAppSelector((state) => state.LiabilitiesReducer);

	const [rangeMode, setRangeMode] = useState<PlannedRangeMode>(readRangeMode);
	const [period, setPeriod] = useState<PlannedPeriod>(readStoredPlannedPeriod);
	const [customRange, setCustomRange] = useState(readCustomRange);
	const [kindFilter, setKindFilter] = useState<KindFilter>('all');
	const [accountFilter, setAccountFilter] = useState('all');
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounce(search, 300);
	const [sortKey, setSortKey] = useState<SortKey>('date');
	const [sortDir, setSortDir] = useState<SortDir>('asc');

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingItem, setEditingItem] = useState<PlannedSpendingItem | null>(null);
	const [planKind, setPlanKind] = useState<PlanKind>('cashflow');
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [amountType, setAmountType] = useState<PlannedAmountType>('spending');
	const [plannedDate, setPlannedDate] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [liabilityId, setLiabilityId] = useState('');
	const [destinationAccountId, setDestinationAccountId] = useState('');
	const [newLiabilityName, setNewLiabilityName] = useState('');
	const [ratePercent, setRatePercent] = useState('');
	const [repayment, setRepayment] = useState('');
	const [notes, setNotes] = useState('');
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [matchSuggestions, setMatchSuggestions] = useState<PlannedMatchSuggestion[]>([]);
	const [matchBusy, setMatchBusy] = useState(false);
	const [linkTarget, setLinkTarget] = useState<PlannedSpendingItem | null>(null);
	const [linkSearch, setLinkSearch] = useState('');
	const debouncedLinkSearch = useDebounce(linkSearch, 300);
	const [linkCandidates, setLinkCandidates] = useState<PlannedMatchTransaction[]>([]);
	const [linkLoading, setLinkLoading] = useState(false);
	const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);

	const activeCategories = useMemo(
		() => categories.filter((category) => !category.deleted_at),
		[categories]
	);
	const activeAccounts = useMemo(
		() => accounts.filter((account) => account.deleted_at === null),
		[accounts]
	);
	const activeLiabilities = useMemo(
		() => liabilities.filter((liability) => liability.deleted_at === null),
		[liabilities]
	);

	const effectiveRange = useMemo(() => {
		if (rangeMode === 'custom') {
			return customRange;
		}
		const preset = plannedPeriodDateRange(period);
		return { start: preset.start ?? '', end: preset.end ?? '' };
	}, [customRange, period, rangeMode]);
	const showAll = rangeMode === 'preset' && period === 'all';
	const showFuture = rangeMode === 'preset' && period === 'future';
	const rangeInvalid =
		!showAll &&
		(effectiveRange.start.length < 10 ||
			(!showFuture &&
				(effectiveRange.end.length < 10 ||
					effectiveRange.start > effectiveRange.end)));

	const reloadMatches = useCallback(() => {
		void fetchPlannedMatchSuggestions()
			.then((suggestions) =>
				setMatchSuggestions(
					suggestions.filter((suggestion) => suggestion.planned.plan_kind === 'cashflow')
				)
			)
			.catch(() => setMatchSuggestions([]));
		notifyPlannedMatchesChanged();
	}, []);

	const reload = useCallback(() => {
		if (rangeInvalid) {
			return;
		}
		void dispatch(
			getPlannedSpending(
				showAll
					? {}
					: showFuture
						? { from: effectiveRange.start }
						: { from: effectiveRange.start, to: effectiveRange.end }
			)
		);
	}, [dispatch, effectiveRange.end, effectiveRange.start, rangeInvalid, showAll, showFuture]);

	useEffect(() => {
		void dispatch(getAllCategories({ withCounts: false }));
		void dispatch(getAllAccounts());
		void dispatch(getLiabilities());
		reloadMatches();
	}, [dispatch, reloadMatches]);

	useEffect(() => {
		reload();
	}, [reload]);

	useEffect(() => {
		localStorage.setItem(PLANNED_RANGE_MODE_STORAGE_KEY, rangeMode);
		if (rangeMode === 'preset') {
			localStorage.setItem(PLANNED_PERIOD_STORAGE_KEY, period);
		} else {
			localStorage.setItem(PLANNED_CUSTOM_RANGE_STORAGE_KEY, JSON.stringify(customRange));
		}
	}, [customRange, period, rangeMode]);

	const resetForm = useCallback((kind: PlanKind) => {
		setModalMode('add');
		setEditingItem(null);
		setPlanKind(kind);
		setName('');
		setAmount('');
		setAmountType('spending');
		setPlannedDate(DateTime.now().toISODate() ?? '');
		setCategoryId('');
		setLiabilityId(activeLiabilities[0]?.id ?? '');
		setDestinationAccountId(activeAccounts[0]?.id ?? '');
		setNewLiabilityName('');
		setRatePercent('');
		setRepayment('');
		setNotes('');
		setModalError(null);
		setModalOpen(true);
	}, [activeAccounts, activeLiabilities]);

	useEffect(() => {
		const add = searchParams.get('add');
		if (add !== '1' && !isPlanKind(add)) {
			return;
		}
		resetForm(isPlanKind(add) ? add : 'cashflow');
		const next = new URLSearchParams(searchParams);
		next.delete('add');
		setSearchParams(next, { replace: true });
	}, [resetForm, searchParams, setSearchParams]);

	useEffect(() => {
		if (linkTarget === null || linkTarget.plan_kind !== 'cashflow') {
			return;
		}
		let cancelled = false;
		setLinkLoading(true);
		void fetchPlannedLinkCandidates(linkTarget.id, debouncedLinkSearch)
			.then((candidates) => {
				if (!cancelled) {
					setLinkCandidates(candidates);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLinkCandidates([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLinkLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [debouncedLinkSearch, linkTarget]);

	const visibleItems = useMemo(() => {
		const query = debouncedSearch.trim().toLowerCase();
		return items.filter((item) => {
			if (kindFilter === 'cashflow' && item.plan_kind !== 'cashflow') {
				return false;
			}
			if (kindFilter === 'loans' && !isLoanKind(item.plan_kind)) {
				return false;
			}
			if (
				kindFilter === 'loans' &&
				accountFilter !== 'all' &&
				item.plan_kind === 'loan_redraw' &&
				item.financial_account_id !== accountFilter
			) {
				return false;
			}
			if (query.length === 0) {
				return true;
			}
			const category = categoryById(activeCategories, item.category_id);
			const liability = liabilityById(activeLiabilities, item.liability_id);
			return [
				item.name,
				item.notes ?? '',
				item.new_liability_name ?? '',
				kindLabel(item.plan_kind),
				category ? categoryLabel(category, activeCategories) : '',
				liability?.name ?? '',
			].some((value) => value.toLowerCase().includes(query));
		});
	}, [
		accountFilter,
		activeCategories,
		activeLiabilities,
		debouncedSearch,
		items,
		kindFilter,
	]);

	const sortedItems = useMemo(() => {
		const multiplier = sortDir === 'asc' ? 1 : -1;
		return [...visibleItems].sort((left, right) => {
			let comparison = 0;
			switch (sortKey) {
				case 'kind':
					comparison = kindLabel(left.plan_kind).localeCompare(kindLabel(right.plan_kind));
					break;
				case 'name':
					comparison = left.name.localeCompare(right.name);
					break;
				case 'amount':
					comparison = displayAmount(left) - displayAmount(right);
					break;
				case 'liability':
					comparison = (liabilityById(activeLiabilities, left.liability_id)?.name ?? '').localeCompare(
						liabilityById(activeLiabilities, right.liability_id)?.name ?? ''
					);
					break;
				default:
					comparison = left.start_date.localeCompare(right.start_date);
			}
			return comparison * multiplier;
		});
	}, [activeLiabilities, sortDir, sortKey, visibleItems]);

	const visibleCashflowTotal = useMemo(
		() =>
			visibleItems
				.filter((item) => item.plan_kind === 'cashflow')
				.reduce((sum, item) => sum + item.amount_cents, 0),
		[visibleItems]
	);
	const cashflowCount = visibleItems.filter((item) => item.plan_kind === 'cashflow').length;
	const loanCount = visibleItems.length - cashflowCount;
	const searchActive = debouncedSearch.trim().length > 0;
	const displayTotal =
		kindFilter === 'all' && !searchActive && accountFilter === 'all'
			? totalCents
			: visibleCashflowTotal;
	const visibleSuggestions =
		kindFilter === 'loans'
			? []
			: matchSuggestions.filter((suggestion) =>
					visibleItems.some((item) => item.id === suggestion.planned.id)
				);

	const onSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(key);
			setSortDir(key === 'amount' ? 'desc' : 'asc');
		}
	};

	const openEdit = (item: PlannedSpendingItem) => {
		setModalMode('edit');
		setEditingItem(item);
		setPlanKind(item.plan_kind);
		setName(item.name);
		setAmount(centsToDollars(Math.abs(item.amount_cents)));
		setAmountType(plannedAmountTypeFromCents(item.amount_cents));
		setPlannedDate(item.start_date);
		setCategoryId(item.category_id ?? '');
		setLiabilityId(item.liability_id ?? '');
		setDestinationAccountId(item.financial_account_id ?? '');
		setNewLiabilityName(item.new_liability_name ?? '');
		setRatePercent(
			item.interest_rate_bps === null ? '' : bpsToPercentText(item.interest_rate_bps)
		);
		setRepayment(
			item.repayment_cents === null ? '' : centsToDollars(item.repayment_cents)
		);
		setNotes(item.notes ?? '');
		setModalError(null);
		setModalOpen(true);
	};

	const closeModal = () => {
		if (!submitting) {
			setModalOpen(false);
			setEditingItem(null);
			setModalError(null);
		}
	};

	const selectedLiability = liabilityById(activeLiabilities, liabilityId);
	const selectedAccount = activeAccounts.find((account) => account.id === destinationAccountId);
	const impactPreview = (() => {
		if (planKind === 'cashflow') {
			return null;
		}
		const liabilityName = selectedLiability?.name ?? 'Selected liability';
		if (planKind === 'loan_redraw') {
			const cents = dollarsToCents(amount);
			const amountText = cents === null ? 'amount' : formatMoneyMagnitude(cents);
			return {
				body: `${selectedAccount ? accountDisplayLabel(selectedAccount) : 'Destination account'} +${amountText} · ${liabilityName} +${amountText}`,
				note: 'Balance sheet move only — not income, not a cashflow spend.',
			};
		}
		if (planKind === 'loan_refinance') {
			return {
				body: `Close ${liabilityName} · open ${newLiabilityName.trim() || 'New facility'}`,
				note: `${ratePercent || 'new rate'}${ratePercent ? '%' : ''} · ${
					repayment ? `${formatMoneyMagnitude(dollarsToCents(repayment) ?? 0)}/mo` : 'new repayment'
				} · from ${plannedDate ? formatDate(plannedDate) : 'date'}`,
			};
		}
		return {
			body: `${liabilityName} · new repayment / rate`,
			note: `${ratePercent ? `Rate ${ratePercent}% · ` : ''}from ${
				plannedDate ? formatDate(plannedDate) : 'date'
			}`,
		};
	})();

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName || plannedDate.length < 10) {
			setModalError(!trimmedName ? 'Name is required' : 'Date is required');
			return;
		}
		const amountCents = dollarsToCents(amount);
		const repaymentCents = dollarsToCents(repayment);
		const rateBps = parsePercentToBps(ratePercent);
		const liabilityIdPayload = parseOptionalId(liabilityId);
		const accountIdPayload = parseOptionalId(destinationAccountId);
		if (planKind === 'cashflow' && amountCents === null) {
			setModalError('Enter a non-zero amount');
			return;
		}
		if (planKind === 'loan_redraw' && (amountCents === null || liabilityIdPayload === null || accountIdPayload === null)) {
			setModalError('Enter an amount, liability, and destination account');
			return;
		}
		if (
			planKind === 'loan_refinance' &&
			(liabilityIdPayload === null ||
				newLiabilityName.trim().length === 0 ||
				rateBps === null ||
				repaymentCents === null)
		) {
			setModalError('Choose a liability and enter the new name, rate, and repayment');
			return;
		}
		if (
			planKind === 'loan_repayment_change' &&
			(liabilityIdPayload === null || repaymentCents === null)
		) {
			setModalError('Choose a liability and enter the new repayment');
			return;
		}
		const categoryPayload = parseOptionalId(categoryId);
		const notesPayload = notes.trim() || null;
		const payload = {
			plan_kind: planKind,
			name: trimmedName,
			amount_cents:
				planKind === 'cashflow'
					? signedPlannedAmountCents(amountCents ?? 0, amountType)
					: planKind === 'loan_refinance'
						? selectedLiability?.balance_cents ?? 0
						: planKind === 'loan_repayment_change'
							? repaymentCents ?? 0
							: Math.abs(amountCents ?? 0),
			start_date: plannedDate,
			end_date: null,
			category_id: planKind === 'cashflow' ? categoryPayload : null,
			liability_id: planKind === 'cashflow' ? null : liabilityIdPayload,
			financial_account_id: planKind === 'loan_redraw' ? accountIdPayload : null,
			new_liability_name:
				planKind === 'loan_refinance' ? newLiabilityName.trim() : null,
			interest_rate_bps:
				planKind === 'loan_refinance' || planKind === 'loan_repayment_change'
					? rateBps
					: null,
			repayment_cents:
				planKind === 'loan_refinance' || planKind === 'loan_repayment_change'
					? repaymentCents
					: null,
			notes: notesPayload,
		};
		setSubmitting(true);
		const result =
			modalMode === 'add'
				? await dispatch(createPlannedSpending(payload))
				: editingItem
					? await dispatch(updatePlannedSpending({ id: editingItem.id, payload }))
					: null;
		setSubmitting(false);
		if (result === null) {
			return;
		}
		const thunk = modalMode === 'add' ? createPlannedSpending : updatePlannedSpending;
		if (thunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save plan'));
			return;
		}
		closeModal();
		reload();
	};

	const handleDelete = async (item: PlannedSpendingItem) => {
		if (!window.confirm(`Remove “${item.name}” from Planning?`)) {
			return;
		}
		await dispatch(deletePlannedSpending(item.id));
		reload();
		reloadMatches();
	};

	const handleLinkMatch = async (
		suggestion: PlannedMatchSuggestion,
		action: 'link' | 'dismiss'
	) => {
		setMatchBusy(true);
		try {
			await resolvePlannedMatch(
				suggestion.planned.id,
				suggestion.transaction.id,
				action
			);
			reload();
			reloadMatches();
		} finally {
			setMatchBusy(false);
		}
	};

	const openLink = (item: PlannedSpendingItem) => {
		if (item.plan_kind !== 'cashflow') {
			return;
		}
		setLinkTarget(item);
		setLinkSearch('');
		setSelectedTransactionIds([]);
	};

	const confirmLinks = async () => {
		if (linkTarget === null || selectedTransactionIds.length === 0) {
			return;
		}
		setMatchBusy(true);
		try {
			for (const transactionId of selectedTransactionIds) {
				await resolvePlannedMatch(linkTarget.id, transactionId, 'link');
			}
			setLinkTarget(null);
			reload();
			reloadMatches();
		} finally {
			setMatchBusy(false);
		}
	};

	const initialLoading = loading && items.length === 0 && error === null;
	if (initialLoading) {
		return <PageLoadingState label="Loading Planning…" />;
	}
	if (error !== null && items.length === 0) {
		return <ErrorState title="Could not load Planning" message={error} onRetry={reload} />;
	}

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-1.5">
							<h1 className={pageTitleClass}>Planning</h1>
							{loading ? <Loader2 className="h-4 w-4 animate-spin text-paper-muted" /> : null}
						</div>
						<p className={pageSubtitleClass}>
							Upcoming cashflow and loan plans — redraws, refinances, and repayment changes.
						</p>
					</div>
					<div className={pageActionsClass}>
						<button type="button" className={primaryButtonClass} onClick={() => resetForm('cashflow')}>
							<Plus className="h-3.5 w-3.5" aria-hidden />
							Add plan
						</button>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap items-center gap-2.5">
						<div
							className="inline-flex shrink-0 items-center gap-0.5 rounded-paper border border-paper-border bg-paper p-[3px]"
							role="tablist"
							aria-label="Plan kind"
						>
							{[
								{ value: 'all', label: 'All' },
								{ value: 'cashflow', label: 'Cashflow' },
								{ value: 'loans', label: 'Loans' },
							].map((option) => (
								<button
									key={option.value}
									type="button"
									role="tab"
									className={cn(
										'h-7 rounded-[4px] border-0 bg-transparent px-3 text-[12.5px] font-medium text-paper-muted transition-colors hover:text-paper-fg',
										kindFilter === option.value &&
											'bg-paper-surface text-paper-fg shadow-[0_1px_2px_color-mix(in_oklch,var(--fg)_8%,transparent)]'
									)}
									aria-selected={kindFilter === option.value}
									onClick={() => {
										if (
											option.value === 'all' ||
											option.value === 'cashflow' ||
											option.value === 'loans'
										) {
											setKindFilter(option.value);
										}
									}}
								>
									{option.label}
								</button>
							))}
						</div>

						<div className="inline-flex items-center gap-1.5">
							<select
								value={accountFilter}
								onChange={(event) => setAccountFilter(event.target.value)}
								className={cn(selectDarkClass, 'h-8 py-0')}
								aria-label={
									kindFilter === 'loans'
										? 'Account filter — applies to redraw destination accounts'
										: 'Account filter — context only for cashflow plans'
								}
							>
								<option value="all">All accounts</option>
								{activeAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{accountDisplayLabel(account)}
									</option>
								))}
							</select>
							{kindFilter !== 'loans' ? (
								<span className="text-[10.5px] italic text-paper-muted">context only</span>
							) : null}
						</div>

						<div className={leSegmentedClass} role="group" aria-label="Date range mode">
							{RANGE_MODES.map((mode) => (
								<button
									key={mode}
									type="button"
									className={cn(
										leSegmentButtonClass,
										rangeMode === mode && leSegmentButtonActiveClass
									)}
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
								ariaLabel="Planning period"
							/>
						) : (
							<div className="flex items-center gap-2">
								<input
									type="date"
									value={customRange.start}
									onChange={(event) =>
										setCustomRange((range) => ({ ...range, start: event.target.value }))
									}
									className={cn(dateInputClass, 'h-8 px-2.5')}
									aria-label="From date"
								/>
								<span className="text-xs text-paper-muted">to</span>
								<input
									type="date"
									value={customRange.end}
									onChange={(event) =>
										setCustomRange((range) => ({ ...range, end: event.target.value }))
									}
									className={cn(dateInputClass, 'h-8 px-2.5')}
									aria-label="To date"
								/>
								<button type="button" className={buttonClass} onClick={() => setCustomRange(defaultCustomRange())}>
									Reset
								</button>
							</div>
						)}

						{!rangeInvalid ? (
							<div className="ml-auto flex flex-col items-end gap-0.5 rounded-paper border border-paper-border bg-[color-mix(in_oklch,var(--warn)_3%,var(--surface))] px-4 py-2">
								<span className="text-[10px] font-medium uppercase tracking-[0.05em] text-paper-muted">
									Cashflow total
								</span>
								<strong
									className={cn(
										'font-mono text-lg font-medium tabular-nums',
										moneyClassForSignedCents(displayTotal)
									)}
								>
									{formatSignedMoneyFromCents(displayTotal)}
								</strong>
								<span className="text-[11px] text-paper-muted">
									{cashflowCount} cashflow · {loanCount} loan event{loanCount === 1 ? '' : 's'}
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
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search name, notes, category, liability…"
							aria-label="Search plans"
							className={cn(inputDarkClass, 'h-8 w-full max-w-[420px] px-2.5')}
						/>
					) : null}

					<PlannedMatchCallout
						suggestions={visibleSuggestions}
						categories={activeCategories}
						busy={matchBusy}
						onLink={(suggestion) => void handleLinkMatch(suggestion, 'link')}
						onDismiss={(suggestion) => void handleLinkMatch(suggestion, 'dismiss')}
					/>

					{!loading && !rangeInvalid && visibleItems.length === 0 && !searchActive ? (
						<div className="rounded-lg border border-paper-border bg-paper-surface px-6 py-12 text-center">
							<div className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted">
								<CalendarRange className="h-5 w-5" />
							</div>
							<h3 className="text-[15px] font-semibold text-paper-fg">No plans in this view</h3>
							<p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] leading-[1.45] text-paper-muted">
								Planning covers upcoming cashflow and loan events — redraws, refinances, and repayment changes — not expenses alone.
							</p>
							<button type="button" className={cn(primaryButtonClass, 'mt-4')} onClick={() => resetForm('cashflow')}>
								<Plus className="h-3.5 w-3.5" /> Add plan
							</button>
						</div>
					) : null}

					{!loading && !rangeInvalid && visibleItems.length === 0 && searchActive ? (
						<div className="rounded-lg border border-paper-border bg-paper-surface px-6 py-12 text-center">
							<Search className="mx-auto mb-3 h-5 w-5 text-paper-muted" />
							<h3 className="text-[15px] font-semibold text-paper-fg">No plans match your search</h3>
							<p className="mt-1.5 text-[13px] text-paper-muted">
								Try clearing the search or using a different term.
							</p>
						</div>
					) : null}

					{!loading && !rangeInvalid && sortedItems.length > 0 ? (
						<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
							<div className="border-b border-paper-border px-4 py-3.5">
								<h2 className={panelTitleClass}>Plans</h2>
								<p className={panelHintClass}>
									{sortedItems.length} plan{sortedItems.length === 1 ? '' : 's'}
								</p>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[70rem] border-collapse text-[13px]">
									<thead>
										<tr>
											{[
												{ key: 'kind', label: 'Kind', className: 'w-[108px]' },
												{ key: 'name', label: 'Name', className: 'min-w-[190px]' },
												{ key: 'amount', label: 'Amount', className: 'w-[110px] text-right' },
												{ key: 'date', label: 'Date', className: 'w-[110px]' },
												{ key: 'liability', label: 'Liability', className: 'min-w-[140px] max-w-[200px]' },
											].map((header) => (
												<th key={header.key} className={cn(tableThClass, header.className)}>
													<button
														type="button"
														className={cn(
															'flex w-full items-center gap-1 bg-transparent text-inherit',
															header.key === 'amount' && 'justify-end'
														)}
														onClick={() => {
															if (
																header.key === 'kind' ||
																header.key === 'name' ||
																header.key === 'amount' ||
																header.key === 'date' ||
																header.key === 'liability'
															) {
																onSort(header.key);
															}
														}}
													>
														{header.label}
													</button>
												</th>
											))}
											<th className={cn(tableThClass, 'min-w-[180px]')}>Detail</th>
											<th className={cn(tableThClass, 'w-[1%]')}>
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{sortedItems.map((item) => {
											const liability = liabilityById(activeLiabilities, item.liability_id);
											const category = categoryById(activeCategories, item.category_id);
											const account = activeAccounts.find(
												(entry) => entry.id === item.financial_account_id
											);
											const hasLinks =
												item.plan_kind === 'cashflow' &&
												item.linked_transactions.length > 0;
											const detail =
												item.plan_kind === 'cashflow'
													? category
														? categoryLabel(category, activeCategories)
														: item.notes ?? '—'
													: item.plan_kind === 'loan_redraw'
														? `→ ${account ? accountDisplayLabel(account) : 'Destination account'} · not income`
														: item.plan_kind === 'loan_refinance'
															? `${item.new_liability_name ?? 'New facility'} · ${
																	item.interest_rate_bps === null
																		? '—'
																		: `${bpsToPercentText(item.interest_rate_bps)}%`
																} · ${
																	item.repayment_cents === null
																		? '—'
																		: `${formatMoneyMagnitude(item.repayment_cents)}/mo`
																}`
															: `${
																	item.repayment_cents === null
																		? '—'
																		: `${formatMoneyMagnitude(item.repayment_cents)}/mo`
																} · ${
																	item.interest_rate_bps === null
																		? '—'
																		: `${bpsToPercentText(item.interest_rate_bps)}%`
																}`;
											return (
												<tr key={item.id}>
													<td className={tableTdClass}>
														<span className={kindBadgeClass(item.plan_kind)}>
															{kindLabel(item.plan_kind)}
														</span>
													</td>
													<td className={tableTdClass}>
														<span className="font-medium">{item.name}</span>
														{hasLinks ? (
															<p className="mt-1 text-[11px] text-[oklch(45%_0.12_75)]">
																{formatSignedMoneyFromCents(item.linked_total_cents)} linked (
																{item.linked_transactions.length} payment
																{item.linked_transactions.length === 1 ? '' : 's'})
															</p>
														) : null}
													</td>
													<td
														className={cn(
															tableTdClass,
															'text-right font-mono tabular-nums',
															item.plan_kind === 'cashflow' &&
																moneyClassForPlannedCents(item.amount_cents)
														)}
													>
														{item.plan_kind === 'cashflow'
															? formatPlannedMoneyFromCents(displayAmount(item))
															: formatMoneyMagnitude(displayAmount(item))}
													</td>
													<td className={cn(tableTdClass, 'whitespace-nowrap text-paper-muted')}>
														{formatDate(item.start_date)}
													</td>
													<td className={cn(tableTdClass, 'max-w-[200px]')}>
														<span className="block truncate">{liability?.name ?? '—'}</span>
													</td>
													<td className={cn(tableTdClass, 'max-w-[240px]')}>
														<span className="block truncate text-xs text-paper-muted" title={detail}>
															{detail}
														</span>
													</td>
													<td className={tableTdClass}>
														<div className="flex flex-nowrap justify-end gap-1.5">
															{hasLinks ? (
																<button
																	type="button"
																	className={accentButtonClass}
																	onClick={() => void handleMarkComplete(item)}
																>
																	<Check className="h-3 w-3" /> Mark complete
																</button>
															) : null}
															{item.plan_kind === 'cashflow' ? (
																<button type="button" className={smallButtonClass} onClick={() => openLink(item)}>
																	<Link2 className="h-3 w-3" /> {hasLinks ? 'Add link' : 'Link'}
																</button>
															) : null}
															<button type="button" className={smallButtonClass} onClick={() => openEdit(item)}>
																<Edit2 className="h-3 w-3" /> Edit
															</button>
															<button type="button" className={dangerButtonClass} onClick={() => void handleDelete(item)}>
																<Trash2 className="h-3 w-3" /> Delete
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

			{modalOpen || linkTarget !== null ? (
				<div className="fixed inset-0 z-40 bg-paper-fg/35 backdrop-blur-sm" />
			) : null}

			<dialog
				open={modalOpen}
				className={cn(dialogClass, 'z-50')}
				onCancel={(event) => {
					event.preventDefault();
					closeModal();
				}}
			>
				<form
					className="flex max-h-[min(720px,calc(100vh-48px))] min-h-0 flex-col"
					onSubmit={(event) => void onSubmit(event)}
				>
					<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div>
							<span className={cn(eyebrowClass, 'mb-1 block')}>Planning</span>
							<h2 className="text-[17px] font-semibold text-paper-fg">
								{modalMode === 'add' ? 'Add plan' : 'Edit plan'}
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								{planKind === 'cashflow'
									? 'When you expect this cashflow to occur.'
									: planKind === 'loan_redraw'
										? 'Credits the destination account and increases the loan balance.'
										: planKind === 'loan_refinance'
											? 'Close the old facility and start new terms from the date.'
											: 'Update repayment or rate from the given date.'}
							</p>
						</div>
						<button type="button" onClick={closeModal} className="grid h-8 w-8 place-items-center text-paper-muted" aria-label="Close">
							<X className="h-4 w-4" />
						</button>
					</div>

					<div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] py-[18px]">
						{modalError ? <InlineAlert variant="error">{modalError}</InlineAlert> : null}
						{modalMode === 'add' ? (
							<div className={fieldClass}>
								<span className={fieldLabelClass}>Plan kind</span>
								<div
									className="grid grid-cols-2 gap-2 max-[900px]:grid-cols-1"
									role="radiogroup"
									aria-label="Plan kind"
								>
									{PLAN_KIND_OPTIONS.map((option) => {
										const selected = planKind === option.value;
										return (
											<button
												key={option.value}
												type="button"
												role="radio"
												aria-checked={selected}
												aria-pressed={selected}
												className={cn(
													'flex items-start gap-2.5 rounded-paper border px-3 py-2.5 text-left transition-colors',
													selected
														? 'border-secondary-default bg-secondary-default/10'
														: 'border-paper-border bg-paper-surface hover:border-[color-mix(in_oklch,var(--fg)_22%,var(--border))]'
												)}
												onClick={() => setPlanKind(option.value)}
											>
												<span
													className={cn(
														'relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
														selected
															? 'border-secondary-default'
															: 'border-paper-border bg-paper-surface'
													)}
													aria-hidden="true"
												>
													{selected ? (
														<span className="h-2 w-2 rounded-full bg-secondary-default" />
													) : null}
												</span>
												<span className="flex min-w-0 flex-col gap-0.5">
													<span
														className={cn(
															'text-[13px] font-semibold',
															selected ? 'text-secondary-default' : 'text-paper-fg'
														)}
													>
														{option.title}
													</span>
													<span className="text-[11.5px] text-paper-muted">
														{option.subtitle}
													</span>
												</span>
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						<label className={fieldClass}>
							<span className={fieldLabelClass}>Name</span>
							<input value={name} onChange={(event) => setName(event.target.value)} className={cn(inputDarkClass, 'h-8 px-2.5')} placeholder="e.g. Holiday, Offset redraw" required />
						</label>

						{planKind === 'cashflow' ? (
							<div className={fieldClass}>
								<div className="flex items-center justify-between gap-3">
									<span className={fieldLabelClass}>Amount ($)</span>
									<div className={leSegmentedClass}>
										{AMOUNT_TYPES.map((type) => (
											<button
												key={type}
												type="button"
												className={cn(leSegmentButtonClass, amountType === type && leSegmentButtonActiveClass)}
												onClick={() => setAmountType(type)}
											>
												{type === 'spending' ? 'Spending' : 'Income'}
											</button>
										))}
									</div>
								</div>
								<input
									value={amount}
									onChange={(event) => {
										const parsed = parsePlannedAmountInput(event.target.value, amountType);
										setAmount(parsed.value);
										setAmountType(parsed.type);
									}}
									className={cn(inputDarkClass, 'h-8 px-2.5 font-mono')}
									inputMode="decimal"
									placeholder="0.00"
								/>
							</div>
						) : planKind === 'loan_redraw' ? (
							<label className={fieldClass}>
								<span className={fieldLabelClass}>Redraw amount ($)</span>
								<input value={amount} onChange={(event) => setAmount(parsePlannedAmountInput(event.target.value, 'income').value)} className={cn(inputDarkClass, 'h-8 px-2.5 font-mono')} inputMode="decimal" placeholder="50000.00" />
							</label>
						) : null}

						<label className={fieldClass}>
							<span className={fieldLabelClass}>Date</span>
							<input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className={cn(dateInputClass, 'h-8 px-2.5')} required />
						</label>

						{planKind === 'cashflow' ? (
							<label className={fieldClass}>
								<span className={fieldLabelClass}>Category (optional)</span>
								<CategoryPicker value={categoryId} categories={categories} onChange={setCategoryId} placeholder="None" searchable variant="form" className="w-full" />
							</label>
						) : (
							<label className={fieldClass}>
								<span className={fieldLabelClass}>
									{planKind === 'loan_refinance' ? 'Settle / close liability' : 'Liability'}
								</span>
								<select value={liabilityId} onChange={(event) => setLiabilityId(event.target.value)} className={selectDarkClass}>
									<option value="">Choose liability…</option>
									{activeLiabilities.map((liability) => (
										<option key={liability.id} value={liability.id}>{liability.name}</option>
									))}
								</select>
							</label>
						)}

						{planKind === 'loan_redraw' ? (
							<>
								<label className={fieldClass}>
									<span className={fieldLabelClass}>Destination account</span>
									<select value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className={selectDarkClass}>
										<option value="">Choose account…</option>
										{activeAccounts.map((account) => (
											<option key={account.id} value={account.id}>{accountDisplayLabel(account)}</option>
										))}
									</select>
								</label>
								<p className="rounded-paper border border-[color-mix(in_oklch,var(--warn)_30%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_7%,var(--surface))] px-3 py-2.5 text-[12.5px] leading-[1.45] text-paper-fg">
									<strong className="font-semibold text-[oklch(42%_0.1_75)]">Not income.</strong>{' '}
									A redraw credits the destination account and increases the loan balance by the same amount.
								</p>
							</>
						) : null}

						{planKind === 'loan_refinance' ? (
							<label className={fieldClass}>
								<span className={fieldLabelClass}>New / linked liability name</span>
								<input value={newLiabilityName} onChange={(event) => setNewLiabilityName(event.target.value)} className={cn(inputDarkClass, 'h-8 px-2.5')} placeholder="e.g. Home loan — refinance 2026" />
							</label>
						) : null}

						{planKind === 'loan_refinance' || planKind === 'loan_repayment_change' ? (
							<div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
								<label className={fieldClass}>
									<span className={fieldLabelClass}>Rate (%)</span>
									<input value={ratePercent} onChange={(event) => setRatePercent(event.target.value.replace(/[^\d.]/g, ''))} className={cn(inputDarkClass, 'h-8 px-2.5 font-mono')} inputMode="decimal" placeholder="5.49" />
								</label>
								<label className={fieldClass}>
									<span className={fieldLabelClass}>Repayment ($ / mo)</span>
									<input value={repayment} onChange={(event) => setRepayment(parsePlannedAmountInput(event.target.value, 'income').value)} className={cn(inputDarkClass, 'h-8 px-2.5 font-mono')} inputMode="decimal" placeholder="2640.00" />
								</label>
							</div>
						) : null}

						{impactPreview ? (
							<div className="rounded-paper border border-[color-mix(in_oklch,var(--warn)_28%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_6%,var(--surface))] px-3.5 py-3">
								<span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-paper-muted">Impact preview</span>
								<p className="text-[13px] font-medium leading-[1.4] text-paper-fg">{impactPreview.body}</p>
								<p className="mt-1.5 text-xs leading-[1.4] text-paper-muted">{impactPreview.note}</p>
							</div>
						) : null}

						<label className={fieldClass}>
							<span className={fieldLabelClass}>Notes (optional)</span>
							<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={cn(inputDarkClass, 'min-h-[70px] resize-y px-2.5 py-2')} placeholder="Any extra context" />
						</label>
					</div>

					<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button type="button" className={buttonClass} onClick={closeModal}>Cancel</button>
						<button type="submit" className={primaryButtonClass} disabled={submitting}>
							{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : modalMode === 'add' ? 'Add' : 'Save'}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				open={linkTarget !== null}
				className={cn(wideDialogClass, 'z-50')}
				onCancel={(event) => {
					event.preventDefault();
					setLinkTarget(null);
				}}
			>
				<div className="flex h-full flex-col">
					<div className="flex items-start justify-between px-[22px] pt-[18px]">
						<div>
							<span className={eyebrowClass}>Link transactions</span>
							<h2 className="mt-1 text-[17px] font-semibold">Link transactions</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Select bank transactions for “{linkTarget?.name}”.
							</p>
						</div>
						<button type="button" onClick={() => setLinkTarget(null)} aria-label="Close">
							<X className="h-4 w-4" />
						</button>
					</div>
					<div className="flex min-h-0 flex-1 flex-col gap-3.5 px-[22px] py-[18px]">
						<input type="search" value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} className={cn(inputDarkClass, 'h-8 px-2.5')} placeholder="Search transaction description…" />
						{linkLoading ? (
							<div className="grid flex-1 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
						) : linkCandidates.length === 0 ? (
							<div className="grid flex-1 place-items-center text-sm text-paper-muted">No transactions found nearby.</div>
						) : (
							<div className="min-h-0 flex-1 overflow-auto rounded-paper border border-paper-border">
								<table className="w-full min-w-[40rem] border-collapse">
									<thead><tr><th className={tableThClass} /><th className={tableThClass}>Date</th><th className={tableThClass}>Description</th><th className={tableThClass}>Account</th><th className={cn(tableThClass, 'text-right')}>Amount</th></tr></thead>
									<tbody>
										{linkCandidates.map((candidate) => {
											const selected = selectedTransactionIds.includes(candidate.id);
											return (
												<tr key={candidate.id} className={selected ? 'bg-[color-mix(in_oklch,var(--accent)_10%,var(--surface))]' : ''}>
													<td className={tableTdClass}>
														<input
															type="checkbox"
															checked={selected}
															onChange={() =>
																setSelectedTransactionIds((ids) =>
																	selected ? ids.filter((id) => id !== candidate.id) : [...ids, candidate.id]
																)
															}
														/>
													</td>
													<td className={tableTdClass}>{formatDate(candidate.transaction_date)}</td>
													<td className={tableTdClass}>{candidate.description}</td>
													<td className={tableTdClass}>{candidate.account_label}</td>
													<td className={cn(tableTdClass, 'text-right font-mono', moneyClassForSignedCents(candidate.amount))}>{formatSignedMoneyFromCents(candidate.amount)}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
					<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button type="button" className={buttonClass} onClick={() => setLinkTarget(null)}>Cancel</button>
						<button type="button" className={primaryButtonClass} onClick={() => void confirmLinks()} disabled={selectedTransactionIds.length === 0 || matchBusy}>
							Link selected
						</button>
					</div>
				</div>
			</dialog>
		</PageShell>
	);

	async function handleMarkComplete(item: PlannedSpendingItem) {
		if (item.plan_kind !== 'cashflow') {
			return;
		}
		setMatchBusy(true);
		try {
			await markPlannedComplete(item.id);
			reload();
			reloadMatches();
		} finally {
			setMatchBusy(false);
		}
	}
}
