import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { AccountReducer } from '../slices/accountSlice';
import {
	updateAccountFields,
	type FinancialAccount,
	type UpdateAccountPayload,
} from '@/types/account';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';
import axios from 'axios';

type UpdateAccountArgs = {
	id: string;
} & UpdateAccountPayload;

export const updateAccount = createAsyncThunk(
	'accounts/update',
	async ({ id, ...payload }: UpdateAccountArgs, { rejectWithValue }) => {
		try {
			return await updateAccountFields(id, payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to update account')
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to update account');
		}
	}
);

export const updateAccountThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof AccountReducer>>
) =>
	builder.addCase(updateAccount.fulfilled, (state, action) => {
		const index = state.accounts.findIndex((row) => row.id === action.payload.id);
		if (index >= 0) {
			state.accounts[index] = action.payload;
		}
	});

export type { FinancialAccount };
