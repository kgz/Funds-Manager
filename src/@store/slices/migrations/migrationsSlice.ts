import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { getMigrations } from './thunks/getMigrations'
import { runMigrations } from './thunks/runMigrations'
import type { TMigrations } from './types/tMigration'
import { revertMigration } from './thunks/revertMigration'

export const initialState: {
	migrations: TMigrations
	migrationsLoading: boolean
	migrationsRunning: boolean
} = {
	migrations: [],
	migrationsLoading: false,
	migrationsRunning: false,
}

const slice = createSlice({
	name: import.meta.url,
	initialState,
	extraReducers: builder => {
		builder
			.addCase(getMigrations.pending, state => {
				state.migrationsLoading = true
			})
			.addCase(getMigrations.fulfilled, (state, action) => {
				state.migrations = action.payload
				state.migrationsLoading = false
			})
			.addCase(getMigrations.rejected, (state, action) => {
				console.log(action.payload)
				state.migrationsLoading = false
			})

			.addCase(runMigrations.pending, state => {
				state.migrationsRunning = true
			})
			.addCase(runMigrations.fulfilled, (state, action) => {
				state.migrations = action.payload
				state.migrationsRunning = false
			})
			.addCase(runMigrations.rejected, (state, action) => {
				console.log(action.payload)
				state.migrationsRunning = false
			})

			.addCase(revertMigration.fulfilled, (state, action) => {
				state.migrations = action.payload
			})
	},
	reducers: {},
})

export const migrationsReducer = slice.reducer
