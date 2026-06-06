import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { StatementsReducer } from './slices/statementsSlice'
import { CategoryReducer } from './slices/categorySlice'
import { MappingReducer } from './slices/mappingSlice'

const reducers = combineReducers({
	StatementsReducer,
	CategoryReducer,
	MappingReducer
})

export const store = configureStore({
  reducer: reducers,
})

export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

export type RootState = ReturnType<typeof reducers>
export type AppDispatch = typeof store.dispatch

export const useAppSelector = useSelector.withTypes<RootState>()

