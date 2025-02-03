import { createAsyncThunk } from '@reduxjs/toolkit'
import type { UserApiLoginUserRequest } from '../../../Api'
import { client } from '../../api'

export const loginUser = createAsyncThunk('migrations/loginUser', (data: UserApiLoginUserRequest) =>
	client.user.loginUser(data).then(data => data.data),
)
