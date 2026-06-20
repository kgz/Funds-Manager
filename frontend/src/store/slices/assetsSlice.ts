import { createSlice } from '@reduxjs/toolkit';
import type { Asset } from '@/types/assets';
import { assetsThunkActions } from '../thunks/assets';

type AssetsState = {
	loading: boolean;
	items: Asset[];
	totalValueCents: number;
	error: string | null;
};

const initialState: AssetsState = {
	loading: false,
	items: [],
	totalValueCents: 0,
	error: null,
};

const slice = createSlice({
	name: 'assets',
	initialState,
	reducers: {},
	extraReducers(builder) {
		assetsThunkActions(builder);
	},
});

export const { reducer: AssetsReducer } = slice;
