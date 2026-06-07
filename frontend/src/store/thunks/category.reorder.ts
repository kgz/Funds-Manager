import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';
import { normalizeCategory, type Category } from './category.get.all';

type ReorderCategoriesArgs = {
	orderedIds: string[];
};

export const reorderCategories = createAsyncThunk(
	'categories/reorder',
	async (args: ReorderCategoriesArgs, { rejectWithValue }) => {
		const orderedIds = args.orderedIds.map((id) => Number(id));
		try {
			const response = await axios.patch('/api/categories/reorder', {
				ordered_ids: orderedIds,
			});
			if (!Array.isArray(response.data)) {
				return rejectWithValue('Invalid reorder response');
			}
			const updated: Category[] = [];
			for (const item of response.data) {
				const normalized = normalizeCategory(item);
				if (!normalized) {
					return rejectWithValue('Invalid reorder response');
				}
				updated.push(normalized);
			}
			return updated;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to reorder categories')
				);
			}
			return rejectWithValue('An unexpected error occurred');
		}
	}
);
