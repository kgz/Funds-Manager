import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const initialState: {
	get_data_loading: { [key: string]: boolean }
	get_data_error: { [key: string]: string }
	get_data_success: { [key: string]: boolean }
} = {
	get_data_loading: {},
	get_data_error: {},
	get_data_success: {},
}

export const get_channel_data = createAsyncThunk('channels/get_data', async (channel: string) => {
	return new Promise<void>((resolve, reject) => {
		void axios
			.post(`/chaos/api/admin/channels/${channel}`)
			.then(response => {
				resolve()
			})
			.catch(error => {
				reject(error)
			})
	})
})

const channelsSlice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		builder
			.addCase(get_channel_data.fulfilled, (state, action) => {
				state.get_data_loading[action.meta.arg] = false
				state.get_data_success[action.meta.arg] = true
				state.get_data_error[action.meta.arg] = ''
			})
			.addCase(get_channel_data.rejected, (state, action) => {
				state.get_data_loading[action.meta.arg] = false
				state.get_data_success[action.meta.arg] = false
				state.get_data_error[action.meta.arg] = action.error.message ?? 'Unknown error'
			})
			.addCase(get_channel_data.pending, (state, action) => {
				state.get_data_loading[action.meta.arg] = true
			})
	},
	reducers: {},
})

export default channelsSlice.reducer
