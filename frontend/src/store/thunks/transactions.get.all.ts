import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { TransactionsReducer } from "../slices/transactionsSlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file

// Define the Transaction type based on your schema
export type Transaction = {
	id: number;
	statement_id: number;
	description: string;
	amount: number;
	transaction_date: string; // Keep as string, can be parsed later if needed
	last_updated: string;
	deleted_at: string | null; // Can be null
	created_at: string;
	status: string; // Consider using a specific literal type if statuses are fixed: 'parsed' | 'pending' etc.
	balance: number;
	// not actuallyin the db
	category_id?:number
};

// This thunk fetches an array of Transactions
export const getAllTransactions = createAsyncThunk(
	"transactions/getAll", // Updated slice/action naming convention
	async (_, { rejectWithValue }) => { // Added rejectWithValue for better error handling
		try {
			const response = await axios.get<Transaction[]>(`/api/transactions`);
			return response.data;
		} catch (error) {
            // Handle potential errors from axios or the API
            if (axios.isAxiosError(error)) {
                // Access specific axios error properties if needed
                console.error("Axios error fetching transactions:", error.response?.data || error.message);
                return rejectWithValue(error.response?.data || 'Failed to fetch transactions');
            } else {
                // Handle unexpected errors
                console.error("Unexpected error fetching transactions:", error);
                return rejectWithValue('An unexpected error occurred');
            }
        }
	}
);

// Type the builder with the actual state type from your slice
type TTransactionsReducer = ActionReducerMapBuilder<ReturnType<typeof TransactionsReducer>>;

// Define how the thunk interacts with the StatementsReducer state
export const getAllTransactionsThunkActions = (builder: TTransactionsReducer) =>
	builder
		.addCase(getAllTransactions.pending, (state) => {
			state.transactionsLoading = true; // Assuming 'statementsLoading' is the correct state field
			state.transactionsError = null; // Clear any previous errors
		})
		.addCase(getAllTransactions.fulfilled, (state, action) => {
			state.transactionsLoading = false;
			// Assuming 'statements' is the correct state field to store the transactions
			// If you have a separate field for transactions, update state.transactions instead
			state.transactions = action.payload;
			state.transactionsError = null; // Clear any previous errors
		})
		.addCase(getAllTransactions.rejected, (state, action) => {
			state.transactionsLoading = false;
			console.error("Error fetching transactions:", action.error);
			state.transactionsError = action.error.message ?? null;
			// Store the error message (using rejectWithValue payload)
            // Assuming 'statementsError' is the correct state field for errors
            // Optionally clear the data on failure, or keep stale data
            // state.statements = [];
		});
