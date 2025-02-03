import { createAsyncThunk } from '@reduxjs/toolkit'
import type { UserApiGetAllUsersRequest } from '../../../Api'
import { client } from '../../api'

export const getUsers = createAsyncThunk('admin/getAllUsers', (data: UserApiGetAllUsersRequest) =>
	client.user.getAllUsers(data).then(d => d.data),
)
