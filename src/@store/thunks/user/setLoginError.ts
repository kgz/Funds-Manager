import { createAsyncThunk } from '@reduxjs/toolkit'

export const setLoginError = createAsyncThunk('migrations/setLoginError', async (error: string, { dispatch }) => {
	return new Promise<string>((resolve, reject) => {
		resolve(error)
	})
})
