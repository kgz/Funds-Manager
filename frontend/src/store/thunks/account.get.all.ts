import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { AccountReducer } from '../slices/accountSlice';
import { fetchAccounts, type FinancialAccount } from '@/types/account';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';
import axios from 'axios';

export const getAllAccounts = createAsyncThunk(
	'accounts/getAll',
	async (_, { rejectWithValue }) => {
		try {
			return await fetchAccounts(true);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to fetch accounts')
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to fetch accounts');
		}
	}
);

export const getAllAccountsThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof AccountReducer>>
) =>
	builder
		.addCase(getAllAccounts.pending, (state) => {
			state.accountsLoading = true;
			state.accountsError = null;
		})
		.addCase(getAllAccounts.fulfilled, (state, action) => {
			state.accountsLoading = false;
			state.accounts = action.payload;
			state.accountsError = null;
		})
		.addCase(getAllAccounts.rejected, (state, action) => {
			state.accountsLoading = false;
			state.accountsError =
				typeof action.payload === 'string'
					? action.payload
					: action.error.message ?? 'Failed to fetch accounts';
		});

export type { FinancialAccount };
