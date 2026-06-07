import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';
import { normalizeCategory } from './category.get.all';

type MergeCategoryArgs = {
	sourceId: string;
	targetCategoryId: string;
};

export const mergeCategory = createAsyncThunk(
	'categories/merge',
	async (args: MergeCategoryArgs, { rejectWithValue }) => {
		try {
			const response = await axios.post(
				`/api/categories/${args.sourceId}/merge`,
				{ target_category_id: Number(args.targetCategoryId) }
			);
			const normalized = normalizeCategory(response.data);
			if (!normalized) {
				return rejectWithValue('Invalid category response');
			}
			return { sourceId: args.sourceId, target: normalized };
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to merge categories')
				);
			}
			return rejectWithValue('An unexpected error occurred');
		}
	}
);
