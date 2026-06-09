import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSelectedAccountId } from '@/store/slices/accountSlice';
import { getAllAccounts } from '@/store/thunks/account.get.all';
import { accountDisplayLabel } from '@/types/account';

export function useAccountFilter() {
	const dispatch = useAppDispatch();
	const { accounts, accountsLoading, selectedAccountId } = useAppSelector(
		(state) => state.AccountReducer
	);

	useEffect(() => {
		void dispatch(getAllAccounts());
	}, [dispatch]);

	const setAccountId = (next: string | null) => {
		dispatch(setSelectedAccountId(next));
	};

	const selectedAccount = useMemo(
		() => accounts.find((account) => account.id === selectedAccountId) ?? null,
		[accounts, selectedAccountId]
	);

	const accountIdNumber = useMemo(() => {
		if (selectedAccountId === null) {
			return null;
		}
		const parsed = Number(selectedAccountId);
		return Number.isFinite(parsed) ? parsed : null;
	}, [selectedAccountId]);

	const selectedLabel = selectedAccount
		? accountDisplayLabel(selectedAccount)
		: 'All accounts';

	return {
		accounts,
		accountsLoading,
		accountId: selectedAccountId,
		accountIdNumber,
		setAccountId,
		selectedLabel,
	};
}
