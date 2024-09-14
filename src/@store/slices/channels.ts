import {
	createAsyncThunk,
	createSlice,
	type ActionCreator,
	type ActionReducerMapBuilder,
	type AnyAction,
	type AsyncThunk,
	type ThunkAction,
	type ThunkDispatch,
} from '@reduxjs/toolkit'
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { Chaos } from '../../apiClient/Chaos'
import { Client } from '../..'
import { data } from 'jquery'
import type { DefaultRootState } from 'react-redux'
import type { RequestParams } from '../../apiClient/http-client'
import { v4 as uuidv4 } from 'uuid'

const apiCalls = {
	getChannels: createAsyncThunk('getChannels', () => Client.getChannels().then(d => d.data)),
} as const

type T = {
	readonly [key in keyof typeof apiCalls as `${key}_data`]:
		| Awaited<Promise<ReturnType<(typeof Client)['getChannels']>>>['data']
		| null
} & {
	readonly [key in keyof typeof apiCalls as `${key}_loading`]: boolean
} & {
	readonly [key in keyof typeof apiCalls as `${key}_error`]: unknown
}

const t = Object.keys(apiCalls)
	.map(x => {
		return {
			[x + '_data']: null,
			[x + '_loading']: false,
			[x + '_error']: null,
		}
	})
	.reduce((a, b, i) => {
		Object.entries(b).forEach(([x, y]) => {
			a[x] = y
		})

		return a
	}) as T

console.log('initialState', t)

type R<T extends keyof typeof apiCalls> = Awaited<Promise<ReturnType<(typeof Client)[T]>>>['data']
type RR<T> = {
	[k in ]
}

export const initialState: {
	// get_data_loading: { [key: string]: boolean }
	// get_data_error: { [key: string]: string }
	// get_data_success: { [key: string]: boolean }
} & T = {
	// get_data_loading: {},
	// get_data_error: {},
	// get_data_success: {},
	...t,
}

console.log({ initialState })

export const get_channel_data = createAsyncThunk('channels/get_data', async (channel: string) => {
	return new Promise<void>((resolve, reject) => {
		void axios
			.post(`/chaos/api/admin/channels/${channel}`)
			.then(response => {
				resolve()
			})
			.catch((error: AxiosError) => {
				reject(Error(error.message))
			})
	})
})

// const funcs: {
// 	[key: keyof typeof apiCalls]: ReturnType<typeof createAsyncThunk>
// } = {} as const

type x = {
	[key in keyof typeof apiCalls]: typeof createAsyncThunk
}

const funcs = {}

const build = <K>(
	builder: ActionReducerMapBuilder<NoInfer<typeof initialState>>,
	name: string,
	func: AsyncThunk<any, unknown, any>,
) => {
	if (!func) {
		return
	}
	builder.addCase(func.fulfilled, (state, payload) => {
		console.log({ name, payload })
		state[name] = payload.payload
	})
	builder.addCase(func.rejected, (state, payload) => {
		console.error({ name, payload })
	})
}

const channelsSlice = createSlice({
	name: 'store',
	initialState,
	extraReducers: builder => {
		Object.entries(apiCalls).forEach(([key, val]) => {
			build(builder, key, val)
		})
		// builder
		// .addCase(get_channel_data.fulfilled, (state, action) => {
		// 	state.get_data_loading[action.meta.arg] = false
		// 	state.get_data_success[action.meta.arg] = true
		// 	state.get_data_error[action.meta.arg] = ''
		// })
		// .addCase(get_channel_data.rejected, (state, action) => {
		// 	state.get_data_loading[action.meta.arg] = false
		// 	state.get_data_success[action.meta.arg] = false
		// 	state.get_data_error[action.meta.arg] = action.error.message ?? 'Unknown error'
		// })
		// .addCase(get_channel_data.pending, (state, action) => {
		// 	state.get_data_loading[action.meta.arg] = true
		// })
		// T(builder, 'getChannels', Client.getChannels)

		console.log(builder)
		// .addCase(get_all_channels.fulfilled, (state, action) => {
		// 	console.log('asdasd', action.payload)
		// })
	},
	reducers: {},
})

console.log(channelsSlice)

export default channelsSlice.reducer
console.log(funcs)
export const channelActions = funcs as x
