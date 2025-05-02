import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import type { CategoryMappingsMatch, MappingReducer } from "../slices/mappingSlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file

// --- Combined payload type ---
export type CreateMappingPayload = {
    pattern: string;
    match_type: CategoryMappingsMatch;
    category_id: number; // ID of the category/subcategory this mapping belongs to
    priority?: number; // Optional
};


// This thunk fetches an array of Transactions
export const createMapping = createAsyncThunk(
	"mapping/create", 
	async (data: CreateMappingPayload, { rejectWithValue }) => { 
		try {
			const response = await axios.post(`/api/category_mappings`, data)
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
export const createMappingThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof MappingReducer>>) =>
	builder
		.addCase(createMapping.pending, (state) => {
			
		})
		.addCase(createMapping.fulfilled, (state, action) => {
			state.mappings.push(action.payload);
		})
		.addCase(createMapping.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
		});
