import { createSlice } from '@reduxjs/toolkit'
import type { TCronJobs } from './types/cronJobs'
import { getCronJobs } from './thunks/getCronJob'

export const initialState: {
	cronJobs: TCronJobs
	cronJobsLoading: boolean
} = {
	cronJobs: [],
	cronJobsLoading: false,
}

const slice = createSlice({
	name: import.meta.url,
	initialState,
	extraReducers: builder => {
		builder.addCase(getCronJobs.pending, state => {
			state.cronJobsLoading = true
		})
		builder.addCase(getCronJobs.fulfilled, (state, action) => {
			state.cronJobs = action.payload
			state.cronJobsLoading = false
		})
		builder.addCase(getCronJobs.rejected, (state, action) => {
			console.log(action.payload)
			state.cronJobsLoading = false
		})
	},
	reducers: {},
})

export const cronJobReducer = slice.reducer
