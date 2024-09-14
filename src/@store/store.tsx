import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import type { DefaultRootState, TypedUseSelectorHook } from 'react-redux'
import thunk from 'redux-thunk'
import userSliceSlice from './slices/user'
import channelsSlice from './slices/channels'
import { migrationsReducer } from './slices/migrations/migrationsSlice'
import { cronJobReducer } from './slices/cronJobs/cronJobSlice'
import { Chaos } from '../apiClient/Chaos'

const reducer = combineReducers({
	migrationsReducer,
	userSliceSlice,
	channelsSlice,
	cronJobReducer,
})

const store = configureStore({
	reducer,
	middleware: getDefaultMiddleware => getDefaultMiddleware().concat(thunk),
})

type StoreType = typeof store

type IAppDispatch = StoreType['dispatch']

export type TRootState = ReturnType<typeof reducer>
declare module 'react-redux' {
	export type DefaultRootState = TRootState
}



export const useAppDispatch = () => useDispatch<IAppDispatch>()
export const useAppSelector: TypedUseSelectorHook<DefaultRootState> = useSelector
export default store
