import { FormEvent, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { Edit2, Landmark, Loader2, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import {
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	dateInputClass,
	glassCardClass,
	inputDarkClass,
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

type ModalMode = 'add' | 'edit';

const LIABILITY_FORM_ID = 'liability-form';

const formatMoney = (cents: number) =>
	`$${Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

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

function formatRate(liability: Liability): string {
	if (liability.interest_rate_bps === null) {
		return '—';
	}
	const suffix = liability.rate_type ? ` ${liability.rate_type}` : '';
	return `${bpsToPercentText(liability.interest_rate_bps)}%${suffix}`;
}

function formatRepayment(liability: Liability): string {
	if (liability.repayment_cents === null) {
		return '—';
	}
	const freq = liability.repayment_frequency ? `/${liability.repayment_frequency}` : '';
	return `${formatMoney(liability.repayment_cents)}${freq}`;
}

function formatBalancedAt(balancedAt: string | null): string {
	if (!balancedAt) {
		return '—';
	}
	const parsed = DateTime.fromISO(balancedAt);
	return parsed.isValid ? parsed.toFormat('d MMM yyyy') : '—';
}

export default function LiabilitiesPage() {
	const dispatch = useAppDispatch();
	const { items, totalBalanceCents, loading, error } = useAppSelector(
		(state) => state.LiabilitiesReducer
	);
	const { accounts } = useAppSelector((state) => state.AccountReducer);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingItem, setEditingItem] = useState<Liability | null>(null);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<LiabilityKind>('home_loan');
	const [lender, setLender] = useState('');
	const [balance, setBalance] = useState('');
	const [creditLimit, setCreditLimit] = useState('');
	const [originalAmount, setOriginalAmount] = useState('');
	const [originatedDate, setOriginatedDate] = useState('');
	const [ratePercent, setRatePercent] = useState('');
	const [rateType, setRateType] = useState<LiabilityRateType | ''>('');
	const [repayment, setRepayment] = useState('');
	const [frequency, setFrequency] = useState<LiabilityFrequency | ''>('');
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

	useEffect(() => {
		void dispatch(getLiabilities());
		void dispatch(getAllAccounts());
	}, [dispatch]);

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

	const openAddModal = () => {
		setModalMode('add');
		setEditingItem(null);
		setName('');
		setKind('home_loan');
		setLender('');
		setBalance('');
		setCreditLimit('');
		setOriginalAmount('');
		setOriginatedDate('');
		setRatePercent('');
		setRateType('');
		setRepayment('');
		setFrequency('');
		setTermMonths('');
		setAccountId('');
		setNotes('');
		setBalances([]);
		setModalError(null);
		setModalOpen(true);
	};

	const openEditModal = (item: Liability) => {
		setModalMode('edit');
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
		setModalOpen(true);
		void loadBalances(item.id);
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

		const termValue = termMonths.trim();
		let termPayload: number | null = null;
		if (termValue.length > 0) {
			const parsed = Number(termValue);
			if (!Number.isInteger(parsed) || parsed < 0) {
				setModalError('Term must be a whole number of months');
				return;
			}
			termPayload = parsed;
		}

		const originalAmountCents = parsePositiveDollarsToCents(originalAmount);

		if (modalMode === 'edit' && editingItem !== null) {
			const payload = {
				name: trimmedName,
				kind,
				lender: lender.trim().length > 0 ? lender.trim() : null,
				balance_cents: editingItem.balance_cents,
				credit_limit_cents: parsePositiveDollarsToCents(creditLimit),
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
			closeModal();
			void dispatch(getLiabilities());
			return;
		}

		const balanceCents = parsePositiveDollarsToCents(balance);
		if (balanceCents === null) {
			setModalError('Enter a current balance');
			return;
		}

		if (originalAmount.trim().length > 0 && originalAmountCents === null) {
			setModalError('Enter a valid original amount');
			return;
		}
		if (originalAmountCents !== null && originatedDate.length < 10) {
			setModalError('Enter a start date for the original amount');
			return;
		}

		const payload = {
			name: trimmedName,
			kind,
			lender: lender.trim().length > 0 ? lender.trim() : null,
			balance_cents: balanceCents,
			credit_limit_cents: parsePositiveDollarsToCents(creditLimit),
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

		closeModal();
		void dispatch(getLiabilities());
	};

	const onAddBalance = async () => {
		if (editingItem === null) {
			return;
		}
		const amountCents = parsePositiveDollarsToCents(balAmount);
		if (amountCents === null) {
			setModalError('Enter a balance amount');
			return;
		}
		if (balDate.length < 10) {
			setModalError('Enter a balance date');
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
		} catch {
			setModalError('Failed to add balance snapshot');
		} finally {
			setBalSubmitting(false);
		}
	};

	const onRemoveBalance = async (balanceId: string) => {
		if (editingItem === null) {
			return;
		}
		setBalSubmitting(true);
		setModalError(null);
		try {
			await deleteLiabilityBalance(editingItem.id, balanceId);
			await loadBalances(editingItem.id);
			void dispatch(getLiabilities());
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
		setSubmitting(true);
		const result = await dispatch(deleteLiabilityThunk(deleteTarget.id));
		setSubmitting(false);

		if (deleteLiabilityThunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to delete liability'));
			return;
		}

		closeDeleteModal();
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;
	const showEmpty = !loading && items.length === 0 && error === null;

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

	return (
		<PageShell variant="table">
			<div className="space-y-3 border-b border-paper-border p-4">
				<PageHeader
					title="Liabilities"
					subtitle="Loans and debts you owe — home loan, car loan, credit cards and more."
					icon={<Landmark className="h-6 w-6 text-secondary-default" />}
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
						<button type="button" className={buttonPrimaryClass} onClick={openAddModal}>
							<Plus size="1rem" className="inline-block mr-1" />
							Add liability
						</button>
					}
				/>

				<div className="flex justify-end">
					<StatCard
						label="Total owed"
						value={formatMoney(totalBalanceCents)}
						valueClassName="text-red-300"
						hint="Sum of all current balances."
						align="right"
					/>
				</div>

				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}
			</div>

			{showEmpty ? (
				<EmptyState
					icon={Landmark}
					title="No liabilities yet"
					description="Add your loans and debts to build a full picture of your finances."
					action={
						<button type="button" className={buttonPrimaryClass} onClick={openAddModal}>
							<Plus size="1rem" className="inline-block mr-1" />
							Add liability
						</button>
					}
				/>
			) : null}

			{!loading && items.length > 0 ? (
				<div className={glassCardClass}>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-paper-border text-left text-paper-muted">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Type</th>
								<th className="px-4 py-3 font-medium">Lender</th>
								<th className="px-4 py-3 font-medium text-right">Balance</th>
								<th className="px-4 py-3 font-medium text-right">Rate</th>
								<th className="px-4 py-3 font-medium text-right">Repayment</th>
								<th className="px-4 py-3 font-medium" />
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id} className="border-b border-paper-border text-paper-fg">
									<td className="px-4 py-3 font-medium">{item.name}</td>
									<td className="px-4 py-3">
										<span className="rounded-full border border-paper-border bg-paper px-2 py-0.5 text-xs text-paper-muted">
											{liabilityKindLabel(item.kind)}
										</span>
									</td>
									<td className="px-4 py-3 text-paper-muted">{item.lender ?? '—'}</td>
									<td className="px-4 py-3 text-right font-mono tabular-nums text-red-300">
										{formatMoney(item.balance_cents)}
									</td>
									<td className="px-4 py-3 text-right text-paper-muted">
										{formatRate(item)}
									</td>
									<td className="px-4 py-3 text-right font-mono tabular-nums text-paper-muted">
										{formatRepayment(item)}
									</td>
									<td className="px-4 py-3 text-right whitespace-nowrap">
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
							))}
						</tbody>
					</table>
				</div>
			) : null}

			<Modal
				open={modalOpen}
				onClose={closeModal}
				closeDisabled={submitting}
				title={modalMode === 'add' ? 'Add liability' : 'Edit liability'}
				description="Record the loan or debt details."
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
							form={LIABILITY_FORM_ID}
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
				<form id={LIABILITY_FORM_ID} onSubmit={onSubmit}>
					{modalError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{modalError}
						</InlineAlert>
					) : null}

					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="liabilityNameInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Name
								</label>
								<input
									id="liabilityNameInput"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2')}
									placeholder="e.g. Home loan"
									autoFocus
									disabled={submitting}
									required
								/>
							</div>

							<div>
								<label
									htmlFor="liabilityKindInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Type
								</label>
								<select
									id="liabilityKindInput"
									value={kind}
									onChange={(e) => setKind(toKind(e.target.value))}
									className={cn(selectDarkClass, 'w-full')}
									disabled={submitting}
								>
									{LIABILITY_KIND_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="liabilityLenderInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Lender (optional)
								</label>
								<input
									id="liabilityLenderInput"
									type="text"
									value={lender}
									onChange={(e) => setLender(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2')}
									placeholder="e.g. BankSA"
									disabled={submitting}
								/>
							</div>

							<div>
								<label
									htmlFor="liabilityBalanceInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Current balance ($)
								</label>
								{modalMode === 'add' ? (
									<input
										id="liabilityBalanceInput"
										type="text"
										inputMode="decimal"
										value={balance}
										onChange={(e) => setBalance(e.target.value)}
										className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
										placeholder="0.00"
										disabled={submitting}
										required
									/>
								) : (
									<p className="px-3 py-2 font-mono text-red-300">
										{editingItem ? formatMoney(editingItem.balance_cents) : '—'}
									</p>
								)}
							</div>

							{modalMode === 'add' ? (
								<>
									<div>
										<label
											htmlFor="liabilityOriginalInput"
											className="mb-1.5 block text-sm font-medium text-paper-fg"
										>
											Original amount ($, optional)
										</label>
										<input
											id="liabilityOriginalInput"
											type="text"
											inputMode="decimal"
											value={originalAmount}
											onChange={(e) => setOriginalAmount(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
											placeholder="0.00"
											disabled={submitting}
										/>
									</div>

									<div>
										<label
											htmlFor="liabilityOriginatedInput"
											className="mb-1.5 block text-sm font-medium text-paper-fg"
										>
											Started at (optional)
										</label>
										<input
											id="liabilityOriginatedInput"
											type="date"
											value={originatedDate}
											onChange={(e) => setOriginatedDate(e.target.value)}
											className={cn(dateInputClass, 'w-full px-3 py-2')}
											disabled={submitting}
										/>
									</div>
								</>
							) : null}

							<div>
								<label
									htmlFor="liabilityLimitInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Credit limit ($, optional)
								</label>
								<input
									id="liabilityLimitInput"
									type="text"
									inputMode="decimal"
									value={creditLimit}
									onChange={(e) => setCreditLimit(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
									placeholder="0.00"
									disabled={submitting}
								/>
							</div>

							{modalMode === 'edit' ? (
								<div>
									<label
										htmlFor="liabilityOriginalEditInput"
										className="mb-1.5 block text-sm font-medium text-paper-fg"
									>
										Original amount ($, optional)
									</label>
									<input
										id="liabilityOriginalEditInput"
										type="text"
										inputMode="decimal"
										value={originalAmount}
										onChange={(e) => setOriginalAmount(e.target.value)}
										className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
										placeholder="0.00"
										disabled={submitting}
									/>
								</div>
							) : null}

							<div>
								<label
									htmlFor="liabilityRateInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Interest rate (%, optional)
								</label>
								<input
									id="liabilityRateInput"
									type="text"
									inputMode="decimal"
									value={ratePercent}
									onChange={(e) => setRatePercent(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
									placeholder="6.53"
									disabled={submitting}
								/>
							</div>

							<div>
								<label
									htmlFor="liabilityRateTypeInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Rate type (optional)
								</label>
								<select
									id="liabilityRateTypeInput"
									value={rateType}
									onChange={(e) => setRateType(toRateType(e.target.value))}
									className={cn(selectDarkClass, 'w-full')}
									disabled={submitting}
								>
									<option value="">—</option>
									<option value="variable">Variable</option>
									<option value="fixed">Fixed</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="liabilityRepaymentInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Repayment ($, optional)
								</label>
								<input
									id="liabilityRepaymentInput"
									type="text"
									inputMode="decimal"
									value={repayment}
									onChange={(e) => setRepayment(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
									placeholder="0.00"
									disabled={submitting}
								/>
							</div>

							<div>
								<label
									htmlFor="liabilityFrequencyInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Repayment frequency (optional)
								</label>
								<select
									id="liabilityFrequencyInput"
									value={frequency}
									onChange={(e) => setFrequency(toFrequency(e.target.value))}
									className={cn(selectDarkClass, 'w-full')}
									disabled={submitting}
								>
									<option value="">—</option>
									{LIABILITY_FREQUENCY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="liabilityTermInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Term remaining (months, optional)
								</label>
								<input
									id="liabilityTermInput"
									type="text"
									inputMode="numeric"
									value={termMonths}
									onChange={(e) =>
										setTermMonths(e.target.value.replace(/[^\d]/g, ''))
									}
									className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
									placeholder="e.g. 300"
									disabled={submitting}
								/>
							</div>

							<div>
								<label
									htmlFor="liabilityAccountInput"
									className="mb-1.5 block text-sm font-medium text-paper-fg"
								>
									Linked account (optional)
								</label>
								<select
									id="liabilityAccountInput"
									value={accountId}
									onChange={(e) => setAccountId(e.target.value)}
									className={cn(selectDarkClass, 'w-full')}
									disabled={submitting}
								>
									<option value="">None</option>
									{accounts
										.filter((account) => !account.deleted_at)
										.map((account) => (
											<option key={account.id} value={account.id}>
												{account.display_name}
											</option>
										))}
								</select>
							</div>
						</div>

						<div>
							<label
								htmlFor="liabilityNotesInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Notes (optional)
							</label>
							<textarea
								id="liabilityNotesInput"
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

						{modalMode === 'edit' ? (
							<div className="rounded-lg border border-paper-border bg-paper p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-sm font-medium text-paper-fg">
										Balance history
									</span>
									{balancesLoading ? (
										<Loader2 className="h-4 w-4 animate-spin text-secondary-default" />
									) : null}
								</div>

								{!balancesLoading && balances.length === 0 ? (
									<p className="text-xs text-paper-muted">No balance snapshots yet.</p>
								) : null}

								{balances.length > 0 ? (
									<ul className="mb-3 space-y-1.5">
										{balances.map((entry) => (
											<li
												key={entry.id}
												className="flex items-center justify-between gap-2 rounded-md bg-paper px-2.5 py-1.5 text-sm"
											>
												<span className="text-paper-muted">
													{formatBalancedAt(entry.balanced_at)}
												</span>
												<span className="font-mono tabular-nums text-red-300">
													{formatMoney(entry.balance_cents)}
												</span>
												<span className="flex-1 truncate text-xs text-paper-muted">
													{entry.source ?? ''}
												</span>
												<button
													type="button"
													className="text-paper-muted transition hover:text-red-300"
													onClick={() => void onRemoveBalance(entry.id)}
													disabled={balSubmitting}
													aria-label="Remove balance snapshot"
												>
													<Trash2 size="0.9rem" />
												</button>
											</li>
										))}
									</ul>
								) : null}

								<div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
									<div>
										<label
											htmlFor="balDateInput"
											className="mb-1 block text-xs text-paper-muted"
										>
											Date
										</label>
										<input
											id="balDateInput"
											type="date"
											value={balDate}
											onChange={(e) => setBalDate(e.target.value)}
											className={cn(dateInputClass, 'w-full px-2 py-1.5 text-sm')}
											disabled={balSubmitting}
										/>
									</div>
									<div>
										<label
											htmlFor="balAmountInput"
											className="mb-1 block text-xs text-paper-muted"
										>
											Balance ($)
										</label>
										<input
											id="balAmountInput"
											type="text"
											inputMode="decimal"
											value={balAmount}
											onChange={(e) => setBalAmount(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-2 py-1.5 font-mono text-sm')}
											placeholder="0.00"
											disabled={balSubmitting}
										/>
									</div>
									<div>
										<label
											htmlFor="balSourceInput"
											className="mb-1 block text-xs text-paper-muted"
										>
											Source (optional)
										</label>
										<input
											id="balSourceInput"
											type="text"
											value={balSource}
											onChange={(e) => setBalSource(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-2 py-1.5 text-sm')}
											placeholder="e.g. statement"
											disabled={balSubmitting}
										/>
									</div>
									<button
										type="button"
										className={cn(buttonOutlineClass, 'justify-center')}
										onClick={() => void onAddBalance()}
										disabled={balSubmitting}
									>
										{balSubmitting ? (
											<Loader2 className="inline-block h-4 w-4 animate-spin" />
										) : (
											<>
												<Plus size="0.9rem" className="mr-1 inline-block" />
												Add
											</>
										)}
									</button>
								</div>
							</div>
						) : null}
					</div>
				</form>
			</Modal>

			<Modal
				open={deleteTarget !== null}
				onClose={closeDeleteModal}
				closeDisabled={submitting}
				title="Delete liability"
				description={
					deleteTarget !== null
						? `Remove “${deleteTarget.name}” from liabilities?`
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
