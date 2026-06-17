import { createSlice } from '@reduxjs/toolkit';
import type { PlannedSpendingItem } from '@/types/plannedSpending';
import { plannedThunkActions } from '../thunks/plannedSpending';

type PlannedState = {
	loading: boolean;
	items: PlannedSpendingItem[];
	totalCents: number;
	error: string | null;
};

const initialState: PlannedState = {
	loading: false,
	items: [],
	totalCents: 0,
	error: null,
};

const slice = createSlice({
	name: 'planned',
	initialState,
	reducers: {},
	extraReducers(builder) {
		plannedThunkActions(builder);
	},
});

export const { reducer: PlannedReducer } = slice;
