import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { ZCronJobs, type TCronJobs } from '../types/cronJobs'

export const getCronJobs = createAsyncThunk('cronJobs/getCronJobs', async () =>
	axios.get<TCronJobs>('/chaos/api/admin/cronjobs/current').then(response => ZCronJobs.parse(response.data)),
)
