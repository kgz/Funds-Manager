import type { Action, Dispatch, Middleware, Store } from '@reduxjs/toolkit'
import type { DefaultRootState } from 'react-redux'
import { setError } from '../@store/slices/error'
import { useAppDispatch } from '../@store/store'

export const logger: Middleware = store => next => (action: Action) => {
	console.log('dispatching', action)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	if (action?.type?.split('/').at(-1) === 'rejected') {
		console.log(typeof action)
		// @ts-ignore
		console.error(action?.error?.message)
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		store.dispatch(setError(action?.error?.message))

		// store.dispatch({ type: action.type })
	}
	// @ts-ignore
	return next(action)
}
