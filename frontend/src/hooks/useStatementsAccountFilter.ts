import { useAccountFilter } from '@/hooks/useAccountFilter';
import { accountDisplayLabel } from '@/types/account';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'statementsSelectedAccountIds';

function readStoredIds(): string[] | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return null;
		}
		const ids: string[] = [];
		for (const item of parsed) {
			if (typeof item === 'string' && item.length > 0) {
				ids.push(item);
			}
		}
		return ids;
	} catch {
		return null;
	}
}

export function useStatementsAccountFilter() {
	const { accounts, accountsLoading } = useAccountFilter();
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		if (accounts.length === 0) {
			return;
		}
		const stored = readStoredIds();
		const validStored =
			stored?.filter((id) => accounts.some((account) => account.id === id)) ?? [];
		if (validStored.length > 0) {
			setSelectedIds(new Set(validStored));
			return;
		}
		setSelectedIds(new Set(accounts.map((account) => account.id)));
	}, [accounts]);

	const updateSelectedIds = useCallback((next: Set<string>) => {
		setSelectedIds(next);
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
	}, []);

	const allSelected =
		accounts.length > 0 && selectedIds.size === accounts.length;

	const filterLabel = useMemo(() => {
		if (allSelected || selectedIds.size === 0) {
			return 'All accounts';
		}
		if (selectedIds.size === 1) {
			const id = [...selectedIds][0];
			const account = accounts.find((entry) => entry.id === id);
			return account ? accountDisplayLabel(account) : '1 account';
		}
		return `${selectedIds.size} accounts`;
	}, [accounts, allSelected, selectedIds]);

	const apiAccountId = useMemo(() => {
		if (allSelected || selectedIds.size !== 1) {
			return null;
		}
		const id = [...selectedIds][0];
		const parsed = Number(id);
		return Number.isFinite(parsed) ? parsed : null;
	}, [allSelected, selectedIds]);

	const needsClientFilter = !allSelected && selectedIds.size > 1;

	const accountLabelMatchesFilter = useCallback(
		(accountLabel: string) => {
			if (allSelected) {
				return true;
			}
			return accounts.some(
				(account) =>
					selectedIds.has(account.id) &&
					accountDisplayLabel(account) === accountLabel
			);
		},
		[accounts, allSelected, selectedIds]
	);

	const statementMatchesFilter = useCallback(
		(financialAccountId: number | null | undefined) => {
			if (allSelected) {
				return true;
			}
			if (financialAccountId == null) {
				return false;
			}
			return selectedIds.has(String(financialAccountId));
		},
		[allSelected, selectedIds]
	);

	return {
		accounts,
		accountsLoading,
		selectedIds,
		setSelectedIds: updateSelectedIds,
		filterLabel,
		apiAccountId,
		needsClientFilter,
		allSelected,
		accountLabelMatchesFilter,
		statementMatchesFilter,
	};
}
