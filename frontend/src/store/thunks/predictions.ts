import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import axios from 'axios';
import type { PredictionsReducer } from '../slices/predictionsSlice';
import { readAxiosRejectPayload } from '@/lib/utils/thunkError';
import {
	createGoal,
	createScenario,
	deleteGoal,
	deleteScenario,
	fetchBaseline,
	fetchGoals,
	fetchScenarioProjection,
	fetchScenarios,
	updateGoal,
	updateScenario,
	type CreateGoalPayload,
	type CreateScenarioPayload,
	type PredictionRangeQuery,
	type UpdateGoalPayload,
	type UpdateScenarioPayload,
} from '@/types/predictions';

export type LoadScenarioProjectionArgs = {
	scenarioId: string;
	range: PredictionRangeQuery;
};

export const loadPredictionsBaseline = createAsyncThunk(
	'predictions/loadBaseline',
	async (args: PredictionRangeQuery, { rejectWithValue }) => {
		try {
			return await fetchBaseline(args);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to load baseline')
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to load baseline');
		}
	}
);

export const loadScenarioProjection = createAsyncThunk(
	'predictions/loadScenarioProjection',
	async (args: LoadScenarioProjectionArgs, { rejectWithValue }) => {
		try {
			return {
				scenarioId: args.scenarioId,
				projection: await fetchScenarioProjection(args.scenarioId, args.range),
			};
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(
						error.response?.data,
						'Failed to load scenario projection'
					)
				);
			}
			if (error instanceof Error) {
				return rejectWithValue(error.message);
			}
			return rejectWithValue('Failed to load scenario projection');
		}
	}
);

export const getPredictionScenarios = createAsyncThunk(
	'predictions/getScenarios',
	async (_, { rejectWithValue }) => {
		try {
			return await fetchScenarios();
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to load scenarios')
				);
			}
			return rejectWithValue('Failed to load scenarios');
		}
	}
);

export const createPredictionScenario = createAsyncThunk(
	'predictions/createScenario',
	async (payload: CreateScenarioPayload, { rejectWithValue }) => {
		try {
			return await createScenario(payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to create scenario')
				);
			}
			return rejectWithValue('Failed to create scenario');
		}
	}
);

export const updatePredictionScenario = createAsyncThunk(
	'predictions/updateScenario',
	async (
		args: { id: string; payload: UpdateScenarioPayload },
		{ rejectWithValue }
	) => {
		try {
			return await updateScenario(args.id, args.payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to update scenario')
				);
			}
			return rejectWithValue('Failed to update scenario');
		}
	}
);

export const deletePredictionScenario = createAsyncThunk(
	'predictions/deleteScenario',
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteScenario(id);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to delete scenario')
				);
			}
			return rejectWithValue('Failed to delete scenario');
		}
	}
);

export const getPredictionGoals = createAsyncThunk(
	'predictions/getGoals',
	async (_, { rejectWithValue }) => {
		try {
			return await fetchGoals();
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to load goals')
				);
			}
			return rejectWithValue('Failed to load goals');
		}
	}
);

export const createPredictionGoal = createAsyncThunk(
	'predictions/createGoal',
	async (payload: CreateGoalPayload, { rejectWithValue }) => {
		try {
			return await createGoal(payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to create goal')
				);
			}
			return rejectWithValue('Failed to create goal');
		}
	}
);

export const updatePredictionGoal = createAsyncThunk(
	'predictions/updateGoal',
	async (
		args: { id: string; payload: UpdateGoalPayload },
		{ rejectWithValue }
	) => {
		try {
			return await updateGoal(args.id, args.payload);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to update goal')
				);
			}
			return rejectWithValue('Failed to update goal');
		}
	}
);

export const deletePredictionGoal = createAsyncThunk(
	'predictions/deleteGoal',
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteGoal(id);
			return id;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return rejectWithValue(
					readAxiosRejectPayload(error.response?.data, 'Failed to delete goal')
				);
			}
			return rejectWithValue('Failed to delete goal');
		}
	}
);

function rejectMessage(payload: unknown, fallback: string): string {
	return typeof payload === 'string' ? payload : fallback;
}

export const predictionsThunkActions = (
	builder: ActionReducerMapBuilder<ReturnType<typeof PredictionsReducer>>
) => {
	builder
		.addCase(loadPredictionsBaseline.pending, (state) => {
			state.loading = true;
			state.error = null;
		})
		.addCase(loadPredictionsBaseline.fulfilled, (state, action) => {
			state.loading = false;
			state.baseline = action.payload;
			state.error = null;
		})
		.addCase(loadPredictionsBaseline.rejected, (state, action) => {
			state.loading = false;
			state.error = rejectMessage(action.payload, 'Failed to load baseline');
		})
		.addCase(loadScenarioProjection.fulfilled, (state, action) => {
			state.scenarioProjections[action.payload.scenarioId] =
				action.payload.projection;
		})
		.addCase(getPredictionScenarios.fulfilled, (state, action) => {
			state.scenarios = action.payload;
			state.enabledScenarioIds = action.payload.map((scenario) => scenario.id);
		})
		.addCase(createPredictionScenario.fulfilled, (state, action) => {
			state.scenarios = [...state.scenarios, action.payload];
			state.enabledScenarioIds = [...state.enabledScenarioIds, action.payload.id];
		})
		.addCase(updatePredictionScenario.fulfilled, (state, action) => {
			state.scenarios = state.scenarios.map((scenario) =>
				scenario.id === action.payload.id ? action.payload : scenario
			);
		})
		.addCase(deletePredictionScenario.fulfilled, (state, action) => {
			state.scenarios = state.scenarios.filter(
				(scenario) => scenario.id !== action.payload
			);
			state.enabledScenarioIds = state.enabledScenarioIds.filter(
				(id) => id !== action.payload
			);
			delete state.scenarioProjections[action.payload];
		})
		.addCase(getPredictionGoals.fulfilled, (state, action) => {
			state.goals = action.payload;
		})
		.addCase(createPredictionGoal.fulfilled, (state, action) => {
			state.goals = [...state.goals, action.payload];
		})
		.addCase(updatePredictionGoal.fulfilled, (state, action) => {
			state.goals = state.goals.map((goal) =>
				goal.id === action.payload.id ? action.payload : goal
			);
		})
		.addCase(deletePredictionGoal.fulfilled, (state, action) => {
			state.goals = state.goals.filter((goal) => goal.id !== action.payload);
		});
};
