import { FormEvent, useEffect, useRef, useState } from 'react';
import { Check, CreditCard, Loader2, Pencil, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	eyebrowClass,
	glassCardClass,
	inputDarkClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { formatTransactionDate } from '@/lib/utils/dates';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllAccounts, type FinancialAccount } from '@/store/thunks/account.get.all';
import { updateAccount } from '@/store/thunks/account.update.single';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';

const acctBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const acctBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const acctBtnGhostClass =
	'inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

const accountDialogClass =
	'fixed inset-0 m-auto h-fit w-[min(440px,calc(100vw-32px))] max-h-[min(560px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const accountModalBodyClass =
	'flex flex-col gap-3 px-[22px] pb-[18px] pt-3.5 text-[13px] leading-[1.55] text-paper-fg [&_p]:m-0';

const accountModalFieldClass = 'flex flex-col gap-1.5';

const accountModalFieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted';

const accountFormErrorClass =
	'm-0 rounded-paper border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] px-2.5 py-2 text-xs text-[var(--danger)]';

const readonlyGridClass =
	'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-paper border border-paper-border bg-paper px-3 py-2.5 text-[13px]';

const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

const formatCurrency = (value: number): string => {
	const abs = Math.abs(value).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${value < 0 ? '-' : ''}$${abs}`;
};

function accountCountLabel(count: number): string {
	if (count === 0) {
		return 'No accounts linked';
	}
	return `${count} linked`;
}

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
	const [toast, setToast] = useState<string | null>(null);

	const editDialogRef = useRef<HTMLDialogElement>(null);
	const bankInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
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
		const dialog = editDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (editing !== null && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => {
				bankInputRef.current?.focus();
				bankInputRef.current?.select();
			});
		} else if (editing === null && dialog.open) {
			dialog.close();
		}
	}, [editing]);

	const openEdit = (account: FinancialAccount) => {
		setEditing(account);
		setBankName(account.bank_name);
		setDisplayName(account.display_name);
		setModalError(null);
	};

	const closeEdit = () => {
		if (submitting) {
			return;
		}
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
			setModalError('Bank name is required.');
			return;
		}
		if (trimmedDisplayName.length === 0) {
			setModalError('Display name is required.');
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

		setToast(`“${trimmedDisplayName}” updated.`);
		setEditing(null);
		setBankName('');
		setDisplayName('');
		setModalError(null);
	};

	if (accountsLoading && accounts.length === 0) {
		return <PageLoadingState label="Loading accounts…" />;
	}

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className={pageTitleClass}>Accounts</h1>
						{accountsLoading ? (
							<Loader2
								className="h-4 w-4 animate-spin text-secondary-default"
								aria-label="Loading"
							/>
						) : null}
					</div>
					<p className={pageSubtitleClass}>
						Bank accounts created when you import statements · Edit display names
						used in filters and reports
					</p>
				</div>
			</header>

			<div className={pageBodyClass}>
				{accountsError !== null ? (
					<InlineAlert variant="error">{accountsError}</InlineAlert>
				) : null}

				<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
						<div className="min-w-0">
							<h2 className={panelTitleClass}>Bank accounts</h2>
							<p className={panelHintClass}>{accountCountLabel(accounts.length)}</p>
						</div>
					</div>

					{accounts.length === 0 ? (
						<div className="px-6 py-12 text-center">
							<div
								className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted"
								aria-hidden
							>
								<CreditCard className="h-[22px] w-[22px]" strokeWidth={1.6} />
							</div>
							<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
								No accounts yet
							</h3>
							<p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-snug text-paper-muted">
								Import a statement to create your first financial account.{' '}
								<NavLink
									to="/statements"
									className="font-medium text-secondary-default underline underline-offset-2"
								>
									Go to Statements
								</NavLink>
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-[13px]">
								<thead>
									<tr>
										<th className={tableThClass}>Display name</th>
										<th className={tableThClass}>Bank</th>
										<th className={tableThClass}>Account number</th>
										<th className={cn(tableThClass, 'w-[72px] text-right')}>
											Statements
										</th>
										<th className={cn(tableThClass, 'w-[120px] text-right')}>
											Last balance
										</th>
										<th className={cn(tableThClass, 'w-[108px]')}>As at</th>
										<th className={cn(tableThClass, 'w-[72px] text-right')}>
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{accounts.map((account) => (
										<tr key={account.id}>
											<td className={tableTdClass}>{account.display_name}</td>
											<td className={tableTdClass}>{account.bank_name}</td>
											<td
												className={cn(
													tableTdClass,
													'font-mono tabular-nums text-paper-muted'
												)}
											>
												{account.account_number}
											</td>
											<td
												className={cn(
													tableTdClass,
													'text-right font-mono tabular-nums'
												)}
											>
												{account.statement_count ?? 0}
											</td>
											<td className={cn(tableTdClass, 'text-right')}>
												{account.lastKnownBalance != null ? (
													<span
														className={cn(
															'font-mono tabular-nums',
															account.lastKnownBalance < 0
																? 'text-[var(--danger)]'
																: 'text-[var(--success)]'
														)}
													>
														{formatCurrency(account.lastKnownBalance)}
													</span>
												) : (
													<span
														className="font-mono text-paper-muted"
														title="No transactions yet"
													>
														—
													</span>
												)}
											</td>
											<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
												{account.lastKnownBalanceDate != null ? (
													formatTransactionDate(account.lastKnownBalanceDate)
												) : (
													<span
														className="text-paper-muted"
														title="No transactions yet"
													>
														—
													</span>
												)}
											</td>
											<td className={cn(tableTdClass, 'text-right')}>
												<button
													type="button"
													className={acctBtnGhostClass}
													onClick={() => openEdit(account)}
													aria-label={`Edit ${account.display_name}`}
												>
													<Pencil className="h-3.5 w-3.5" strokeWidth={2} />
													Edit
												</button>
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
				ref={editDialogRef}
				className={accountDialogClass}
				aria-labelledby="edit-account-title"
				onCancel={(event) => {
					event.preventDefault();
					closeEdit();
				}}
				onClose={() => {
					if (!submitting) {
						setEditing(null);
						setBankName('');
						setDisplayName('');
						setModalError(null);
					}
				}}
			>
				<form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
					<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Accounts</span>
							<h2
								id="edit-account-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Edit account
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Update bank and display names — account number and parser are set at
								import.
							</p>
						</div>
						<button
							type="button"
							onClick={closeEdit}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					{editing !== null ? (
						<div className={accountModalBodyClass}>
							<dl className={readonlyGridClass}>
								<dt className={accountModalFieldLabelClass}>Account number</dt>
								<dd className="m-0 font-mono font-medium tabular-nums text-paper-fg">
									{editing.account_number}
								</dd>
								<dt className={accountModalFieldLabelClass}>Parser</dt>
								<dd className="m-0 font-mono font-medium text-paper-fg">
									{editing.parser_name}
								</dd>
							</dl>

							<label className={accountModalFieldClass}>
								<span className={accountModalFieldLabelClass}>Bank</span>
								<input
									ref={bankInputRef}
									id="accountBankNameInput"
									type="text"
									className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
									value={bankName}
									onChange={(event) => setBankName(event.target.value)}
									disabled={submitting}
									autoComplete="organization"
									required
								/>
							</label>

							<label className={accountModalFieldClass}>
								<span className={accountModalFieldLabelClass}>Display name</span>
								<input
									id="accountDisplayNameInput"
									type="text"
									className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
									value={displayName}
									onChange={(event) => setDisplayName(event.target.value)}
									disabled={submitting}
									autoComplete="off"
									required
								/>
								<p className="text-xs leading-snug text-paper-muted">
									Shown in the account filter and missing-statement warnings.
								</p>
							</label>

							{modalError !== null ? (
								<p className={accountFormErrorClass}>{modalError}</p>
							) : null}
						</div>
					) : null}

					<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeEdit}
							disabled={submitting}
							className={acctBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								submitting ||
								bankName.trim().length === 0 ||
								displayName.trim().length === 0
							}
							className={acctBtnPrimaryClass}
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
