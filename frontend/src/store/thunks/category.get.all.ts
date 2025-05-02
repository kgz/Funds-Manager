import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { TransactionsReducer } from "../slices/transactionsSlice";
import type { CategoryReducer } from "../slices/categorySlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file



export type Category = {
    id: string;
    name: string;
    parent_category_id?: string | null;
    deleted_at?: string | null;
	colour?: string
};





// This thunk fetches an array of Transactions
export const getAllCategories = createAsyncThunk(
	"categories/getAll", 
	async (_, { rejectWithValue }) => { 
		try {
			const response = await axios.get<Category[]>(`/api/categories?include_deleted=true`);
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
export const getAllCategoriesThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>) =>
	builder
		.addCase(getAllCategories.pending, (state) => {
			state.categoriesLoading = true;
			state.categoriesError = null; 
		})
		.addCase(getAllCategories.fulfilled, (state, action) => {
			state.categoriesLoading = false;
			state.categories = action.payload;
			state.categoriesError = null; 
		})
		.addCase(getAllCategories.rejected, (state, action) => {
			state.categoriesLoading = false;
			console.error("Error fetching transactions:", action.error);
			state.categoriesError = action.error.message ?? null;
		});
