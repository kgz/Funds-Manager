import { createSlice } from '@reduxjs/toolkit'
import type { CreateRespError } from '../../@types/user'
import { setCookie } from '../../@middleware/cookie'

import type { MeResp, Users } from '../../Api'
import { createUser } from '../thunks/user/createUser'
import { loginUser } from '../thunks/user/loginUser'
import { logoutUser } from '../thunks/user/logoutUser'
import { setLoginError } from '../thunks/user/setLoginError'
import { getUser } from '../thunks/user/getUser'

export const initialState: {
	current: Users | null
	rights: string[]
	loginLoading: boolean
	registerLoading: boolean
	loginError: string | null
	createError: CreateRespError
	createLoading: boolean
	systemError: string | null
} = {
	current: null,
	rights: [],
	loginLoading: false,
	registerLoading: false,
	loginError: null,
	createError: {},
	createLoading: false,
	systemError: null,
}

const userSlice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		builder
			.addCase(createUser.fulfilled, (state, action) => {
				state.createLoading = false
				state.createError = {}
			})
			.addCase(createUser.pending, (state, action) => {
				state.createError = {}
				state.createLoading = true
			})
			.addCase(createUser.rejected, (state, action) => {
				state.createError = (action.payload as CreateRespError) || 'An error occurred'
				state.createLoading = false
			})

		builder
			.addCase(loginUser.pending, (state, action) => {
				state.loginLoading = true
				state.loginError = null
			})
			.addCase(loginUser.rejected, (state, action) => {
				console.log(action)
				state.loginError = (action.payload as string) || 'Invalid Username and/or Password'
				state.loginLoading = false
			})
		builder.addCase(loginUser.fulfilled, (state, action) => {
			// state.current = action.payload
			console.log({ action })
			setCookie('jwt', action.payload, 30)
			state.loginLoading = false
		})
		builder.addCase(getUser.fulfilled, (state, action) => {
			state.current = action.payload.user
			state.rights = action.payload.rights
		})
		builder.addCase(logoutUser.fulfilled, (state, action) => {
			state.current = null
		})

		builder.addCase(setLoginError.fulfilled, (state, action) => {
			state.loginError = action.payload
		})
	},
	reducers: {},
})

export default userSlice.reducer
