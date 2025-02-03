import { createAsyncThunk } from '@reduxjs/toolkit'
import { setCookie } from '../../../@middleware/cookie'

export const logoutUser = createAsyncThunk('migrations/logout', async _ => {
	return new Promise<boolean>((resolve, reject) => {
		setCookie('jwt', '', -1)
		resolve(true)
	})
})
