import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import { readAxiosRejectPayload } from "@/lib/utils/thunkError";
import type { UncategorizedUsage } from "@/lib/utils/categoryUsage";

export type Category = {
	id: string;
	name: string;
	description?: string | null;
	parent_category_id?: string | null;
	deleted_at?: string | null;
	colour?: string;
	sort_order?: number;
	line_count?: number;
	spending_total?: number;
	income_total?: number;
};

export type CategoriesFetchResult = {
	categories: Category[];
	uncategorized: UncategorizedUsage | null;
};

type GetAllCategoriesArgs = {
	withCounts?: boolean;
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

function readIdAsString(value: unknown): string | null {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(Math.trunc(value));
	}
	return null;
}

function readOptionalIdAsString(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	return readIdAsString(value);
}

function readCount(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	return undefined;
}

function readMoney(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	return undefined;
}

export function normalizeCategory(raw: unknown): Category | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const id = readIdAsString(Reflect.get(raw, "id"));
	const name = readString(Reflect.get(raw, "name"));
	const parentCategoryId = readOptionalIdAsString(
		Reflect.get(raw, "parent_category_id")
	);
	const deletedAt = readNullableString(Reflect.get(raw, "deleted_at"));
	const colourValue = Reflect.get(raw, "colour");
	const colour =
		colourValue === undefined ? undefined : readString(colourValue) ?? undefined;
	const description = readNullableString(Reflect.get(raw, "description"));
	const sortOrder = readCount(Reflect.get(raw, "sort_order"));
	const lineCount = readCount(Reflect.get(raw, "line_count"));
	const spendingTotal = readMoney(Reflect.get(raw, "spending_total"));
	const incomeTotal = readMoney(Reflect.get(raw, "income_total"));

	if (id === null || name === null) {
		return null;
	}

	return {
		id,
		name,
		description,
		parent_category_id: parentCategoryId,
		deleted_at: deletedAt,
		colour,
		sort_order: sortOrder,
		line_count: lineCount,
		spending_total: spendingTotal,
		income_total: incomeTotal,
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

function parseUncategorizedUsage(raw: unknown): UncategorizedUsage | string {
	if (!raw || typeof raw !== "object") {
		return "Invalid categories response (expected uncategorized stats)";
	}

	const lineCount = readCount(Reflect.get(raw, "line_count"));
	const spendingTotal = readMoney(Reflect.get(raw, "spending_total"));
	const incomeTotal = readMoney(Reflect.get(raw, "income_total"));

	if (
		lineCount === undefined ||
		spendingTotal === undefined ||
		incomeTotal === undefined
	) {
		return "Invalid categories response (unexpected uncategorized stats)";
	}

	return {
		line_count: lineCount,
		spending_total: spendingTotal,
		income_total: incomeTotal,
	};
}

function parseCategoriesWithStatsPayload(
	payload: unknown
): CategoriesFetchResult | string {
	if (!payload || typeof payload !== "object") {
		return "Invalid categories response (expected an object)";
	}

	const categoriesRaw = Reflect.get(payload, "categories");
	const parsed = parseCategoriesPayload(categoriesRaw);
	if (typeof parsed === "string") {
		return parsed;
	}

	const uncategorizedParsed = parseUncategorizedUsage(
		Reflect.get(payload, "uncategorized")
	);
	if (typeof uncategorizedParsed === "string") {
		return uncategorizedParsed;
	}

	return {
		categories: parsed,
		uncategorized: uncategorizedParsed,
	};
}

type CategoriesLoadingSlice = {
	CategoryReducer: { categoriesLoading: boolean };
};

export const getAllCategories = createAsyncThunk(
	"categories/getAll",
	async (args: GetAllCategoriesArgs | undefined, { rejectWithValue }) => {
		const withCounts = args?.withCounts === true;
		const query = withCounts
			? "/api/categories?include_deleted=true&with_counts=true"
			: "/api/categories?include_deleted=true";

		try {
			const response = await axios.get(query);

			if (withCounts) {
				const parsed = parseCategoriesWithStatsPayload(response.data);
				if (typeof parsed === "string") {
					return rejectWithValue(parsed);
				}
				return parsed;
			}

			const parsed = parseCategoriesPayload(response.data);
			if (typeof parsed === "string") {
				return rejectWithValue(parsed);
			}

			return {
				categories: parsed,
				uncategorized: null,
			};
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						"Failed to fetch categories"
					)
				);
			}
			return rejectWithValue("An unexpected error occurred");
		}
	},
	{
		condition: (args, { getState }) => {
			if (args?.withCounts === true) {
				return true;
			}
			const state = getState() as CategoriesLoadingSlice;
			return !state.CategoryReducer.categoriesLoading;
		},
	}
);

function rejectPayloadMessage(payload: unknown, fallback: string): string {
	return typeof payload === "string" ? payload : fallback;
}

export const getAllCategoriesThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>
) =>
	builder
		.addCase(getAllCategories.pending, (state) => {
			state.categoriesLoading = true;
			state.categoriesError = null;
		})
		.addCase(getAllCategories.fulfilled, (state, action) => {
			state.categoriesLoading = false;
			state.categories = action.payload.categories;
			if (action.payload.uncategorized !== null) {
				state.uncategorized = action.payload.uncategorized;
			}
			state.categoriesError = null;
		})
		.addCase(getAllCategories.rejected, (state, action) => {
			if (action.meta.condition) {
				return;
			}
			state.categoriesLoading = false;
			state.categoriesError = rejectPayloadMessage(
				action.payload,
				action.error.message ?? "Failed to fetch categories"
			);
		});
