import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import type { CreateRespError, TUser } from '../../@types/user'
import { getCookie, setCookie } from '../../@middleware/cookie'

type TMe = {
	user: TUser
	rights: string[]
}

export const initialState: {
	current: TUser | null
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

export const createUser = createAsyncThunk(
	'migrations/createUser',
	async (data: Partial<TUser>, { rejectWithValue, dispatch }) => {
		return new Promise<unknown>((resolve, reject) => {
			// void dispatch(setMigrationsRunning(true))
			axios
				.post(`/chaos/api/users/create`, data)
				.then(response => {
					resolve(response.data)
					console.log(response.data)
				})
				.catch(error => {
					reject(rejectWithValue(error.response.data))
				})
				.finally(() => {
					// void dispatch(setMigrationsRunning(false))
				})
		})
	},
)

export const loginUser = createAsyncThunk(
	'migrations/loginUser',
	async (data: Partial<TUser>, { rejectWithValue, dispatch }) => {
		return new Promise<string>((resolve, reject) => {
			// void dispatch(setMigrationsRunning(true))
			axios
				.post<string>(`/chaos/api/users/login`, { ...data, email: '' })
				.then(response => {
					// resolve(response.data)
					console.log(response.data)
					if (response.status === 200) {
						resolve(response.data)
					} else {
						reject(rejectWithValue(response.data))
					}
				})
				.catch(error => {
					reject(rejectWithValue(error.response.data))
				})
				.finally(() => {
					// void dispatch(setMigrationsRunning(false))
				})
		})
	},
)

export const getUser = createAsyncThunk('migrations/getUser', async (_, { rejectWithValue }) => {
	return new Promise<TMe>((resolve, reject) => {
		const jwt = getCookie('jwt')
		if (!jwt) {
			reject(rejectWithValue('UnAuthorised'))
		}
		void axios
			.get<TMe>(`/chaos/api/user`, {
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			})
			.then(response => {
				console.log('response')
				resolve(response.data)
			})
			.catch(error => {
				// reject(rejectWithValue(error.response.data))
				if (error.response.status === 401) {
					return reject(rejectWithValue('UnAuthorised'))
					console.log('err', error)
				}

				reject(error)
			})
	})
})

export const logout = createAsyncThunk('migrations/logout', async (_, { rejectWithValue, dispatch }) => {
	return new Promise<boolean>((resolve, reject) => {
		setCookie('jwt', '', -1)
		resolve(true)
	})
})

export const setLoginError = createAsyncThunk('migrations/setLoginError', async (error: string, { dispatch }) => {
	return new Promise<string>((resolve, reject) => {
		resolve(error)
	})
})

const userSlice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		builder
			.addCase(createUser.fulfilled, (state, action) => {
				state.createLoading = false
				state.createError = {}

				console.log('fulfilled', action.payload)
			})
			.addCase(createUser.pending, (state, action) => {
				state.createError = {}
				state.createLoading = true
			})
			.addCase(createUser.rejected, (state, action) => {
				console.log('err', action.payload)
				state.createError = (action.payload as CreateRespError) || 'An error occurred'
				state.createLoading = false
			})

		builder
			.addCase(loginUser.pending, (state, action) => {
				state.loginLoading = true
				state.loginError = null
			})
			.addCase(loginUser.rejected, (state, action) => {
				console.log('err', action.payload)
				state.loginError = (action.payload as string) || 'An error occurred'
				state.loginLoading = false
			})
		builder.addCase(loginUser.fulfilled, (state, action) => {
			// state.current = action.payload

			console.log(action.payload)
			setCookie('jwt', action.payload, 30)
			state.loginLoading = false
		})
		builder.addCase(getUser.fulfilled, (state, action) => {
			state.current = action.payload.user
			state.rights = action.payload.rights
		})
		builder.addCase(logout.fulfilled, (state, action) => {
			console.log('logout')
			state.current = null
		})

		builder.addCase(setLoginError.fulfilled, (state, action) => {
			state.loginError = action.payload
		})
	},
	reducers: {},
})

export default userSlice.reducer