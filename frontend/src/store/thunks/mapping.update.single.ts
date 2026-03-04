import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import type { CategoryMapping, CategoryMappingsMatch, MappingReducer } from "../slices/mappingSlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file

// --- Combined payload type ---
type UpdateMappingPayload = {
    pattern?: string;
    match_type?: CategoryMappingsMatch;
    category_id?: number; // Usually not changed, but API allows it
    priority?: number;
};


// This thunk fetches an array of Transactions
export const editMapping = createAsyncThunk(
	"mapping/update", 
	async (data: Partial<CategoryMapping> & {id: number}, { rejectWithValue }) => { 
		console.log(`/api/category_mappings/${data.id}}`)
		try {
			const response = await axios.put(`/api/category_mappings/${data.id}`, data)
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
export const editMappingThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof MappingReducer>>) =>
	builder
		.addCase(editMapping.pending, (state) => {
			
		})
		.addCase(editMapping.fulfilled, (state, action) => {
			const index = state.mappings.findIndex(mapping => mapping.id === action.payload.id);
			if (index !== -1) {
				state.mappings[index] = action.payload;
			}
		})
		.addCase(editMapping.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
		});
