import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import { CategoryMapping, type MappingReducer } from "../slices/mappingSlice";
// Assuming your statementsSlice defines a state shape like StatementsState
// Import the actual state type from your slice file



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

function readString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function readMatchType(value: unknown): CategoryMapping["match_type"] | null {
	if (value === "Exact" || value === "Regex") {
		return value;
	}

	return null;
}

function normalizeMapping(raw: unknown): CategoryMapping | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const id = readFiniteNumber(Reflect.get(raw, "id"));
	const pattern = readString(Reflect.get(raw, "pattern"));
	const matchType = readMatchType(Reflect.get(raw, "match_type"));
	const categoryId = readFiniteNumber(Reflect.get(raw, "category_id"));
	const priority = readFiniteNumber(Reflect.get(raw, "priority"));
	const createdAt = readString(Reflect.get(raw, "created_at"));
	const updatedAt = readString(Reflect.get(raw, "updated_at"));

	if (
		id === null ||
		pattern === null ||
		matchType === null ||
		categoryId === null ||
		priority === null ||
		createdAt === null ||
		updatedAt === null
	) {
		return null;
	}

	return {
		id,
		pattern,
		match_type: matchType,
		category_id: categoryId,
		priority,
		created_at: createdAt,
		updated_at: updatedAt,
	};
}

function parseMappingsPayload(payload: unknown): CategoryMapping[] | string {
	if (!Array.isArray(payload)) {
		return "Invalid category mappings response (expected an array)";
	}

	const normalized: CategoryMapping[] = [];

	for (const item of payload) {
		const mapping = normalizeMapping(item);

		if (!mapping) {
			return "Invalid category mappings response (unexpected item shape)";
		}

		normalized.push(mapping);
	}

	return normalized;
}

function mappingsRequestInFlight(rootState: unknown): boolean {
	const mappingReducer = Reflect.get(rootState, "MappingReducer");
	if (!mappingReducer || typeof mappingReducer !== "object") {
		return false;
	}

	return Reflect.get(mappingReducer, "mappingsLoading") === true;
}

// This thunk fetches an array of Transactions
export const getMappings = createAsyncThunk(
	"mapping/get", 
	async (_, { rejectWithValue }) => { 
		try {
			const response = await axios.get(`/api/category_mappings`);
			const parsed = parseMappingsPayload(response.data);

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
		condition: (_, { getState }) => !mappingsRequestInFlight(getState()),
	}
);


// Define how the thunk interacts with the StatementsReducer state
export const getMappingThunkActions = (builder: ActionReducerMapBuilder<ReturnType<typeof MappingReducer>>) =>
	builder
		.addCase(getMappings.pending, (state) => {
			state.mappingsLoading = true;
		})
		.addCase(getMappings.fulfilled, (state, action) => {
			state.mappingsLoading = false;
			state.mappings = action.payload;
		})
		.addCase(getMappings.rejected, (state, action) => {
			console.error("Error fetching transactions:", action.error);
			state.mappingsLoading = false;
			state.mappings = [];
		});
