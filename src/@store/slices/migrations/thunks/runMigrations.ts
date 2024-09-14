import axios from 'axios'
import { ZMigrations, type TMigrations } from '../types/tMigration'
import { createAsyncThunk } from '@reduxjs/toolkit'

export const runMigrations = createAsyncThunk('migrations/runMigrations', async () => {
	return axios.post<TMigrations>('/chaos/api/migrations').then(response => ZMigrations.parse(response.data))
})
