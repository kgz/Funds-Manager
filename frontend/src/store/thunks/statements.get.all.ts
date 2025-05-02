import { createAsyncThunk, type ActionReducerMapBuilder } from "@reduxjs/toolkit";

import axios from "axios";
import type { StatementsReducer } from "../slices/statementsSlice";


export type Statement = {
	"id": number,
	"date": string,
	"account_id": string
	"opening_balance": number,
	"closing_balance": number
	"deleted_at": string,
	"created_at": string,
}
export const getAllStatements = createAsyncThunk(
	"getStatements",
	async () => axios.get<Statement[]>(
		`/api/statements`
	).then(res => res.data)



);


type TStatementsReducer = ActionReducerMapBuilder<ReturnType<typeof StatementsReducer>>;


export const getAllStatementsThunkActions = (builder: TStatementsReducer) =>
	builder
		.addCase(getAllStatements.pending, (state) => {
			// state.errors = {}

			state.statementsLoading = true;
		})
		.addCase(getAllStatements.fulfilled, (state, action) => {
			console.log(action)
			// state.user = action.payload ?? null;
			state.statementsLoading = false;
			state.statements = action.payload;
		})
		.addCase(getAllStatements.rejected, (state, action) => {


			console.log(action)

			// state.userError = action.error.message ?? null;

			state.statementsLoading = false;

		});
