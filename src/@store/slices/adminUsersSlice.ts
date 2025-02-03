import { createSlice } from '@reduxjs/toolkit'
import type { client } from '../api'
import { getUsers } from '../thunks'

type TAwaitedResp = Awaited<ReturnType<typeof client.user.getAllUsers>>['data']
export const initialState: {
	adminUsers: TAwaitedResp['data']
	adminUsersLoading: boolean
	filters: TAwaitedResp['filters']
	total: TAwaitedResp['total']
} = {
	adminUsers: [],
	adminUsersLoading: false,
	filters: {
		pagination_current: 0,
		pagination_page_size: 0,
	},
	total: 0,
}

const slice = createSlice({
	name: 'admin_users',
	initialState,
	extraReducers: builder => {
		builder
			.addCase(getUsers.fulfilled, (state, { payload }) => {
				console.log({ payload })
				state.adminUsers = payload.data
				state.filters = payload.filters
				state.total = payload.total
				state.adminUsersLoading = false
			})
			.addCase(getUsers.rejected, (state, action) => {
				console.error('error')
				state.adminUsers = []
				state.adminUsersLoading = false
			})
			.addCase(getUsers.pending, state => {
				console.log('loading')
				state.adminUsersLoading = true
			})
	},
	reducers: {},
})

export const adminUserReducer = slice.reducer
