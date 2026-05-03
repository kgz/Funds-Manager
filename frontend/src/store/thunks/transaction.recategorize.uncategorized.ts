import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getAllTransactions } from "./transactions.get.all";

export type RecategorizeResponse = {
	updated: number;
};

export const recategorizeUncategorizedTransactions = createAsyncThunk(
	"transactions/recategorizeUncategorized",
	async (_, { rejectWithValue, dispatch }) => {
		try {
			const response = await axios.post<RecategorizeResponse>(
				"/api/transactions/recategorize-uncategorized"
			);
			const refreshed = await dispatch(getAllTransactions({ force: true }));
			if (getAllTransactions.rejected.match(refreshed)) {
				return rejectWithValue("Recategorized but failed to refresh list");
			}
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
