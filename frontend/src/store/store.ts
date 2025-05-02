import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { StatementsReducer } from './slices/statementsSlice'
import { TransactionsReducer } from './slices/transactionsSlice'
import { CategoryReducer } from './slices/categorySlice'
import { MappingReducer } from './slices/mappingSlice'
import { transactionWatcherMiddleware } from './middleware/transaction_mapping'

const reducers = combineReducers({
	StatementsReducer,
	TransactionsReducer,
	CategoryReducer,
	MappingReducer
})

export const store = configureStore({
  reducer: reducers,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(transactionWatcherMiddleware)
})

export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

const getState = store.getState

// export type RootState = ReturnType<typeof store.getState>
export type RootState = ReturnType<typeof reducers>
export type AppDispatch = typeof store.dispatch

export const useAppSelector = useSelector.withTypes<RootState>()

