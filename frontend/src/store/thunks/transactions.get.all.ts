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
	category_id?: number | null;
};

function readString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null) {
		return null;
	}

	return typeof value === "string" ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

function readCategoryIdField(value: unknown): number | null | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (value === null) {
		return null;
	}
	const parsed = readFiniteNumber(value);
	return parsed === null ? undefined : parsed;
}

function normalizeTransaction(raw: unknown): Transaction | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const id = readFiniteNumber(Reflect.get(raw, "id"));
	const statementId = readFiniteNumber(Reflect.get(raw, "statement_id"));
	const description = readString(Reflect.get(raw, "description"));
	const amount = readFiniteNumber(Reflect.get(raw, "amount"));
	const transactionDate = readString(Reflect.get(raw, "transaction_date"));
	const lastUpdated = readString(Reflect.get(raw, "last_updated"));
	const deletedAt = readNullableString(Reflect.get(raw, "deleted_at"));
	const createdAt = readString(Reflect.get(raw, "created_at"));
	const status = readString(Reflect.get(raw, "status"));
	const balance = readFiniteNumber(Reflect.get(raw, "balance"));
	const categoryId = readCategoryIdField(Reflect.get(raw, "category_id"));

	if (
		id === null ||
		statementId === null ||
		description === null ||
		amount === null ||
		transactionDate === null ||
		lastUpdated === null ||
		createdAt === null ||
		status === null ||
		balance === null
	) {
		return null;
	}

	return {
		id,
		statement_id: statementId,
		description,
		amount,
		transaction_date: transactionDate,
		last_updated: lastUpdated,
		deleted_at: deletedAt,
		created_at: createdAt,
		status,
		balance,
		category_id: categoryId,
	};
}

function parseTransactionsPayload(payload: unknown): Transaction[] | string {
	if (!Array.isArray(payload)) {
		return "Invalid transactions response (expected an array)";
	}

	const normalized: Transaction[] = [];

	for (const item of payload) {
		const transaction = normalizeTransaction(item);

		if (!transaction) {
			return "Invalid transactions response (unexpected item shape)";
		}

		normalized.push(transaction);
	}

	return normalized;
}

type TransactionsLoadingSlice = {
	TransactionsReducer: { transactionsLoading: boolean };
};

export type GetAllTransactionsArg = void | { force?: boolean };

// This thunk fetches an array of Transactions
export const getAllTransactions = createAsyncThunk(
	"transactions/getAll", // Updated slice/action naming convention
	async (_arg: GetAllTransactionsArg, { rejectWithValue }) => { // Added rejectWithValue for better error handling
		try {
			const response = await axios.get(`/api/transactions`);
			const parsed = parseTransactionsPayload(response.data);

			if (typeof parsed === "string") {
				return rejectWithValue(parsed);
			}

			return parsed;
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
	},
	{
		condition: (arg, { getState }) => {
			if (arg && typeof arg === "object" && arg.force === true) {
				return true;
			}
			const state = getState() as TransactionsLoadingSlice;
			return !state.TransactionsReducer.transactionsLoading;
		},
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
			if (action.meta.condition) {
				return;
			}
			state.transactionsLoading = false;
			console.error("Error fetching transactions:", action.error);
			const payloadMessage =
				typeof action.payload === "string" ? action.payload : null;

			state.transactionsError = payloadMessage ?? action.error.message ?? null;
		});
