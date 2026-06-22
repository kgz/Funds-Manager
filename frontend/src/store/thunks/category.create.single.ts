import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import axios from "axios";
import type { CategoryReducer } from "../slices/categorySlice";
import { readAxiosRejectPayload } from "@/lib/utils/thunkError";
import { normalizeCategory } from "./category.get.all";

type CreateCategoryPayload = {
	name: string;
	description?: string | null;
	parent_category_id?: string;
	colour?: string;
};

function parseCategoryId(value: string): number | null {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function toCreateCategoryBody(data: CreateCategoryPayload): {
	name: string;
	description?: string | null;
	parent_category_id?: number;
	colour?: string;
} {
	const body: {
		name: string;
		description?: string | null;
		parent_category_id?: number;
		colour?: string;
	} = { name: data.name };
	if (data.description !== undefined) {
		body.description = data.description;
	}
	if (data.colour !== undefined) {
		body.colour = data.colour;
	}
	if (data.parent_category_id !== undefined) {
		const parentId = parseCategoryId(data.parent_category_id);
		if (parentId === null) {
			throw new Error('Invalid parent category id');
		}
		body.parent_category_id = parentId;
	}
	return body;
}

function rejectPayloadMessage(payload: unknown, fallback: string): string {
	return typeof payload === "string" ? payload : fallback;
}

export const createCategory = createAsyncThunk(
	"categories/create",
	async (data: CreateCategoryPayload, { rejectWithValue }) => {
		let body: ReturnType<typeof toCreateCategoryBody>;
		try {
			body = toCreateCategoryBody(data);
		} catch (err: unknown) {
			return rejectWithValue(
				err instanceof Error ? err.message : 'Invalid category payload'
			);
		}
		try {
			const response = await axios.post(`/api/categories`, body);
			const normalized = normalizeCategory(response.data);
			if (!normalized) {
				return rejectWithValue("Invalid category response");
			}
			return normalized;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						"Failed to create category"
					)
				);
			}
			return rejectWithValue("An unexpected error occurred");
		}
	}
);

export const createCategoryThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof CategoryReducer>>
) =>
	builder
		.addCase(createCategory.pending, (state) => {
			state.categoriesError = null;
		})
		.addCase(createCategory.fulfilled, (state, action) => {
			state.categories.push(action.payload);
			state.categoriesError = null;
		})
		.addCase(createCategory.rejected, (state, action) => {
			state.categoriesError = rejectPayloadMessage(
				action.payload,
				"Failed to create category"
			);
		});
