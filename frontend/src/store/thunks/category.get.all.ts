import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
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

function readString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null) {
		return null;
	}

	return typeof value === "string" ? value : null;
}

function normalizeCategory(raw: unknown): Category | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const id = readString(Reflect.get(raw, "id"));
	const name = readString(Reflect.get(raw, "name"));
	const parentCategoryId = readNullableString(Reflect.get(raw, "parent_category_id"));
	const deletedAt = readNullableString(Reflect.get(raw, "deleted_at"));
	const colourValue = Reflect.get(raw, "colour");
	const colour =
		colourValue === undefined ? undefined : readString(colourValue) ?? undefined;

	if (id === null || name === null) {
		return null;
	}

	return {
		id,
		name,
		parent_category_id: parentCategoryId,
		deleted_at: deletedAt,
		colour,
	};
}

function parseCategoriesPayload(payload: unknown): Category[] | string {
	if (!Array.isArray(payload)) {
		return "Invalid categories response (expected an array)";
	}

	const normalized: Category[] = [];

	for (const item of payload) {
		const category = normalizeCategory(item);

		if (!category) {
			return "Invalid categories response (unexpected item shape)";
		}

		normalized.push(category);
	}

	return normalized;
}

type CategoriesLoadingSlice = {
	CategoryReducer: { categoriesLoading: boolean };
};

// This thunk fetches an array of Transactions
export const getAllCategories = createAsyncThunk(
	"categories/getAll", 
	async (_, { rejectWithValue }) => { 
		try {
			const response = await axios.get(`/api/categories?include_deleted=true`);
			const parsed = parseCategoriesPayload(response.data);

			if (typeof parsed === "string") {
				return rejectWithValue(parsed);
			}

			return parsed;
		} catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axios error fetching transactions:", error.response?.data || error.message);
                return rejectWithValue(error.response?.data || 'Failed to fetch transactions');
            } else {
                console.error("Unexpected error fetching transactions:", error);
                return rejectWithValue('An unexpected error occurred');
            }
        }
	},
	{
		condition: (_, { getState }) => {
			const state = getState() as CategoriesLoadingSlice;
			return !state.CategoryReducer.categoriesLoading;
		},
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
			if (action.meta.condition) {
				return;
			}
			state.categoriesLoading = false;
			console.error("Error fetching transactions:", action.error);
			const payloadMessage =
				typeof action.payload === "string" ? action.payload : null;

			state.categoriesError = payloadMessage ?? action.error.message ?? null;
		});
