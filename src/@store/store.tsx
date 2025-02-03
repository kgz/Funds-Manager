import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import type { DefaultRootState, TypedUseSelectorHook } from 'react-redux'
import userSliceSlice from './slices/user'
import channelsSlice from './slices/channels'
import { migrationsReducer } from './slices/migrations/migrationsSlice'
import { cronJobReducer } from './slices/cronJobs/cronJobSlice'
import { logger } from '../@middleware/logger'
import { errorReducer } from './slices/error'
import { adminUserReducer } from './slices/adminUsersSlice'

const reducer = combineReducers({
	migrationsReducer,
	userSliceSlice,
	channelsSlice,
	cronJobReducer,
	errorReducer,
	adminUserReducer,
})

const store = configureStore({
	reducer,
	middleware: getDefaultMiddleware => getDefaultMiddleware().concat(logger),
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
