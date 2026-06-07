import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import { readAxiosRejectPayload } from "@/lib/utils/thunkError";
import { normalizeCategory } from "./category.get.all";

function rejectPayloadMessage(payload: unknown, fallback: string): string {
	return typeof payload === "string" ? payload : fallback;
}

export const restoreCategory = createAsyncThunk(
	"categories/restore",
	async (id: number, { rejectWithValue }) => {
		try {
			const response = await axios.put(`/api/categories/${id}/undelete`);
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
						"Failed to restore category"
					)
				);
			}
			return rejectWithValue("An unexpected error occurred");
		}
	}
);

export const restoreCategoryThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>
) =>
	builder
		.addCase(restoreCategory.pending, (state) => {
			state.categoriesError = null;
		})
		.addCase(restoreCategory.fulfilled, (state, action) => {
			const index = state.categories.findIndex(
				(category) => category.id === action.payload.id
			);
			if (index !== -1) {
				const existing = state.categories[index];
				state.categories[index] = {
					...action.payload,
					line_count: action.payload.line_count ?? existing.line_count,
					spending_total:
						action.payload.spending_total ?? existing.spending_total,
					income_total: action.payload.income_total ?? existing.income_total,
				};
			} else {
				state.categories = [...state.categories, action.payload];
			}
			state.categoriesError = null;
		})
		.addCase(restoreCategory.rejected, (state, action) => {
			state.categoriesError = rejectPayloadMessage(
				action.payload,
				"Failed to restore category"
			);
		});
