import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios, { type AxiosError } from 'axios'
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
				})
				.catch((error: AxiosError) => {
					reject(Error(error.message))
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
					if (response.status === 200) {
						resolve(response.data)
					} else {
						reject(Error(response.data))
					}
				})
				.catch((error: AxiosError) => {
					reject(Error(error.message))
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
			reject(Error('UnAuthorised'))
		}
		void axios
			.get<TMe>(`/chaos/api/user`, {
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			})
			.then(response => {
				resolve(response.data)
			})
			.catch((error: AxiosError) => {
				// reject(rejectWithValue(error.response.data))
				if (error.status === 401) {
					return reject(Error('UnAuthorised'))
				}

				reject(Error(error.message))
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
				state.loginError = (action.payload as string) || 'An error occurred'
				state.loginLoading = false
			})
		builder.addCase(loginUser.fulfilled, (state, action) => {
			// state.current = action.payload

			setCookie('jwt', action.payload, 30)
			state.loginLoading = false
		})
		builder.addCase(getUser.fulfilled, (state, action) => {
			state.current = action.payload.user
			state.rights = action.payload.rights
		})
		builder.addCase(logout.fulfilled, (state, action) => {
			state.current = null
		})

		builder.addCase(setLoginError.fulfilled, (state, action) => {
			state.loginError = action.payload
		})
	},
	reducers: {},
})

export default userSlice.reducer