import { createAsyncThunk } from '@reduxjs/toolkit'
import { client } from '../../api'

export const getUser = createAsyncThunk('migrations/getUser', () => client.user.me().then(data => data.data))
