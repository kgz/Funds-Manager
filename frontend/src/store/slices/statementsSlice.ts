// Import the RTK Query methods from the React-specific entry point
import { createSlice } from '@reduxjs/toolkit'
import { getAllStatementsThunkActions, type Statement } from '../thunks/statements.get.all'

type InitialState = {
	statementsLoading: boolean,
	statements: Statement[]
}

const initialState: InitialState = {
	statementsLoading: false,
	statements: [],
	
}

const slice = createSlice({
	name: 'statements',
	initialState,
	reducers:{},
	extraReducers(builder) {
		getAllStatementsThunkActions(builder)
	},
})

export const { reducer: StatementsReducer } = slice