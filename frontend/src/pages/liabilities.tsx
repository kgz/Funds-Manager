import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Check, Landmark, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
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
import { cn } from '@/lib/utils/cn';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllAccounts } from '@/store/thunks/account.get.all';
import {
	createLiabilityThunk,
	deleteLiabilityThunk,
	getLiabilities,
	updateLiabilityThunk,
} from '@/store/thunks/liabilities';
import {
	bpsToPercentText,
	createLiabilityBalance,
	deleteLiabilityBalance,
	fetchLiabilityBalances,
	formatCentsAsDollars,
	liabilityKindLabel,
	LIABILITY_FREQUENCY_OPTIONS,
	LIABILITY_KIND_OPTIONS,
	parsePercentToBps,
	parsePositiveDollarsToCents,
	type Liability,
	type LiabilityBalance,
	type LiabilityFrequency,
	type LiabilityKind,
	type LiabilityRateType,
} from '@/types/liabilities';

type LiabilityFormMode = 'add' | 'edit' | null;

const liabilityBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const liabilityBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const liabilityBtnGhostClass =
	'inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

const liabilityBtnAccentClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-secondary-default/45 bg-secondary-default/10 px-3 text-[13px] font-medium tracking-[0.02em] text-secondary-default transition-colors hover:bg-secondary-default/20 disabled:cursor-not-allowed disabled:opacity-50';

const liabilityBtnDangerClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-[color-mix(in_oklch,var(--danger)_38%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_6%,var(--surface))] px-3 text-[13px] font-medium tracking-[0.02em] text-[var(--danger)] transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_14%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const liabilityDialogClass =
	'fixed inset-0 m-auto flex w-[min(480px,calc(100vw-32px))] max-h-[min(680px,calc(100vh-48px))] flex-col overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const liabilityDialogWideClass =
	'fixed inset-0 m-auto flex w-[min(560px,calc(100vw-32px))] max-h-[min(680px,calc(100vh-48px))] flex-col overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const liabilityModalBodyClass =
	'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[22px] pb-[18px] pt-3.5 text-[13px] leading-[1.55] text-paper-fg [&_p]:m-0';

const liabilityModalFieldClass = 'flex flex-col gap-1.5';

const liabilityModalFieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted';

const liabilityFormErrorClass =
	'm-0 rounded-paper border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] px-2.5 py-2 text-xs text-[var(--danger)]';

const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

const headerTotalClass =
	'hidden flex-col items-end gap-0.5 rounded-paper border border-paper-border bg-[color-mix(in_oklch,var(--danger)_4%,var(--surface))] px-3.5 py-2 sm:flex';

const formatMoney = (cents: number) =>
	`$${Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const FREQ_SHORT: Record<LiabilityFrequency, string> = {
	weekly: '/wk',
	fortnightly: '/fn',
	monthly: '/mo',
};

function toKind(value: string): LiabilityKind {
	const match = LIABILITY_KIND_OPTIONS.find((option) => option.value === value);
	return match ? match.value : 'other';
}

function toRateType(value: string): LiabilityRateType | '' {
	return value === 'fixed' || value === 'variable' ? value : '';
}

function toFrequency(value: string): LiabilityFrequency | '' {
	const match = LIABILITY_FREQUENCY_OPTIONS.find((option) => option.value === value);
	return match ? match.value : '';
}

function formatBalancedAt(balancedAt: string | null): string {
	if (!balancedAt) {
		return '—';
	}
	const parsed = DateTime.fromISO(balancedAt);
	return parsed.isValid ? parsed.toFormat('d MMM yyyy') : '—';
}

function liabilityCountLabel(count: number): string {
	if (count === 0) {
		return 'No liabilities recorded';
	}
	return `${count} liabilit${count === 1 ? 'y' : 'ies'}`;
}

function showsCreditLimit(kind: LiabilityKind): boolean {
	return kind === 'credit_card' || kind === 'bnpl';
}

function kindPillClass(kind: LiabilityKind): string {
	switch (kind) {
		case 'home_loan':
			return 'border-[color-mix(in_oklch,oklch(55%_0.1_55)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.1_55)_8%,var(--surface))] text-[oklch(42%_0.08_55)]';
		case 'car_loan':
			return 'border-[color-mix(in_oklch,oklch(55%_0.1_250)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.1_250)_8%,var(--surface))] text-[oklch(42%_0.08_250)]';
		case 'personal_loan':
			return 'border-[color-mix(in_oklch,oklch(55%_0.12_290)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.12_290)_8%,var(--surface))] text-[oklch(42%_0.1_290)]';
		case 'credit_card':
			return 'border-[color-mix(in_oklch,var(--danger)_28%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_8%,var(--surface))] text-[oklch(40%_0.12_25)]';
		default:
			return 'border-paper-border bg-paper text-paper-muted';
	}
}

function LiabilityKindPill({ kind }: { kind: LiabilityKind }) {
	return (
		<span
			className={cn(
				'inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-medium tracking-[0.02em] whitespace-nowrap',
				kindPillClass(kind)
			)}
		>
			{liabilityKindLabel(kind)}
		</span>
	);
}

function RateCell({ liability }: { liability: Liability }) {
	if (liability.interest_rate_bps === null) {
		return <span className="text-paper-muted">—</span>;
	}
	return (
		<span className="text-[12.5px] leading-snug">
			<span className="font-mono tabular-nums">
				{bpsToPercentText(liability.interest_rate_bps)}%
			</span>
			{liability.rate_type !== null ? (
				<span className="block text-[11px] capitalize text-paper-muted">
					{liability.rate_type}
				</span>
			) : null}
		</span>
	);
}

function RepaymentCell({ liability }: { liability: Liability }) {
	if (liability.repayment_cents === null) {
		return <span className="text-paper-muted">—</span>;
	}
	const freqShort =
		liability.repayment_frequency !== null
			? FREQ_SHORT[liability.repayment_frequency]
			: '';
	return (
		<span className="font-mono tabular-nums">
			{formatMoney(liability.repayment_cents)}
			{freqShort}
		</span>
	);
}

export default function LiabilitiesPage() {
	const dispatch = useAppDispatch();
	const { items, totalBalanceCents, loading, error } = useAppSelector(
		(state) => state.LiabilitiesReducer
	);
	const { accounts } = useAppSelector((state) => state.AccountReducer);

	const [formMode, setFormMode] = useState<LiabilityFormMode>(null);
	const [editingItem, setEditingItem] = useState<Liability | null>(null);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<LiabilityKind>('home_loan');
	const [lender, setLender] = useState('');
	const [balance, setBalance] = useState('');
	const [creditLimit, setCreditLimit] = useState('');
	const [originalAmount, setOriginalAmount] = useState('');
	const [originatedDate, setOriginatedDate] = useState('');
	const [ratePercent, setRatePercent] = useState('');
	const [rateType, setRateType] = useState<LiabilityRateType | ''>('variable');
	const [repayment, setRepayment] = useState('');
	const [frequency, setFrequency] = useState<LiabilityFrequency | ''>('monthly');
	const [termMonths, setTermMonths] = useState('');
	const [accountId, setAccountId] = useState('');
	const [notes, setNotes] = useState('');
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [balances, setBalances] = useState<LiabilityBalance[]>([]);
	const [balancesLoading, setBalancesLoading] = useState(false);
	const [balDate, setBalDate] = useState('');
	const [balAmount, setBalAmount] = useState('');
	const [balSource, setBalSource] = useState('');
	const [balSubmitting, setBalSubmitting] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	const addDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);

	const activeAccounts = useMemo(
		() => accounts.filter((account) => account.deleted_at === null),
		[accounts]
	);

	useEffect(() => {
		void dispatch(getLiabilities());
		void dispatch(getAllAccounts());
	}, [dispatch]);

	useEffect(() => {
		if (!toast) {
			return;
		}
		const timer = window.setTimeout(() => setToast(null), 3200);
		return () => window.clearTimeout(timer);
	}, [toast]);

	useEffect(() => {
		const dialog = addDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (formMode === 'add' && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => nameInputRef.current?.focus());
		} else if (formMode !== 'add' && dialog.open) {
			dialog.close();
		}
	}, [formMode]);

	useEffect(() => {
		const dialog = editDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (formMode === 'edit' && editingItem !== null && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => nameInputRef.current?.focus());
		} else if ((formMode !== 'edit' || editingItem === null) && dialog.open) {
			dialog.close();
		}
	}, [formMode, editingItem]);

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

	const sortedBalances = useMemo(
		() =>
			[...balances].sort((left, right) =>
				right.balanced_at.localeCompare(left.balanced_at)
			),
		[balances]
	);

	const latestBalanceId = sortedBalances[0]?.id ?? null;

	const resetBalanceForm = () => {
		setBalDate(DateTime.now().toISODate() ?? '');
		setBalAmount('');
		setBalSource('');
	};

	const loadBalances = async (liabilityId: string) => {
		setBalancesLoading(true);
		try {
			setBalances(await fetchLiabilityBalances(liabilityId));
		} catch {
			setBalances([]);
		} finally {
			setBalancesLoading(false);
		}
	};

	const resetFormFields = () => {
		setName('');
		setKind('home_loan');
		setLender('');
		setBalance('');
		setCreditLimit('');
		setOriginalAmount('');
		setOriginatedDate('');
		setRatePercent('');
		setRateType('variable');
		setRepayment('');
		setFrequency('monthly');
		setTermMonths('');
		setAccountId('');
		setNotes('');
		setBalances([]);
		setModalError(null);
	};

	const openAddModal = () => {
		setEditingItem(null);
		resetFormFields();
		setFormMode('add');
	};

	const openEditModal = (item: Liability) => {
		setEditingItem(item);
		setName(item.name);
		setKind(item.kind);
		setLender(item.lender ?? '');
		setBalance(formatCentsAsDollars(item.balance_cents));
		setCreditLimit(
			item.credit_limit_cents === null
				? ''
				: formatCentsAsDollars(item.credit_limit_cents)
		);
		setOriginalAmount(
			item.original_amount_cents === null
				? ''
				: formatCentsAsDollars(item.original_amount_cents)
		);
		setOriginatedDate('');
		setRatePercent(
			item.interest_rate_bps === null ? '' : bpsToPercentText(item.interest_rate_bps)
		);
		setRateType(item.rate_type ?? '');
		setRepayment(
			item.repayment_cents === null ? '' : formatCentsAsDollars(item.repayment_cents)
		);
		setFrequency(item.repayment_frequency ?? '');
		setTermMonths(item.term_months === null ? '' : String(item.term_months));
		setAccountId(item.financial_account_id ?? '');
		setNotes(item.notes ?? '');
		setBalances([]);
		resetBalanceForm();
		setModalError(null);
		setFormMode('edit');
		void loadBalances(item.id);
	};

	const closeFormModal = () => {
		if (submitting || balSubmitting) {
			return;
		}
		setFormMode(null);
		setEditingItem(null);
		setModalError(null);
	};

	const closeDeleteModal = () => {
		if (submitting) {
			return;
		}
		setDeleteTarget(null);
		setDeleteError(null);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setModalError('Name is required.');
			return;
		}

		const termValue = termMonths.trim();
		let termPayload: number | null = null;
		if (termValue.length > 0) {
			const parsed = Number(termValue);
			if (!Number.isInteger(parsed) || parsed < 0) {
				setModalError('Term must be a whole number of months.');
				return;
			}
			termPayload = parsed;
		}

		const originalAmountCents = parsePositiveDollarsToCents(originalAmount);

		if (formMode === 'edit' && editingItem !== null) {
			const payload = {
				name: trimmedName,
				kind,
				lender: lender.trim().length > 0 ? lender.trim() : null,
				balance_cents: editingItem.balance_cents,
				credit_limit_cents: showsCreditLimit(kind)
					? parsePositiveDollarsToCents(creditLimit)
					: null,
				original_amount_cents: originalAmountCents,
				interest_rate_bps: parsePercentToBps(ratePercent),
				rate_type: rateType === '' ? null : rateType,
				repayment_cents: parsePositiveDollarsToCents(repayment),
				repayment_frequency: frequency === '' ? null : frequency,
				term_months: termPayload,
				financial_account_id: accountId.length > 0 ? Number(accountId) : null,
				notes: notes.trim().length > 0 ? notes.trim() : null,
			};
			setSubmitting(true);
			setModalError(null);
			const result = await dispatch(
				updateLiabilityThunk({ id: editingItem.id, payload })
			);
			setSubmitting(false);
			if (updateLiabilityThunk.rejected.match(result)) {
				setModalError(readThunkRejectMessage(result, 'Failed to save liability'));
				return;
			}
			setToast(`“${trimmedName}” updated.`);
			setFormMode(null);
			setEditingItem(null);
			void dispatch(getLiabilities());
			return;
		}

		const balanceCents = parsePositiveDollarsToCents(balance);
		if (balanceCents === null) {
			setModalError('Enter a valid current balance.');
			return;
		}

		if (originalAmount.trim().length > 0 && originalAmountCents === null) {
			setModalError('Enter a valid original amount.');
			return;
		}
		if (originalAmountCents !== null && originatedDate.length < 10) {
			setModalError('Enter a start date for the original amount.');
			return;
		}

		const payload = {
			name: trimmedName,
			kind,
			lender: lender.trim().length > 0 ? lender.trim() : null,
			balance_cents: balanceCents,
			credit_limit_cents: showsCreditLimit(kind)
				? parsePositiveDollarsToCents(creditLimit)
				: null,
			original_amount_cents: originalAmountCents,
			interest_rate_bps: parsePercentToBps(ratePercent),
			rate_type: rateType === '' ? null : rateType,
			repayment_cents: parsePositiveDollarsToCents(repayment),
			repayment_frequency: frequency === '' ? null : frequency,
			term_months: termPayload,
			financial_account_id: accountId.length > 0 ? Number(accountId) : null,
			notes: notes.trim().length > 0 ? notes.trim() : null,
			originated_date:
				originalAmountCents !== null && originatedDate.length >= 10
					? originatedDate
					: null,
		};

		setSubmitting(true);
		setModalError(null);
		const result = await dispatch(createLiabilityThunk(payload));
		setSubmitting(false);

		if (createLiabilityThunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save liability'));
			return;
		}

		setToast(`“${trimmedName}” added.`);
		setFormMode(null);
		void dispatch(getLiabilities());
	};

	const onAddBalance = async () => {
		if (editingItem === null) {
			return;
		}
		const amountCents = parsePositiveDollarsToCents(balAmount);
		if (amountCents === null) {
			setModalError('Enter a valid balance amount.');
			return;
		}
		if (balDate.length < 10) {
			setModalError('Balance date is required.');
			return;
		}
		setBalSubmitting(true);
		setModalError(null);
		try {
			await createLiabilityBalance(editingItem.id, {
				balance_cents: amountCents,
				balanced_at: balDate,
				source: balSource.trim().length > 0 ? balSource.trim() : null,
			});
			resetBalanceForm();
			await loadBalances(editingItem.id);
			void dispatch(getLiabilities());
			setToast('Balance added.');
		} catch {
			setModalError('Failed to add balance snapshot');
		} finally {
			setBalSubmitting(false);
		}
	};

	const onRemoveBalance = async (balanceId: string) => {
		if (editingItem === null || balances.length <= 1) {
			return;
		}
		setBalSubmitting(true);
		setModalError(null);
		try {
			await deleteLiabilityBalance(editingItem.id, balanceId);
			await loadBalances(editingItem.id);
			void dispatch(getLiabilities());
			setToast('Balance removed.');
		} catch {
			setModalError('Failed to remove balance snapshot');
		} finally {
			setBalSubmitting(false);
		}
	};

	const onConfirmDelete = async () => {
		if (deleteTarget === null) {
			return;
		}
		const deletedName = deleteTarget.name;
		setSubmitting(true);
		setDeleteError(null);
		const result = await dispatch(deleteLiabilityThunk(deleteTarget.id));
		setSubmitting(false);

		if (deleteLiabilityThunk.rejected.match(result)) {
			setDeleteError(readThunkRejectMessage(result, 'Failed to delete liability'));
			return;
		}

		setToast(`“${deletedName}” deleted.`);
		setDeleteTarget(null);
		void dispatch(getLiabilities());
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;

	if (initialLoading) {
		return <PageLoadingState label="Loading liabilities…" />;
	}

	if (error !== null && items.length === 0) {
		return (
			<ErrorState
				title="Could not load liabilities"
				message={error}
				onRetry={() => void dispatch(getLiabilities())}
			/>
		);
	}

	const liabilityFormFields = (mode: 'add' | 'edit') => (
		<>
			<label className={liabilityModalFieldClass}>
				<span className={liabilityModalFieldLabelClass}>Name</span>
				<input
					ref={nameInputRef}
					id={mode === 'add' ? 'liabilityNameInput' : 'editLiabilityNameInput'}
					type="text"
					value={name}
					onChange={(event) => setName(event.target.value)}
					className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
					placeholder="e.g. Home loan — Unley Park"
					disabled={submitting}
					required
				/>
			</label>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Type</span>
					<select
						id={mode === 'add' ? 'liabilityKindInput' : 'editLiabilityKindInput'}
						value={kind}
						onChange={(event) => setKind(toKind(event.target.value))}
						className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
						disabled={submitting}
					>
						{LIABILITY_KIND_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Lender</span>
					<input
						id={mode === 'add' ? 'liabilityLenderInput' : 'editLiabilityLenderInput'}
						type="text"
						value={lender}
						onChange={(event) => setLender(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
						placeholder="e.g. BankSA, CBA"
						disabled={submitting}
					/>
				</label>
			</div>

			{mode === 'add' ? (
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Current balance ($)</span>
					<input
						id="liabilityBalanceInput"
						type="text"
						inputMode="decimal"
						value={balance}
						onChange={(event) => setBalance(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
						placeholder="0.00"
						disabled={submitting}
						required
					/>
				</label>
			) : editingItem !== null ? (
				<div className="flex items-center justify-between rounded-paper border border-paper-border bg-paper px-3 py-2.5">
					<span className={liabilityModalFieldLabelClass}>Current balance</span>
					<span className="font-mono text-base font-medium tabular-nums text-[var(--danger)]">
						{formatMoney(editingItem.balance_cents)}
					</span>
				</div>
			) : null}

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Original amount ($)</span>
					<input
						type="text"
						inputMode="decimal"
						value={originalAmount}
						onChange={(event) => setOriginalAmount(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
						placeholder="Optional"
						disabled={submitting}
					/>
				</label>
				{mode === 'add' ? (
					<label className={liabilityModalFieldClass}>
						<span className={liabilityModalFieldLabelClass}>Start date</span>
						<input
							type="date"
							value={originatedDate}
							onChange={(event) => setOriginatedDate(event.target.value)}
							className={cn(dateInputClass, 'h-8 w-full px-2.5')}
							disabled={submitting}
						/>
					</label>
				) : (
					<div className="hidden sm:block" />
				)}
			</div>

			{showsCreditLimit(kind) ? (
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Credit limit ($)</span>
					<input
						type="text"
						inputMode="decimal"
						value={creditLimit}
						onChange={(event) => setCreditLimit(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
						placeholder="Optional"
						disabled={submitting}
					/>
				</label>
			) : null}

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Interest rate (%)</span>
					<input
						type="text"
						inputMode="decimal"
						value={ratePercent}
						onChange={(event) => setRatePercent(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
						placeholder="e.g. 5.89"
						disabled={submitting}
					/>
				</label>
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Rate type</span>
					<select
						value={rateType}
						onChange={(event) => setRateType(toRateType(event.target.value))}
						className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
						disabled={submitting}
					>
						<option value="">—</option>
						<option value="variable">Variable</option>
						<option value="fixed">Fixed</option>
					</select>
				</label>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Repayment ($)</span>
					<input
						type="text"
						inputMode="decimal"
						value={repayment}
						onChange={(event) => setRepayment(event.target.value)}
						className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
						placeholder="0.00"
						disabled={submitting}
					/>
				</label>
				<label className={liabilityModalFieldClass}>
					<span className={liabilityModalFieldLabelClass}>Frequency</span>
					<select
						value={frequency}
						onChange={(event) => setFrequency(toFrequency(event.target.value))}
						className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
						disabled={submitting}
					>
						<option value="">—</option>
						{LIABILITY_FREQUENCY_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<label className={liabilityModalFieldClass}>
				<span className={liabilityModalFieldLabelClass}>Term (months)</span>
				<input
					type="text"
					inputMode="numeric"
					value={termMonths}
					onChange={(event) =>
						setTermMonths(event.target.value.replace(/[^\d]/g, ''))
					}
					className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
					placeholder="e.g. 360"
					disabled={submitting}
				/>
				<p className="text-xs leading-snug text-paper-muted">
					Optional — remaining or original term.
				</p>
			</label>

			<label className={liabilityModalFieldClass}>
				<span className={liabilityModalFieldLabelClass}>Linked account</span>
				<select
					value={accountId}
					onChange={(event) => setAccountId(event.target.value)}
					className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
					disabled={submitting}
				>
					<option value="">None</option>
					{activeAccounts.map((account) => (
						<option key={account.id} value={account.id}>
							{account.display_name}
						</option>
					))}
				</select>
				<p className="text-xs leading-snug text-paper-muted">
					Offset or repayment account, if applicable.
				</p>
			</label>

			<label className={liabilityModalFieldClass}>
				<span className={liabilityModalFieldLabelClass}>Notes</span>
				<textarea
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					className={cn(inputDarkClass, 'min-h-[72px] w-full resize-y px-2.5 py-2')}
					placeholder="Optional context"
					disabled={submitting}
				/>
			</label>
		</>
	);

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Liabilities</h1>
							{isRefreshing ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Loans and debts — home loan, car loan, credit cards, and other
							facilities
						</p>
					</div>
					<div className={pageActionsClass}>
						<div className={headerTotalClass} aria-live="polite">
							<span className="text-[10px] font-medium uppercase tracking-[0.06em] text-paper-muted">
								Total owed
							</span>
							<strong className="font-mono text-lg font-medium tracking-[-0.01em] tabular-nums text-[var(--danger)]">
								{formatMoney(totalBalanceCents)}
							</strong>
						</div>
						<button
							type="button"
							className={liabilityBtnPrimaryClass}
							onClick={openAddModal}
						>
							<Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
							Add liability
						</button>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}

				<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
						<div className="min-w-0">
							<h2 className={panelTitleClass}>Your liabilities</h2>
							<p className={panelHintClass}>{liabilityCountLabel(items.length)}</p>
						</div>
					</div>

					{items.length === 0 ? (
						<div className="px-6 py-12 text-center">
							<div
								className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted"
								aria-hidden
							>
								<Landmark className="h-[22px] w-[22px]" strokeWidth={1.6} />
							</div>
							<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
								No liabilities yet
							</h3>
							<p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-snug text-paper-muted">
								Add home loans, car loans, credit cards, or other debts to track
								what you owe.
							</p>
							<div className="mt-4">
								<button
									type="button"
									className={liabilityBtnPrimaryClass}
									onClick={openAddModal}
								>
									<Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
									Add liability
								</button>
							</div>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-[13px]">
								<thead>
									<tr>
										<th className={tableThClass}>Name</th>
										<th className={cn(tableThClass, 'w-[116px]')}>Type</th>
										<th className={tableThClass}>Lender</th>
										<th className={cn(tableThClass, 'w-[128px] text-right')}>
											Balance
										</th>
										<th className={cn(tableThClass, 'w-[120px]')}>Rate</th>
										<th className={cn(tableThClass, 'w-[108px] text-right')}>
											Repayment
										</th>
										<th className={cn(tableThClass, 'text-right')}>
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<tr key={item.id}>
											<td className={cn(tableTdClass, 'font-medium')}>
												{item.name}
											</td>
											<td className={tableTdClass}>
												<LiabilityKindPill kind={item.kind} />
											</td>
											<td
												className={cn(
													tableTdClass,
													'max-w-[140px] truncate text-paper-muted'
												)}
											>
												{item.lender ?? '—'}
											</td>
											<td
												className={cn(
													tableTdClass,
													'text-right font-mono tabular-nums text-[var(--danger)]'
												)}
											>
												{formatMoney(item.balance_cents)}
											</td>
											<td className={tableTdClass}>
												<RateCell liability={item} />
											</td>
											<td className={cn(tableTdClass, 'text-right')}>
												<RepaymentCell liability={item} />
											</td>
											<td className={cn(tableTdClass, 'text-right')}>
												<div className="flex justify-end gap-1.5">
													<button
														type="button"
														className={liabilityBtnGhostClass}
														onClick={() => openEditModal(item)}
														aria-label={`Edit ${item.name}`}
													>
														<Pencil className="h-3.5 w-3.5" strokeWidth={2} />
														Edit
													</button>
													<button
														type="button"
														className={liabilityBtnGhostClass}
														onClick={() => {
															setDeleteError(null);
															setDeleteTarget(item);
														}}
														aria-label={`Delete ${item.name}`}
													>
														<Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
														Delete
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>

			<dialog
				ref={addDialogRef}
				className={liabilityDialogClass}
				aria-labelledby="add-liability-title"
				onCancel={(event) => {
					event.preventDefault();
					closeFormModal();
				}}
				onClose={() => {
					if (!submitting) {
						setFormMode((mode) => (mode === 'add' ? null : mode));
					}
				}}
			>
				<form
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
					onSubmit={onSubmit}
				>
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Liabilities</span>
							<h2
								id="add-liability-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Add liability
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Record a loan or debt facility and its current balance.
							</p>
						</div>
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					<div className={liabilityModalBodyClass}>
						{modalError !== null && formMode === 'add' ? (
							<p className={liabilityFormErrorClass}>{modalError}</p>
						) : null}
						{liabilityFormFields('add')}
					</div>

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting}
							className={liabilityBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting}
							className={liabilityBtnPrimaryClass}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Add liability'
							)}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				ref={editDialogRef}
				className={liabilityDialogWideClass}
				aria-labelledby="edit-liability-title"
				onCancel={(event) => {
					event.preventDefault();
					closeFormModal();
				}}
				onClose={() => {
					if (!submitting && !balSubmitting) {
						setFormMode((mode) => (mode === 'edit' ? null : mode));
						setEditingItem(null);
					}
				}}
			>
				<form
					className="flex min-h-0 flex-1 flex-col overflow-hidden"
					onSubmit={onSubmit}
				>
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Liabilities</span>
							<h2
								id="edit-liability-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Edit liability
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Update metadata here — change balances via balance history below.
							</p>
						</div>
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting || balSubmitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					{editingItem !== null ? (
						<div className={liabilityModalBodyClass}>
							{modalError !== null && formMode === 'edit' ? (
								<p className={liabilityFormErrorClass}>{modalError}</p>
							) : null}
							{liabilityFormFields('edit')}

							<div className="mt-1 border-t border-paper-border pt-3.5">
								<div className="mb-2.5">
									<h3 className="m-0 text-xs font-semibold tracking-[0.02em] text-paper-fg">
										Balance history
									</h3>
									<p className="mt-0.5 text-[11.5px] text-paper-muted">
										Add or remove past balances — the newest date sets the table
										balance.
									</p>
								</div>

								{balancesLoading ? (
									<div className="mb-3 flex justify-center py-2">
										<Loader2 className="h-4 w-4 animate-spin text-secondary-default" />
									</div>
								) : null}

								{!balancesLoading && sortedBalances.length === 0 ? (
									<p className="mb-3 text-xs text-paper-muted">
										No balance snapshots yet.
									</p>
								) : null}

								{sortedBalances.length > 0 ? (
									<div className="mb-3 flex flex-col gap-1.5">
										{sortedBalances.map((entry) => {
											const isCurrent = entry.id === latestBalanceId;
											const canRemove = balances.length > 1;
											return (
												<div
													key={entry.id}
													className={cn(
														'rounded-paper border border-paper-border bg-paper px-2.5 py-2 text-[12.5px]',
														isCurrent &&
															'border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_5%,var(--surface))]'
													)}
												>
													<div className="mb-1 flex items-center justify-between gap-2">
														<span className="font-mono tabular-nums text-paper-fg">
															{formatBalancedAt(entry.balanced_at)}
															{isCurrent ? ' · current' : ''}
														</span>
														{canRemove ? (
															<button
																type="button"
																className={cn(
																	liabilityBtnGhostClass,
																	'h-[26px]'
																)}
																onClick={() =>
																	void onRemoveBalance(entry.id)
																}
																disabled={balSubmitting}
															>
																Remove
															</button>
														) : null}
													</div>
													<div className="flex items-center justify-between gap-2">
														<span className="truncate text-[11.5px] text-paper-muted">
															{entry.source ?? '—'}
														</span>
														<span className="font-mono font-medium tabular-nums text-[var(--danger)]">
															{formatMoney(entry.balance_cents)}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								) : null}

								<div className="grid grid-cols-1 gap-2.5 rounded-paper border border-dashed border-paper-border bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))] p-3 sm:grid-cols-2">
									<label className={liabilityModalFieldClass}>
										<span className={liabilityModalFieldLabelClass}>Date</span>
										<input
											id="balDateInput"
											type="date"
											value={balDate}
											onChange={(event) => setBalDate(event.target.value)}
											className={cn(dateInputClass, 'h-8 w-full px-2.5')}
											disabled={balSubmitting}
										/>
									</label>
									<label className={liabilityModalFieldClass}>
										<span className={liabilityModalFieldLabelClass}>
											Balance ($)
										</span>
										<input
											id="balAmountInput"
											type="text"
											inputMode="decimal"
											value={balAmount}
											onChange={(event) => setBalAmount(event.target.value)}
											className={cn(
												inputDarkClass,
												'h-8 w-full px-2.5 font-mono'
											)}
											placeholder="0.00"
											disabled={balSubmitting}
										/>
									</label>
									<label className={cn(liabilityModalFieldClass, 'sm:col-span-2')}>
										<span className={liabilityModalFieldLabelClass}>Source</span>
										<input
											id="balSourceInput"
											type="text"
											value={balSource}
											onChange={(event) => setBalSource(event.target.value)}
											className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
											placeholder="e.g. Statement, loan portal"
											disabled={balSubmitting}
										/>
									</label>
									<div className="flex justify-end sm:col-span-2">
										<button
											type="button"
											className={liabilityBtnAccentClass}
											onClick={() => void onAddBalance()}
											disabled={balSubmitting}
										>
											{balSubmitting ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												'Add balance'
											)}
										</button>
									</div>
								</div>
							</div>
						</div>
					) : null}

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting || balSubmitting}
							className={liabilityBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || balSubmitting}
							className={liabilityBtnPrimaryClass}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Save changes'
							)}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				ref={deleteDialogRef}
				className={liabilityDialogClass}
				aria-labelledby="delete-liability-title"
				onCancel={(event) => {
					event.preventDefault();
					closeDeleteModal();
				}}
				onClose={() => {
					if (!submitting) {
						setDeleteTarget(null);
						setDeleteError(null);
					}
				}}
			>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Liabilities</span>
							<h2
								id="delete-liability-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Delete liability
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								{deleteTarget !== null
									? `Remove “${deleteTarget.name}” and its balance history? This cannot be undone.`
									: null}
							</p>
							{deleteError !== null ? (
								<p className={cn(liabilityFormErrorClass, 'mt-3')}>
									{deleteError}
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

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeDeleteModal}
							disabled={submitting}
							className={liabilityBtnClass}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onConfirmDelete()}
							disabled={submitting}
							className={liabilityBtnDangerClass}
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

			{toast !== null ? (
				<div
					role="status"
					className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-paper-fg px-4 py-2.5 text-[13px] font-medium text-paper-surface shadow-2xl shadow-paper-fg/25"
				>
					<span className="text-[var(--success)]">
						<Check size={15} />
					</span>
					<span>{toast}</span>
				</div>
			) : null}
		</PageShell>
	);
}
