import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import axios from 'axios';
import type { PlannedReducer } from '../slices/plannedSlice';
import {
	createPlannedSpendingItem,
	deletePlannedSpendingItem,
	fetchPlannedSpending,
	updatePlannedSpendingItem,
	type CreatePlannedSpendingPayload,
	type PlannedSpendingQuery,
	type UpdatePlannedSpendingPayload,
} from '@/types/plannedSpending';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';

export const getPlannedSpending = createAsyncThunk(
	'planned/getAll',
	async (params: PlannedSpendingQuery, { rejectWithValue }) => {
		try {
			return await fetchPlannedSpending(params);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						'Failed to fetch planned spending'
					)
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to fetch planned spending');
		}
	}
);

export const createPlannedSpending = createAsyncThunk(
	'planned/create',
	async (payload: CreatePlannedSpendingPayload, { rejectWithValue }) => {
		try {
			return await createPlannedSpendingItem(payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						'Failed to create planned spending'
					)
				);
			}
			return rejectWithValue('Failed to create planned spending');
		}
	}
);

export const updatePlannedSpending = createAsyncThunk(
	'planned/update',
	async (
		args: { id: string; payload: UpdatePlannedSpendingPayload },
		{ rejectWithValue }
	) => {
		try {
			return await updatePlannedSpendingItem(args.id, args.payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						'Failed to update planned spending'
					)
				);
			}
			return rejectWithValue('Failed to update planned spending');
		}
	}
);

export const deletePlannedSpending = createAsyncThunk(
	'planned/delete',
	async (id: string, { rejectWithValue }) => {
		try {
			await deletePlannedSpendingItem(id);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						'Failed to delete planned spending'
					)
				);
			}
			return rejectWithValue('Failed to delete planned spending');
		}
	}
);

function rejectMessage(payload: unknown, fallback: string): string {
	return typeof payload === 'string' ? payload : fallback;
}

export const plannedThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof PlannedReducer>>
) => {
	builder
		.addCase(getPlannedSpending.pending, (state) => {
			state.loading = true;
			state.error = null;
		})
		.addCase(getPlannedSpending.fulfilled, (state, action) => {
			state.loading = false;
			state.items = action.payload.items;
			state.totalCents = action.payload.total_cents;
			state.error = null;
		})
		.addCase(getPlannedSpending.rejected, (state, action) => {
			state.loading = false;
			state.error = rejectMessage(
				action.payload,
				'Failed to fetch planned spending'
			);
		})
		.addCase(createPlannedSpending.fulfilled, (state) => {
			state.error = null;
		})
		.addCase(createPlannedSpending.rejected, (state, action) => {
			state.error = rejectMessage(
				action.payload,
				'Failed to create planned spending'
			);
		})
		.addCase(updatePlannedSpending.fulfilled, (state, action) => {
			state.items = state.items.map((item) =>
				item.id === action.payload.id ? action.payload : item
			);
			state.error = null;
		})
		.addCase(updatePlannedSpending.rejected, (state, action) => {
			state.error = rejectMessage(
				action.payload,
				'Failed to update planned spending'
			);
		})
		.addCase(deletePlannedSpending.fulfilled, (state, action) => {
			state.items = state.items.filter((item) => item.id !== action.payload);
			state.error = null;
		})
		.addCase(deletePlannedSpending.rejected, (state, action) => {
			state.error = rejectMessage(
				action.payload,
				'Failed to delete planned spending'
			);
		});
};
