import { createSlice } from '@reduxjs/toolkit';
import type { Liability } from '@/types/liabilities';
import { liabilitiesThunkActions } from '../thunks/liabilities';

type LiabilitiesState = {
	loading: boolean;
	items: Liability[];
	totalBalanceCents: number;
	error: string | null;
};

const initialState: LiabilitiesState = {
	loading: false,
	items: [],
	totalBalanceCents: 0,
	error: null,
};

const slice = createSlice({
	name: 'liabilities',
	initialState,
	reducers: {},
	extraReducers(builder) {
		liabilitiesThunkActions(builder);
	},
});

export const { reducer: LiabilitiesReducer } = slice;
