import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
	BaselineProjection,
	PredictionGoal,
	PredictionScenario,
} from '@/types/predictions';
import { predictionsThunkActions } from '../thunks/predictions';

type PredictionsState = {
	loading: boolean;
	baseline: BaselineProjection | null;
	scenarios: PredictionScenario[];
	goals: PredictionGoal[];
	scenarioProjections: Record<string, BaselineProjection>;
	enabledScenarioIds: string[];
	enabledGoalIds: string[];
	error: string | null;
};

const initialState: PredictionsState = {
	loading: false,
	baseline: null,
	scenarios: [],
	goals: [],
	scenarioProjections: {},
	enabledScenarioIds: [],
	enabledGoalIds: [],
	error: null,
};

const slice = createSlice({
	name: 'predictions',
	initialState,
	reducers: {
		toggleScenarioOnChart(state, action: PayloadAction<string>) {
			const id = action.payload;
			if (state.enabledScenarioIds.includes(id)) {
				state.enabledScenarioIds = state.enabledScenarioIds.filter(
					(entry) => entry !== id
				);
			} else {
				state.enabledScenarioIds = [...state.enabledScenarioIds, id];
			}
		},
		toggleGoalOnChart(state, action: PayloadAction<string>) {
			const id = action.payload;
			if (state.enabledGoalIds.includes(id)) {
				state.enabledGoalIds = state.enabledGoalIds.filter(
					(entry) => entry !== id
				);
			} else {
				state.enabledGoalIds = [...state.enabledGoalIds, id];
			}
		},
		clearScenarioProjections(state) {
			state.scenarioProjections = {};
		},
	},
	extraReducers(builder) {
		predictionsThunkActions(builder);
	},
});

export const {
	toggleScenarioOnChart,
	toggleGoalOnChart,
	clearScenarioProjections,
} = slice.actions;
export const { reducer: PredictionsReducer } = slice;
