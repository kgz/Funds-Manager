import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import { readAxiosRejectPayload } from "@/lib/utils/thunkError";
import { normalizeCategory } from "./category.get.all";

type CreateCategoryPayload = {
	name: string;
	parent_category_id?: string;
	colour?: string;
};

function rejectPayloadMessage(payload: unknown, fallback: string): string {
	return typeof payload === "string" ? payload : fallback;
}

export const createCategory = createAsyncThunk(
	"categories/create",
	async (data: CreateCategoryPayload, { rejectWithValue }) => {
		try {
			const response = await axios.post(`/api/categories`, data);
			const normalized = normalizeCategory(response.data);
			if (!normalized) {
				return rejectWithValue("Invalid category response");
			}
			return normalized;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						"Failed to create category"
					)
				);
			}
			return rejectWithValue("An unexpected error occurred");
		}
	}
);

export const createCategoryThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>
) =>
	builder
		.addCase(createCategory.pending, (state) => {
			state.categoriesError = null;
		})
		.addCase(createCategory.fulfilled, (state, action) => {
			state.categories.push(action.payload);
			state.categoriesError = null;
		})
		.addCase(createCategory.rejected, (state, action) => {
			state.categoriesError = rejectPayloadMessage(
				action.payload,
				"Failed to create category"
			);
		});
