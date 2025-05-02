// Import the RTK Query methods from the React-specific entry point
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getAllTransactionsThunkActions, type Transaction } from '../thunks/transactions.get.all'

type InitialState = {
	transactionsLoading: boolean,
	transactions: Transaction[],
	transactionsError: string | null
}

const initialState: InitialState = {
	transactionsLoading: false,
	transactions: [],
	transactionsError: null
	
}

const slice = createSlice({
	name: 'transactions',
	initialState,
	reducers:{
		setTransactions: (state, action: PayloadAction<Transaction[]>) => {
			state.transactions = action.payload;
			state.transactionsLoading = false; // Assuming setting directly means loading is done
			state.transactionsError = null;
		}
	},
	extraReducers(builder) {
		getAllTransactionsThunkActions(builder)
	},
})

export const { reducer: TransactionsReducer } = slice
export const { setTransactions } = slice.actions // Export the action creator