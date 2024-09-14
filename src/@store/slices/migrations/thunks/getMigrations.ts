import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { ZMigrations, type TMigrations } from '../types/tMigration'

export const getMigrations = createAsyncThunk('migrations/getMigrations', async () => {
	return axios.get<TMigrations>('/chaos/api/migrations').then(response => ZMigrations.parse(response.data))
})
