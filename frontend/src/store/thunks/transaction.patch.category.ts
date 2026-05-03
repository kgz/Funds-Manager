import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getAllTransactions } from "./transactions.get.all";

export const patchTransactionCategory = createAsyncThunk(
	"transactions/patchCategory",
	async (
		args: { transactionId: number; categoryId: number | null },
		{ rejectWithValue, dispatch }
	) => {
		try {
			await axios.patch(`/api/transactions/${args.transactionId}/category`, {
				category_id: args.categoryId,
			});
			const refreshed = await dispatch(getAllTransactions({ force: true }));
			if (getAllTransactions.rejected.match(refreshed)) {
				return rejectWithValue("Saved category but failed to refresh list");
			}
			return args;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					typeof error.response?.data === "string"
						? error.response.data
						: error.message
				);
			}
			return rejectWithValue("Failed to update category");
		}
	}
);
