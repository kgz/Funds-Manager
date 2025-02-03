import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { client } from '../api'

export const getChannels = createAsyncThunk('getChannels', () => client.channels.getChannels().then(data => data.data))

export const initialState: {
	channels: Awaited<ReturnType<typeof client.channels.getChannels>>['data']
	channelsLoading: boolean
} = {
	channels: [],
	channelsLoading: false,
}

const channelsSlice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		builder
			.addCase(getChannels.fulfilled, (state, { payload }) => {
				state.channels = payload
				state.channelsLoading = false
			})
			.addCase(getChannels.rejected, state => {
				state.channels = []
				state.channelsLoading = false
			})
			.addCase(getChannels.pending, state => {
				state.channelsLoading = true
			})
	},
	reducers: {},
})

export default channelsSlice.reducer
