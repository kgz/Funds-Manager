import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import type { Category } from "./category.get.all";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file

// --- Combined payload type ---


// This thunk fetches an array of Transactions
export const updateCategory = createAsyncThunk(
	"categories/update", 
	async (data: Partial<Category> & { id: Category['id'] }, { rejectWithValue }) => { 
		try {
			const response = await axios.put<Category>(`/api/categories/${data.id}`, data)
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
export const updateCategoryThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>) =>
	builder
		.addCase(updateCategory.pending, (state) => {
			state.categoriesError = null; 
		})
		.addCase(updateCategory.fulfilled, (state, action) => {
			const index = state.categories.findIndex(category => category.id === action.payload.id);
			if (index !== -1) {
				state.categories[index] = action.payload;
			}
			state.categoriesError = null; 
		})
		.addCase(updateCategory.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
			state.categoriesError = action.error.message ?? null;
		});
