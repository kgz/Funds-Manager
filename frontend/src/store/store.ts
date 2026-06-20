import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { AccountReducer } from './slices/accountSlice'
import { CategoryReducer } from './slices/categorySlice'
import { PlannedReducer } from './slices/plannedSlice'
import { PredictionsReducer } from './slices/predictionsSlice'
import { LiabilitiesReducer } from './slices/liabilitiesSlice'
import { AssetsReducer } from './slices/assetsSlice'

const reducers = combineReducers({
	AccountReducer,
	CategoryReducer,
	PlannedReducer,
	PredictionsReducer,
	LiabilitiesReducer,
	AssetsReducer,
})

export const store = configureStore({
  reducer: reducers,
})

export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

export type RootState = ReturnType<typeof reducers>
export type AppDispatch = typeof store.dispatch

export const useAppSelector = useSelector.withTypes<RootState>()

