import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import type { CategoryMapping, CategoryMappingsMatch, MappingReducer } from "../slices/mappingSlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file


// This thunk fetches an array of Transactions
export const deleteMapping = createAsyncThunk(
	"mapping/delete", 
	async (id: number, { rejectWithValue }) => { 
		try {
			const response = await axios.delete(`/api/category_mappings/${id}}`)
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
export const deleteMappingThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof MappingReducer>>) =>
	builder
		.addCase(deleteMapping.pending, (state) => {
			
		})
		.addCase(deleteMapping.fulfilled, (state, action) => {
			state.mappings = state.mappings.filter(mapping => mapping.id !== action.meta.arg)
		})
		.addCase(deleteMapping.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
		});
