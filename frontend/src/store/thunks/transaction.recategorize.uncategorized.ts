import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export type RecategorizeResponse = {
	updated: number;
};

export const recategorizeUncategorizedTransactions = createAsyncThunk(
	"transactions/recategorizeUncategorized",
	async (_, { rejectWithValue }) => {
		try {
			const response = await axios.post<RecategorizeResponse>(
				"/api/transactions/recategorize-uncategorized"
			);
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					typeof error.response?.data === "string"
						? error.response.data
						: error.message
				);
			}
			return rejectWithValue("Failed to recategorize");
		}
	}
);
