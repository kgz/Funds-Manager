import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import { readAxiosRejectPayload } from "@/lib/utils/thunkError";

function rejectPayloadMessage(payload: unknown, fallback: string): string {
	return typeof payload === "string" ? payload : fallback;
}

export const deleteCategory = createAsyncThunk(
	"categories/delete",
	async (id: number, { rejectWithValue }) => {
		try {
			await axios.delete(`/api/categories/${id}`);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						"Failed to delete category"
					)
				);
			}
			return rejectWithValue("An unexpected error occurred");
		}
	}
);

export const deleteCategoryThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>
) =>
	builder
		.addCase(deleteCategory.pending, (state) => {
			state.categoriesError = null;
		})
		.addCase(deleteCategory.fulfilled, (state, action) => {
			const index = state.categories.findIndex(
				(category) => Number(category.id) === action.payload
			);
			if (index !== -1) {
				state.categories[index] = {
					...state.categories[index],
					deleted_at: new Date().toISOString(),
				};
			}
			state.categoriesError = null;
		})
		.addCase(deleteCategory.rejected, (state, action) => {
			state.categoriesError = rejectPayloadMessage(
				action.payload,
				"Failed to delete category"
			);
		});
