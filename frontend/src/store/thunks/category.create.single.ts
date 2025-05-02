import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file

// --- Combined payload type ---
type CreateCategoryPayload = {
    name: string;
    parent_category_id?: string;
	colour?: string 
};

// This thunk fetches an array of Transactions
export const createCategory = createAsyncThunk(
	"categories/create", 
	async (data: CreateCategoryPayload, { rejectWithValue }) => { 
		try {
			const response = await axios.post(`/api/categories`, data)
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
export const createCategoryThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>) =>
	builder
		.addCase(createCategory.pending, (state) => {
			state.categoriesError = null; 
		})
		.addCase(createCategory.fulfilled, (state, action) => {
			state.categories.push(action.payload);
			state.categoriesError = null; 
		})
		.addCase(createCategory.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
			state.categoriesError = action.error.message ?? null;
		});
