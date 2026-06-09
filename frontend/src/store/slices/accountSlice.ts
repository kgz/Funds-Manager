import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
	readStoredAccountFilterId,
	writeStoredAccountFilterId,
} from '@/lib/utils/accountFilterStorage';
import {
	getAllAccountsThunkActions,
	type FinancialAccount,
} from '../thunks/account.get.all';
import { updateAccountThunkActions } from '../thunks/account.update.single';

type InitialState = {
	accountsLoading: boolean;
	accounts: FinancialAccount[];
	accountsError: string | null;
	selectedAccountId: string | null;
};

const initialState: InitialState = {
	accountsLoading: false,
	accounts: [],
	accountsError: null,
	selectedAccountId: readStoredAccountFilterId(),
};

const slice = createSlice({
	name: 'accounts',
	initialState,
	reducers: {
		setSelectedAccountId(state, action: PayloadAction<string | null>) {
			state.selectedAccountId = action.payload;
			writeStoredAccountFilterId(action.payload);
		},
	},
	extraReducers(builder) {
		getAllAccountsThunkActions(builder);
		updateAccountThunkActions(builder);
	},
});

export const { setSelectedAccountId } = slice.actions;
export const AccountReducer = slice.reducer;
