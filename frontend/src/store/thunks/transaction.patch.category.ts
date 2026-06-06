import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const patchTransactionCategory = createAsyncThunk(
	"transactions/patchCategory",
	async (
		args: { transactionId: number; categoryId: number | null },
		{ rejectWithValue }
	) => {
		try {
			await axios.patch(`/api/transactions/${args.transactionId}/category`, {
				category_id: args.categoryId,
			});
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
