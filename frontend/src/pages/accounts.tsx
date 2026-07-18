import { FormEvent, useEffect, useState } from 'react';
import { Edit2, Landmark, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	buttonOutlineClass,
	buttonPrimaryClass,
	glassCardClass,
	inputDarkClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { formatTransactionDate } from '@/lib/utils/dates';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllAccounts, type FinancialAccount } from '@/store/thunks/account.get.all';
import { updateAccount } from '@/store/thunks/account.update.single';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';

const EDIT_ACCOUNT_FORM_ID = 'edit-account-form';

const formatCurrency = (value: number): string => {
	const abs = Math.abs(value).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${value < 0 ? '-' : ''}$${abs}`;
};

export function AccountsPage() {
	const dispatch = useAppDispatch();
	const { accounts, accountsLoading, accountsError } = useAppSelector(
		(state) => state.AccountReducer
	);
	const [editing, setEditing] = useState<FinancialAccount | null>(null);
	const [bankName, setBankName] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [modalError, setModalError] = useState<string | null>(null);

	useEffect(() => {
		void dispatch(getAllAccounts());
	}, [dispatch]);

	const openEdit = (account: FinancialAccount) => {
		setEditing(account);
		setBankName(account.bank_name);
		setDisplayName(account.display_name);
		setModalError(null);
	};

	const closeEdit = () => {
		setEditing(null);
		setBankName('');
		setDisplayName('');
		setModalError(null);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (editing === null) {
			return;
		}
		const trimmedBankName = bankName.trim();
		const trimmedDisplayName = displayName.trim();
		if (trimmedBankName.length === 0) {
			setModalError('Bank name is required');
			return;
		}
		if (trimmedDisplayName.length === 0) {
			setModalError('Display name is required');
			return;
		}

		setSubmitting(true);
		setModalError(null);
		const result = await dispatch(
			updateAccount({
				id: editing.id,
				bank_name: trimmedBankName,
				display_name: trimmedDisplayName,
			})
		);
		setSubmitting(false);

		if (updateAccount.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to update account'));
			return;
		}
		closeEdit();
	};

	return (
		<PageShell>
			<PageHeader title="Accounts" />

			{accountsError !== null ? (
				<InlineAlert variant="error">{accountsError}</InlineAlert>
			) : null}

			{accountsLoading ? <PageLoadingState label="Loading accounts…" /> : null}

			{!accountsLoading && accounts.length === 0 ? (
				<EmptyState
					icon={Landmark}
					title="No accounts yet"
					description="Import a statement to create your first financial account."
				/>
			) : null}

			{!accountsLoading && accounts.length > 0 ? (
				<div className={glassCardClass}>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-paper-border text-left text-paper-muted">
								<th className="px-4 py-3 font-medium">Display name</th>
								<th className="px-4 py-3 font-medium">Bank</th>
								<th className="px-4 py-3 font-medium">Account number</th>
								<th className="px-4 py-3 font-medium">Statements</th>
								<th className="px-4 py-3 font-medium text-right">Last balance</th>
								<th className="px-4 py-3 font-medium">As at</th>
								<th className="px-4 py-3 font-medium" />
							</tr>
						</thead>
						<tbody>
							{accounts.map((account) => (
								<tr
									key={account.id}
									className="border-b border-paper-border text-paper-fg"
								>
									<td className="px-4 py-3">{account.display_name}</td>
									<td className="px-4 py-3">{account.bank_name}</td>
									<td className="px-4 py-3 font-mono text-paper-muted">
										{account.account_number}
									</td>
									<td className="px-4 py-3 tabular-nums">
										{account.statement_count ?? 0}
									</td>
									<td className="px-4 py-3 text-right tabular-nums font-mono">
										{account.lastKnownBalance != null ? (
											<span
												className={
													account.lastKnownBalance < 0
														? 'text-red-400'
														: 'text-emerald-300/90'
												}
											>
												{formatCurrency(account.lastKnownBalance)}
											</span>
										) : (
											<span className="text-paper-muted" title="No transactions yet">
												—
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-paper-muted">
										{account.lastKnownBalanceDate != null ? (
											formatTransactionDate(account.lastKnownBalanceDate)
										) : (
											<span className="text-paper-muted" title="No transactions yet">
												—
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-right">
										<button
											type="button"
											className={buttonOutlineClass}
											onClick={() => openEdit(account)}
										>
											<Edit2 size="1rem" className="inline-block mr-1" />
											Edit
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}

			<Modal
				open={editing !== null}
				onClose={closeEdit}
				closeDisabled={submitting}
				title="Edit account"
				description="Update the bank and display names used across filters, statements, and reports."
				footer={
					<>
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeEdit}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							form={EDIT_ACCOUNT_FORM_ID}
							className={cn(buttonPrimaryClass, 'min-w-[5rem]')}
							disabled={submitting || bankName.trim().length === 0 || displayName.trim().length === 0}
						>
							{submitting ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								'Save'
							)}
						</button>
					</>
				}
			>
				<form id={EDIT_ACCOUNT_FORM_ID} onSubmit={onSubmit}>
					{editing !== null ? (
						<dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-paper-border bg-paper px-3 py-3 text-sm">
							<dt className="text-paper-muted">Account number</dt>
							<dd className="font-mono text-paper-fg">{editing.account_number}</dd>
							<dt className="text-paper-muted">Parser</dt>
							<dd className="text-paper-fg">{editing.parser_name}</dd>
						</dl>
					) : null}

					{modalError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{modalError}
						</InlineAlert>
					) : null}

					<div className="space-y-4">
						<div>
							<label
								htmlFor="accountBankNameInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Bank
							</label>
							<input
								id="accountBankNameInput"
								type="text"
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								value={bankName}
								onChange={(event) => setBankName(event.target.value)}
								placeholder="e.g. Heritage, BankSA"
								autoFocus
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<label
								htmlFor="accountDisplayNameInput"
								className="mb-1.5 block text-sm font-medium text-paper-fg"
							>
								Display name
							</label>
							<input
								id="accountDisplayNameInput"
								type="text"
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								placeholder="e.g. Everyday, Offset, Joint savings"
								disabled={submitting}
								required
							/>
							<p className="mt-1.5 text-xs text-paper-muted">
								Shown in the account filter and missing-statement warnings.
							</p>
						</div>
					</div>
				</form>
			</Modal>
		</PageShell>
	);
}
