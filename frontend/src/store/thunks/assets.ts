import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AssetsReducer } from '../slices/assetsSlice';
import {
	createAsset,
	deleteAssetItem,
	fetchAssets,
	updateAsset,
	type AssetWritePayload,
} from '@/types/assets';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';

export const getAssets = createAsyncThunk(
	'assets/getAll',
	async (_: void, { rejectWithValue }) => {
		try {
			return await fetchAssets();
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to fetch assets')
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to fetch assets');
		}
	}
);

export const createAssetThunk = createAsyncThunk(
	'assets/create',
	async (payload: AssetWritePayload, { rejectWithValue }) => {
		try {
			return await createAsset(payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to create asset')
				);
			}
			return rejectWithValue('Failed to create asset');
		}
	}
);

export const updateAssetThunk = createAsyncThunk(
	'assets/update',
	async (args: { id: string; payload: AssetWritePayload }, { rejectWithValue }) => {
		try {
			return await updateAsset(args.id, args.payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to update asset')
				);
			}
			return rejectWithValue('Failed to update asset');
		}
	}
);

export const deleteAssetThunk = createAsyncThunk(
	'assets/delete',
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteAssetItem(id);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to delete asset')
				);
			}
			return rejectWithValue('Failed to delete asset');
		}
	}
);

function rejectMessage(payload: unknown, fallback: string): string {
	return typeof payload === 'string' ? payload : fallback;
}

export const assetsThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof AssetsReducer>>
) => {
	builder
		.addCase(getAssets.pending, (state) => {
			state.loading = true;
			state.error = null;
		})
		.addCase(getAssets.fulfilled, (state, action) => {
			state.loading = false;
			state.items = action.payload.items;
			state.totalValueCents = action.payload.total_value_cents;
			state.error = null;
		})
		.addCase(getAssets.rejected, (state, action) => {
			state.loading = false;
			state.error = rejectMessage(action.payload, 'Failed to fetch assets');
		})
		.addCase(createAssetThunk.fulfilled, (state) => {
			state.error = null;
		})
		.addCase(createAssetThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to create asset');
		})
		.addCase(updateAssetThunk.fulfilled, (state, action) => {
			state.items = state.items.map((item) =>
				item.id === action.payload.id ? action.payload : item
			);
			state.error = null;
		})
		.addCase(updateAssetThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to update asset');
		})
		.addCase(deleteAssetThunk.fulfilled, (state, action) => {
			state.items = state.items.filter((item) => item.id !== action.payload);
			state.error = null;
		})
		.addCase(deleteAssetThunk.rejected, (state, action) => {
			state.error = rejectMessage(action.payload, 'Failed to delete asset');
		});
};
