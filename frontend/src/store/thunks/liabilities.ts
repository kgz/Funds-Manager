import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import axios from 'axios';
import type { LiabilitiesReducer } from '../slices/liabilitiesSlice';
import {
	createLiability,
	deleteLiabilityItem,
	fetchLiabilities,
	updateLiability,
	type LiabilityWritePayload,
} from '@/types/liabilities';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';

export const getLiabilities = createAsyncThunk(
	'liabilities/getAll',
	async (_: void, { rejectWithValue }) => {
		try {
			return await fetchLiabilities();
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to fetch liabilities')
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to fetch liabilities');
		}
	}
);

export const createLiabilityThunk = createAsyncThunk(
	'liabilities/create',
	async (payload: LiabilityWritePayload, { rejectWithValue }) => {
		try {
			return await createLiability(payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to create liability')
				);
			}
			return rejectWithValue('Failed to create liability');
		}
	}
);

export const updateLiabilityThunk = createAsyncThunk(
	'liabilities/update',
	async (args: { id: string; payload: LiabilityWritePayload }, { rejectWithValue }) => {
		try {
			return await updateLiability(args.id, args.payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to update liability')
				);
			}
			return rejectWithValue('Failed to update liability');
		}
	}
);

export const deleteLiabilityThunk = createAsyncThunk(
	'liabilities/delete',
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteLiabilityItem(id);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to delete liability')
				);
			}
			return rejectWithValue('Failed to delete liability');
		}
	}
);

function rejectMessage(payload: unknown, fallback: string): string {
	return typeof payload === 'string' ? payload : fallback;
}

export const liabilitiesThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof LiabilitiesReducer>>
) => {
	builder
		.addCase(getLiabilities.pending, (state) => {
			state.loading = true;
			state.error = null;
		})
		.addCase(getLiabilities.fulfilled, (state, action) => {
			state.loading = false;
			state.items = action.payload.items;
			state.totalBalanceCents = action.payload.total_balance_cents;
			state.error = null;
		})
		.addCase(getLiabilities.rejected, (state, action) => {
			state.loading = false;
			state.error = rejectMessage(action.payload, 'Failed to fetch liabilities');
		})
		.addCase(createLiabilityThunk.fulfilled, (state) => {
			state.error = null;
		})
		.addCase(createLiabilityThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to create liability');
		})
		.addCase(updateLiabilityThunk.fulfilled, (state, action) => {
			state.items = state.items.map((item) =>
				item.id === action.payload.id ? action.payload : item
			);
			state.error = null;
		})
		.addCase(updateLiabilityThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to update liability');
		})
		.addCase(deleteLiabilityThunk.fulfilled, (state, action) => {
			state.items = state.items.filter((item) => item.id !== action.payload);
			state.error = null;
		})
		.addCase(deleteLiabilityThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to delete liability');
		});
};
