import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { AccountReducer } from './slices/accountSlice'
import { CategoryReducer } from './slices/categorySlice'

const reducers = combineReducers({
	AccountReducer,
	CategoryReducer,
})

export const store = configureStore({
  reducer: reducers,
})

export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

export type RootState = ReturnType<typeof reducers>
export type AppDispatch = typeof store.dispatch

export const useAppSelector = useSelector.withTypes<RootState>()

