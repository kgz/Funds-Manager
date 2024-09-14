import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { ZMigrations, type TMigrations } from '../types/tMigration'

export const revertMigration = createAsyncThunk('migrations/revertMigration', async (key: string) => {
	return axios
		.post<TMigrations>(`/chaos/api/migrations/${key}/revert`)
		.then(response => ZMigrations.parse(response.data))
})
