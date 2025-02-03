import { createAsyncThunk } from '@reduxjs/toolkit'
import { client } from '../../api'
import type { UserApiCreateUserRequest } from '../../../Api'

export const createUser = createAsyncThunk('user/createUser', (data: UserApiCreateUserRequest) =>
	client.user.createUser(data).then(data => data.data),
)
