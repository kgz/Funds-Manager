import { inputDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { accountDisplayLabel, type FinancialAccount } from '@/types/account';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type AccountMultiSelectProps = {
	accounts: FinancialAccount[];
	selectedIds: Set<string>;
	onSelectedIdsChange: (next: Set<string>) => void;
	disabled?: boolean;
	menuAlign?: 'left' | 'right';
	className?: string;
};

function filterLabel(accounts: FinancialAccount[], selectedIds: Set<string>): string {
	if (selectedIds.size === 0 || selectedIds.size === accounts.length) {
		return 'All accounts';
	}
	if (selectedIds.size === 1) {
		const id = [...selectedIds][0];
		const account = accounts.find((entry) => entry.id === id);
		return account ? accountDisplayLabel(account) : '1 account';
	}
	return `${selectedIds.size} accounts`;
}

export function AccountMultiSelect({
	accounts,
	selectedIds,
	onSelectedIdsChange,
	disabled = false,
	menuAlign = 'right',
	className,
}: AccountMultiSelectProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const allCheckboxRef = useRef<HTMLInputElement>(null);
	const searchId = useId();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');

	const allSelected = selectedIds.size === accounts.length && accounts.length > 0;

	const visibleAccounts = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return accounts;
		}
		return accounts.filter((account) =>
			accountDisplayLabel(account).toLowerCase().includes(query)
		);
	}, [accounts, search]);

	const label = filterLabel(accounts, selectedIds);

	useEffect(() => {
		const box = allCheckboxRef.current;
		if (!box) {
			return;
		}
		box.indeterminate = !allSelected && selectedIds.size > 0;
	}, [allSelected, selectedIds.size]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onDocumentClick = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
				setSearch('');
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setOpen(false);
				setSearch('');
			}
		};
		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	const toggleOpen = () => {
		if (disabled) {
			return;
		}
		setOpen((current) => !current);
		if (open) {
			setSearch('');
		}
	};

	const setAll = (checked: boolean) => {
		if (checked) {
			onSelectedIdsChange(new Set(accounts.map((account) => account.id)));
			return;
		}
		if (accounts.length > 0) {
			onSelectedIdsChange(new Set([accounts[0].id]));
		}
	};

	const toggleAccount = (accountId: string, checked: boolean) => {
		const next = new Set(selectedIds);
		if (checked) {
			next.add(accountId);
			onSelectedIdsChange(next);
			return;
		}
		if (next.size <= 1) {
			return;
		}
		next.delete(accountId);
		onSelectedIdsChange(next);
	};

	return (
		<div ref={rootRef} className={cn('relative shrink-0', className)}>
			<button
				type="button"
				className={cn(
					'inline-flex h-8 min-w-[180px] max-w-[240px] items-center justify-between gap-2 rounded-paper border border-paper-border bg-paper-surface px-2.5 text-[13px] text-paper-fg transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
					'hover:border-[color-mix(in_oklch,var(--fg)_18%,var(--border))]',
					'focus-visible:border-[color-mix(in_oklch,var(--accent)_50%,var(--border))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklch,var(--accent)_12%,transparent)]',
					open &&
						'border-[color-mix(in_oklch,var(--accent)_40%,var(--border))]'
				)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label="Filter by account"
				disabled={disabled}
				onClick={toggleOpen}
			>
				<span className="min-w-0 truncate text-left">{label}</span>
				<ChevronDown
					className={cn(
						'h-3 w-3 shrink-0 text-paper-muted transition-transform',
						open && 'rotate-180'
					)}
					strokeWidth={2}
					aria-hidden
				/>
			</button>

			{open ? (
				<div
					role="listbox"
					aria-multiselectable
					aria-label="Select accounts"
					className={cn(
						'absolute top-[calc(100%+4px)] z-40 min-w-full w-max max-w-[280px] rounded-[calc(var(--radius)+2px)] border border-paper-border bg-paper-surface p-1.5 shadow-[0_8px_24px_color-mix(in_oklch,var(--fg)_8%,transparent)]',
						menuAlign === 'right' ? 'right-0' : 'left-0'
					)}
				>
					<input
						id={searchId}
						type="text"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						onClick={(event) => event.stopPropagation()}
						placeholder="Search accounts…"
						aria-label="Search accounts"
						className={cn(inputDarkClass, 'mb-1 h-8 w-full px-2.5')}
					/>

					<label className="flex cursor-pointer items-center gap-2 rounded-paper px-2 py-1.5 text-[13px] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,var(--surface))]">
						<input
							ref={allCheckboxRef}
							type="checkbox"
							className="h-3.5 w-3.5 shrink-0 accent-[var(--fg)]"
							checked={allSelected}
							onChange={(event) => setAll(event.target.checked)}
						/>
						<span>All accounts</span>
					</label>

					<div
						className="mx-1.5 my-1 h-px bg-paper-border"
						aria-hidden
					/>

					{visibleAccounts.map((account) => (
						<label
							key={account.id}
							className="flex cursor-pointer items-center gap-2 rounded-paper px-2 py-1.5 text-[13px] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,var(--surface))]"
						>
							<input
								type="checkbox"
								className="h-3.5 w-3.5 shrink-0 accent-[var(--fg)]"
								checked={selectedIds.has(account.id)}
								onChange={(event) =>
									toggleAccount(account.id, event.target.checked)
								}
							/>
							<span>{accountDisplayLabel(account)}</span>
						</label>
					))}

					{visibleAccounts.length === 0 && search.trim().length > 0 ? (
						<p className="px-2 py-2 text-center text-xs text-paper-muted">
							No accounts match &ldquo;{search.trim()}&rdquo;
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}

export function accountMultiFilterLabel(
	accounts: FinancialAccount[],
	selectedIds: Set<string>
): string {
	return filterLabel(accounts, selectedIds);
}
