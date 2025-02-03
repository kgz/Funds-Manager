import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export const initialState: {
	error: string | null
} = {
	error: null,
}

export const setError = createAsyncThunk('errors/setErrors', (error: string) => error)

const slice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		builder.addCase(setError.fulfilled, (state, { payload }) => {
			state.error = payload
		})
	},
	reducers: {},
})

export const errorReducer = slice.reducer
