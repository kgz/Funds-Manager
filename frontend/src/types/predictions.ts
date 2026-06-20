import axios from 'axios';
import { DateTime } from 'luxon';
import type { RecurringCandidateRow } from '@/store/thunks/analytics';

/**
 * Baseline uses average monthly net from recent history (which already includes
 * repeat payments) plus planned items. Repeat rows are not sent as extra adjustments.
 */

export type LineFrequency =
	| 'once'
	| 'weekly'
	| 'fortnightly'
	| 'monthly'
	| 'yearly';

export type BalancePoint = {
	date: string;
	balance_cents: number;
};

/** @deprecated use BalancePoint */
export type MonthlyBalancePoint = BalancePoint;

export type BaselineMetadata = {
	starting_balance_cents: number;
	baseline_monthly_net_cents: number;
	baseline_daily_net_cents: number;
	months_averaged: number;
	planned_item_count: number;
	repeat_adjustment_count: number;
};

export type BaselineProjection = {
	points: BalancePoint[];
	metadata: BaselineMetadata;
};

export type RepeatAdjustment = {
	amount_cents: number;
	frequency: LineFrequency;
	start_date: string;
	end_date: string | null;
};

export type PredictionScenarioLine = {
	id: string;
	scenario_id: string;
	name: string;
	amount_cents: number;
	frequency: LineFrequency;
	start_date: string;
	end_date: string | null;
	category_id: string | null;
	sort_order: number;
};

export type PredictionScenario = {
	id: string;
	name: string;
	created_at: string;
	lines: PredictionScenarioLine[];
};

export type PredictionGoal = {
	id: string;
	name: string;
	target_amount_cents: number;
	target_date: string;
	created_at: string;
	deleted_at: string | null;
};

export type GoalGap = {
	projected_balance_cents: number;
	gap_cents: number;
	months_remaining: number;
	suggested_monthly_cents: number;
	current_monthly_net_cents: number;
};

export type PredictionRangeQuery = {
	from: string;
	to: string;
	account_id?: number | null;
};

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null) {
		return null;
	}
	return typeof value === 'string' ? value : null;
}

function readIdAsString(value: unknown): string | null {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(Math.trunc(value));
	}
	return null;
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	return null;
}

function readFrequency(value: unknown): LineFrequency | null {
	if (value === 'once' || value === 'weekly' || value === 'fortnightly' || value === 'monthly' || value === 'yearly') {
		return value;
	}
	return null;
}

function buildRangeQuery(params: PredictionRangeQuery): string {
	const search = new URLSearchParams();
	search.set('from', params.from);
	search.set('to', params.to);
	if (params.account_id !== undefined && params.account_id !== null) {
		search.set('account_id', String(params.account_id));
	}
	return search.toString();
}

function readNumberProp(
	obj: object,
	snakeKey: string,
	camelKey: string
): number | null {
	const snake = readFiniteNumber(Reflect.get(obj, snakeKey));
	if (snake !== null) {
		return snake;
	}
	return readFiniteNumber(Reflect.get(obj, camelKey));
}

function resolvePointDate(raw: object): string | null {
	const iso = readString(Reflect.get(raw, 'date'));
	if (iso !== null && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		return iso;
	}
	const month = readString(Reflect.get(raw, 'month'));
	if (month === null) {
		return null;
	}
	if (month === 'Now') {
		return DateTime.now().toISODate();
	}
	const parsed = DateTime.fromFormat(month, 'LLL yyyy');
	if (!parsed.isValid) {
		return null;
	}
	return parsed.endOf('month').toISODate();
}

export function normalizeBalancePoint(raw: unknown): BalancePoint | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const date = resolvePointDate(raw);
	const balanceCents = readNumberProp(raw, 'balance_cents', 'balanceCents');
	if (date === null || balanceCents === null) {
		return null;
	}
	return { date, balance_cents: Math.trunc(balanceCents) };
}

/** @deprecated use normalizeBalancePoint */
export const normalizeMonthlyPoint = normalizeBalancePoint;

export function normalizeBaselineProjection(raw: unknown): BaselineProjection {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid baseline response');
	}
	const pointsRaw = Reflect.get(raw, 'points');
	const metadataRaw = Reflect.get(raw, 'metadata');
	if (!Array.isArray(pointsRaw) || !metadataRaw || typeof metadataRaw !== 'object') {
		throw new Error('Invalid baseline response');
	}
	const points: BalancePoint[] = [];
	for (const entry of pointsRaw) {
		const point = normalizeBalancePoint(entry);
		if (!point) {
			throw new Error('Invalid baseline response');
		}
		points.push(point);
	}
	const starting = readNumberProp(
		metadataRaw,
		'starting_balance_cents',
		'startingBalanceCents'
	);
	const monthlyNet = readNumberProp(
		metadataRaw,
		'baseline_monthly_net_cents',
		'baselineMonthlyNetCents'
	);
	const dailyNet = readNumberProp(
		metadataRaw,
		'baseline_daily_net_cents',
		'baselineDailyNetCents'
	);
	const monthsAveraged = readNumberProp(
		metadataRaw,
		'months_averaged',
		'monthsAveraged'
	);
	const plannedCount = readNumberProp(
		metadataRaw,
		'planned_item_count',
		'plannedItemCount'
	);
	const repeatCount = readNumberProp(
		metadataRaw,
		'repeat_adjustment_count',
		'repeatAdjustmentCount'
	);
	if (
		starting === null ||
		monthlyNet === null ||
		monthsAveraged === null ||
		plannedCount === null ||
		repeatCount === null
	) {
		throw new Error('Invalid baseline response');
	}
	const resolvedDailyNet =
		dailyNet ?? Math.trunc(Math.trunc(monthlyNet) / 30);
	return {
		points,
		metadata: {
			starting_balance_cents: Math.trunc(starting),
			baseline_monthly_net_cents: Math.trunc(monthlyNet),
			baseline_daily_net_cents: resolvedDailyNet,
			months_averaged: Math.trunc(monthsAveraged),
			planned_item_count: Math.trunc(plannedCount),
			repeat_adjustment_count: Math.trunc(repeatCount),
		},
	};
}

function normalizeScenarioLine(raw: unknown): PredictionScenarioLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readIdAsString(Reflect.get(raw, 'id'));
	const scenarioId = readIdAsString(Reflect.get(raw, 'scenario_id'));
	const name = readString(Reflect.get(raw, 'name'));
	const amountCents = readFiniteNumber(Reflect.get(raw, 'amount_cents'));
	const frequency = readFrequency(Reflect.get(raw, 'frequency'));
	const startDate = readString(Reflect.get(raw, 'start_date'));
	const endDate = readNullableString(Reflect.get(raw, 'end_date'));
	const categoryIdRaw = Reflect.get(raw, 'category_id');
	const categoryId =
		categoryIdRaw === null || categoryIdRaw === undefined
			? null
			: readIdAsString(categoryIdRaw);
	const sortOrder = readFiniteNumber(Reflect.get(raw, 'sort_order'));
	if (
		id === null ||
		scenarioId === null ||
		name === null ||
		amountCents === null ||
		frequency === null ||
		startDate === null ||
		sortOrder === null
	) {
		return null;
	}
	return {
		id,
		scenario_id: scenarioId,
		name,
		amount_cents: Math.trunc(amountCents),
		frequency,
		start_date: startDate,
		end_date: endDate,
		category_id: categoryId,
		sort_order: Math.trunc(sortOrder),
	};
}

export function normalizeScenario(raw: unknown): PredictionScenario | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readIdAsString(Reflect.get(raw, 'id'));
	const name = readString(Reflect.get(raw, 'name'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));
	const linesRaw = Reflect.get(raw, 'lines');
	if (id === null || name === null || createdAt === null || !Array.isArray(linesRaw)) {
		return null;
	}
	const lines: PredictionScenarioLine[] = [];
	for (const entry of linesRaw) {
		const line = normalizeScenarioLine(entry);
		if (!line) {
			return null;
		}
		lines.push(line);
	}
	return { id, name, created_at: createdAt, lines };
}

export function normalizeGoal(raw: unknown): PredictionGoal | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readIdAsString(Reflect.get(raw, 'id'));
	const name = readString(Reflect.get(raw, 'name'));
	const targetAmount = readFiniteNumber(Reflect.get(raw, 'target_amount_cents'));
	const targetDate = readString(Reflect.get(raw, 'target_date'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));
	const deletedAt = readNullableString(Reflect.get(raw, 'deleted_at'));
	if (
		id === null ||
		name === null ||
		targetAmount === null ||
		targetDate === null ||
		createdAt === null
	) {
		return null;
	}
	return {
		id,
		name,
		target_amount_cents: Math.trunc(targetAmount),
		target_date: targetDate,
		created_at: createdAt,
		deleted_at: deletedAt,
	};
}

export type ScenarioLineInput = {
	name: string;
	amount_cents: number;
	frequency: LineFrequency;
	start_date: string;
	end_date?: string | null;
	category_id?: number | null;
	sort_order?: number;
};

export type CreateScenarioPayload = {
	name: string;
	lines: ScenarioLineInput[];
};

export type UpdateScenarioPayload = {
	name?: string;
	lines?: ScenarioLineInput[];
};

export type CreateGoalPayload = {
	name: string;
	target_amount_cents: number;
	target_date: string;
};

export type UpdateGoalPayload = {
	name?: string;
	target_amount_cents?: number;
	target_date?: string;
};

export async function fetchBaseline(
	params: PredictionRangeQuery,
	repeatAdjustments: RepeatAdjustment[] = []
): Promise<BaselineProjection> {
	const query = buildRangeQuery(params);
	const response = await axios.post(`/api/predictions/baseline?${query}`, {
		from: params.from,
		to: params.to,
		account_id: params.account_id ?? null,
		repeat_adjustments: repeatAdjustments,
	});
	return normalizeBaselineProjection(response.data);
}

export async function fetchScenarioProjection(
	scenarioId: string,
	params: PredictionRangeQuery,
	repeatAdjustments: RepeatAdjustment[] = []
): Promise<BaselineProjection> {
	const query = buildRangeQuery(params);
	const response = await axios.post(`/api/predictions/scenario/${scenarioId}?${query}`, {
		from: params.from,
		to: params.to,
		account_id: params.account_id ?? null,
		repeat_adjustments: repeatAdjustments,
	});
	return normalizeBaselineProjection(response.data);
}

export async function fetchScenarios(): Promise<PredictionScenario[]> {
	const response = await axios.get('/api/prediction-scenarios');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid scenarios response');
	}
	const scenarios: PredictionScenario[] = [];
	for (const entry of response.data) {
		const scenario = normalizeScenario(entry);
		if (!scenario) {
			throw new Error('Invalid scenarios response');
		}
		scenarios.push(scenario);
	}
	return scenarios;
}

export async function createScenario(
	payload: CreateScenarioPayload
): Promise<PredictionScenario> {
	const response = await axios.post('/api/prediction-scenarios', payload);
	const scenario = normalizeScenario(response.data);
	if (!scenario) {
		throw new Error('Invalid scenario response');
	}
	return scenario;
}

export async function updateScenario(
	id: string,
	payload: UpdateScenarioPayload
): Promise<PredictionScenario> {
	const response = await axios.put(`/api/prediction-scenarios/${id}`, payload);
	const scenario = normalizeScenario(response.data);
	if (!scenario) {
		throw new Error('Invalid scenario response');
	}
	return scenario;
}

export async function deleteScenario(id: string): Promise<void> {
	await axios.delete(`/api/prediction-scenarios/${id}`);
}

export async function fetchGoals(): Promise<PredictionGoal[]> {
	const response = await axios.get('/api/prediction-goals');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid goals response');
	}
	const goals: PredictionGoal[] = [];
	for (const entry of response.data) {
		const goal = normalizeGoal(entry);
		if (!goal) {
			throw new Error('Invalid goals response');
		}
		goals.push(goal);
	}
	return goals;
}

export async function createGoal(payload: CreateGoalPayload): Promise<PredictionGoal> {
	const response = await axios.post('/api/prediction-goals', payload);
	const goal = normalizeGoal(response.data);
	if (!goal) {
		throw new Error('Invalid goal response');
	}
	return goal;
}

export async function updateGoal(
	id: string,
	payload: UpdateGoalPayload
): Promise<PredictionGoal> {
	const response = await axios.put(`/api/prediction-goals/${id}`, payload);
	const goal = normalizeGoal(response.data);
	if (!goal) {
		throw new Error('Invalid goal response');
	}
	return goal;
}

export async function deleteGoal(id: string): Promise<void> {
	await axios.delete(`/api/prediction-goals/${id}`);
}

export function recurringRowsToRepeatAdjustments(
	rows: RecurringCandidateRow[],
	fromDate: string
): RepeatAdjustment[] {
	return rows.map((row) => {
		const signedMonthlyCents = Math.round(
			row.estimatedMonthlyDollars * 100 * (row.flow === 'expense' ? -1 : 1)
		);
		return {
			amount_cents: signedMonthlyCents,
			frequency: 'monthly',
			start_date: fromDate,
			end_date: null,
		};
	});
}

function monthsBetweenInclusive(fromIso: string, toIso: string): number {
	const from = DateTime.fromISO(fromIso);
	const to = DateTime.fromISO(toIso);
	if (!from.isValid || !to.isValid || to < from) {
		return 0;
	}
	const yearDiff = to.year - from.year;
	const monthDiff = to.month - from.month;
	return Math.max(yearDiff * 12 + monthDiff, 1);
}

function daysUntil(fromIso: string, toIso: string): number {
	const from = DateTime.fromISO(fromIso);
	const to = DateTime.fromISO(toIso);
	if (!from.isValid || !to.isValid || to < from) {
		return 0;
	}
	return Math.floor(to.diff(from, 'days').days);
}

function baselineBalanceAtDate(
	points: BalancePoint[],
	targetDate: string
): number {
	let projected = points[points.length - 1]?.balance_cents ?? 0;
	for (const point of points) {
		if (point.date === targetDate) {
			return point.balance_cents;
		}
	}
	return projected;
}

/** Balance needed on each day to reach the entered target, with planned-spending bumps. */
export function buildGoalTrackByDate(
	baselinePoints: BalancePoint[],
	targetAmountCents: number,
	targetDate: string,
	startingBalanceCents: number,
	dailyNetCents: number
): Map<string, number> {
	const track = new Map<string, number>();
	const anchorDate = baselinePoints[0]?.date;
	if (!anchorDate || targetDate < anchorDate) {
		return track;
	}

	const totalDays = Math.max(daysUntil(anchorDate, targetDate), 1);
	const baselineAtTarget = baselineBalanceAtDate(baselinePoints, targetDate);
	const trendAtTarget = startingBalanceCents + dailyNetCents * totalDays;
	const plannedDevAtTarget = baselineAtTarget - trendAtTarget;

	for (const point of baselinePoints) {
		if (point.date > targetDate) {
			continue;
		}
		const daysElapsed = daysUntil(anchorDate, point.date);
		const daysRemaining = daysUntil(point.date, targetDate);
		const progressToTarget =
			totalDays > 0 ? 1 - daysRemaining / totalDays : 1;
		const linearGoalCents =
			startingBalanceCents +
			(targetAmountCents - startingBalanceCents) * progressToTarget;
		const trendOnly = startingBalanceCents + dailyNetCents * daysElapsed;
		const plannedDev = point.balance_cents - trendOnly;
		const trackCents =
			linearGoalCents + plannedDev - plannedDevAtTarget * progressToTarget;
		track.set(point.date, trackCents / 100);
	}

	track.set(targetDate, targetAmountCents / 100);

	return track;
}

export type GoalLineChartPoint = {
	date: string;
	amount: number;
};

export function buildGoalLineChartData(
	baselinePoints: BalancePoint[],
	targetAmountCents: number,
	targetDate: string,
	startingBalanceCents: number,
	dailyNetCents: number
): GoalLineChartPoint[] {
	const track = buildGoalTrackByDate(
		baselinePoints,
		targetAmountCents,
		targetDate,
		startingBalanceCents,
		dailyNetCents
	);
	const points: GoalLineChartPoint[] = [];
	for (const [date, amount] of track) {
		points.push({ date, amount });
	}
	points.sort((left, right) => left.date.localeCompare(right.date));
	return points;
}

export function goalChartLineKey(goalId: string): string {
	return `goal-${goalId}`;
}

export function scenarioChartLineKey(scenarioId: string): string {
	return `scenario-${scenarioId}`;
}

export function baselineBalanceCentsAtDate(
	points: BalancePoint[],
	targetDate: string
): number {
	return baselineBalanceAtDate(points, targetDate);
}

export function computeGoalGap(
	targetAmountCents: number,
	targetDate: string,
	todayIso: string,
	points: BalancePoint[],
	currentMonthlyNetCents = 0
): GoalGap | null {
	if (points.length === 0) {
		return null;
	}
	let projected = points[points.length - 1]?.balance_cents ?? 0;
	for (const point of points) {
		if (point.date === targetDate) {
			projected = point.balance_cents;
			break;
		}
	}
	const gap = targetAmountCents - projected;
	const monthsRemaining = monthsBetweenInclusive(todayIso, targetDate);
	const suggestedMonthly =
		gap > 0 && monthsRemaining > 0 ? Math.trunc(gap / monthsRemaining) : 0;
	return {
		projected_balance_cents: projected,
		gap_cents: gap,
		months_remaining: monthsRemaining,
		suggested_monthly_cents: suggestedMonthly,
		current_monthly_net_cents: Math.trunc(currentMonthlyNetCents),
	};
}

export function formatMoneyFromCents(cents: number): string {
	const abs = Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${cents < 0 ? '-' : ''}$${abs}`;
}

export const LINE_FREQUENCY_LABELS: Record<LineFrequency, string> = {
	once: 'Once',
	weekly: 'Weekly',
	fortnightly: 'Fortnightly',
	monthly: 'Monthly',
	yearly: 'Yearly',
};
