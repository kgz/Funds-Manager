import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import { CategoryMapping, type MappingReducer } from "../slices/mappingSlice";
import { _ } from "react-router/dist/development/fog-of-war-BLArG-qZ";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file



// This thunk fetches an array of Transactions
export const getMappings = createAsyncThunk(
	"mapping/get", 
	async (_, { rejectWithValue }) => { 
		try {
			const response = await axios.get<CategoryMapping[]>(`/api/category_mappings`)
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
export const getMappingThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof MappingReducer>>) =>
	builder
		.addCase(getMappings.pending, (state) => {
			
		})
		.addCase(getMappings.fulfilled, (state, action) => {
			state.mappings = action.payload;
		})
		.addCase(getMappings.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
		});
