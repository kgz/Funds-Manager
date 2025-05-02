import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file


// This thunk fetches an array of Transactions
export const deleteCategory = createAsyncThunk(
	"categories/delete", 
	async (id: number, { rejectWithValue }) => { 
		try {
			const response = await axios.delete(`/api/categories/${id}`);
			return response.data;
		} catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axios error fetching transactions:", error.response?.data || error.message);
                return rejectWithValue(error.response?.data || 'Failed to fetch transactions');
            } else {
                console.error("Unexpected error fetching transactions:", error);
                return rejectWithValue('An unexpected error occurred');
            }
        }
	}
);


// Define how the thunk interacts with the StatementsReducer state
export const deleteCategoryThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>) =>
	builder
		.addCase(deleteCategory.pending, (state) => {
			state.categoriesError = null; 
		})
		.addCase(deleteCategory.fulfilled, (state, action) => {
			const index = state.categories.findIndex(category => Number(category.id) === action.meta.arg);
			if (index !== -1) {
				state.categories[index] = {
					...state.categories[index],
					deleted_at: new Date().toISOString()
				}
			} else {
				state.categories = [...state.categories, action.payload]
			}

			state.categoriesError = null; 
		})
		.addCase(deleteCategory.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
			state.categoriesError = action.error.message ?? null;
		});
