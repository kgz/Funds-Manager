import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	Edit2,
	LineChart,
	Loader2,
	Plus,
	Target,
	Trash2,
	TrendingUp,
} from 'lucide-react';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart as RechartsLineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { PredictionHorizonFilter } from '@/components/dashboard/PredictionHorizonFilter';
import {
	PREDICTION_CUSTOM_RANGE_STORAGE_KEY,
	PREDICTION_HORIZON_STORAGE_KEY,
	PREDICTION_RANGE_MODE_STORAGE_KEY,
	defaultPredictionCustomRange,
	predictionHorizonDateRange,
	readStoredPredictionCustomRange,
	readStoredPredictionHorizon,
	readStoredPredictionRangeMode,
	type PredictionHorizon,
	type PredictionRangeMode,
} from '@/components/dashboard/period';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import {
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	dateInputClass,
	glassCardClass,
	inputDarkClass,
	selectDarkClass,
} from '@/components/layout/tokens';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	chartDateSpanDays,
	formatChartAxisDate,
	formatChartTooltipDate,
} from '@/lib/utils/dates';
import {
	buildPlannedSpendingChartEvents,
	renderPlannedSpendingMarkers,
	usePlannedSpendingMarkerState,
} from '@/graphs/planned-spending-markers';
import {
	buildSavingsGoalChartItems,
	goalChartColor,
	renderSavingsGoalChartOverlays,
	useSavingsGoalMarkerState,
} from '@/graphs/savings-goal-markers';
import { cn } from '@/lib/utils/cn';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getPlannedSpending } from '@/store/thunks/plannedSpending';
import { toggleScenarioOnChart } from '@/store/slices/predictionsSlice';
import {
	createPredictionGoal,
	createPredictionScenario,
	deletePredictionGoal,
	deletePredictionScenario,
	getPredictionGoals,
	getPredictionScenarios,
	loadPredictionsBaseline,
	loadScenarioProjection,
	updatePredictionGoal,
	updatePredictionScenario,
} from '@/store/thunks/predictions';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
	centsToDollars,
	dollarsToCents,
	parsePlannedAmountInput,
	plannedAmountTypeFromCents,
	signedPlannedAmountCents,
	type PlannedAmountType,
	type PlannedSpendingItem,
} from '@/types/plannedSpending';
import {
	computeGoalGap,
	formatMoneyFromCents,
	buildGoalTrackByDate,
	goalChartLineKey,
	scenarioChartLineKey,
	type PredictionScenario,
	type PredictionScenarioLine,
	type ScenarioLineInput,
} from '@/types/predictions';

type ModalMode = 'add' | 'edit';
type ActiveModal = 'scenario' | 'goal' | null;

type ScenarioLineDraft = {
	key: string;
	name: string;
	amountInput: string;
	amountType: PlannedAmountType;
	plannedDate: string;
	categoryId: string;
};

const SCENARIO_FORM_ID = 'prediction-scenario-form';
const GOAL_FORM_ID = 'prediction-goal-form';

const SCENARIO_COLORS = [
	'#38bdf8',
	'#22c55e',
	'#f97316',
	'#a855f7',
	'#ec4899',
	'#eab308',
	'#facc15',
	'#10b981',
	'#0ea5e9',
	'#6366f1',
];

function scenarioColor(id: string): string {
	let hash = 0;
	for (let index = 0; index < id.length; index += 1) {
		hash = (hash * 31 + id.charCodeAt(index)) | 0;
	}
	const positive = Math.abs(hash);
	const paletteIndex = positive % SCENARIO_COLORS.length;
	return SCENARIO_COLORS[paletteIndex];
}

function predictionChartDomain(values: number[]): [number, number] | undefined {
	if (values.length === 0) {
		return undefined;
	}
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;
	const pad = span === 0 ? Math.max(Math.abs(max) * 0.05, 1) : span * 0.08;
	return [min - pad, max + pad];
}

function BalanceTooltip({ active, payload }: TooltipProps<number, string>) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}
	const row = payload[0]?.payload;
	const dateIso =
		row !== undefined &&
		typeof row === 'object' &&
		'date' in row &&
		typeof row.date === 'string'
			? row.date
			: '';
	return (
		<div className="rounded-md border border-white/20 bg-gray-900/95 px-3 py-2 text-sm shadow-lg">
			<p className="mb-1 font-medium text-white">
				{formatChartTooltipDate(dateIso)}
			</p>
			{payload.map((entry) => (
				<p key={entry.dataKey} style={{ color: entry.color }}>
					{entry.name}: {formatMoneyFromCents(Math.round((entry.value ?? 0) * 100))}
				</p>
			))}
		</div>
	);
}

function defaultLineDraft(): ScenarioLineDraft {
	const today = DateTime.now().toISODate() ?? '';
	return {
		key: crypto.randomUUID(),
		name: '',
		amountInput: '',
		amountType: 'spending',
		plannedDate: today,
		categoryId: '',
	};
}

function lineDraftFromStored(line: PredictionScenarioLine): ScenarioLineDraft {
	return {
		key: line.id,
		name: line.name,
		amountInput: centsToDollars(Math.abs(line.amount_cents)),
		amountType: plannedAmountTypeFromCents(line.amount_cents),
		plannedDate: line.start_date,
		categoryId: line.category_id ?? '',
	};
}

function lineDraftFromPlanned(item: PlannedSpendingItem): ScenarioLineDraft {
	return {
		key: crypto.randomUUID(),
		name: item.name,
		amountInput: centsToDollars(Math.abs(item.amount_cents)),
		amountType: plannedAmountTypeFromCents(item.amount_cents),
		plannedDate: item.start_date,
		categoryId: item.category_id ?? '',
	};
}

function draftToLineInput(draft: ScenarioLineDraft): ScenarioLineInput | null {
	const magnitude = dollarsToCents(draft.amountInput);
	if (
		magnitude === null ||
		draft.name.trim().length === 0 ||
		draft.plannedDate.length < 10
	) {
		return null;
	}
	let categoryId: number | null = null;
	if (draft.categoryId.length > 0) {
		const parsed = Number(draft.categoryId);
		if (!Number.isFinite(parsed)) {
			return null;
		}
		categoryId = parsed;
	}
	return {
		name: draft.name.trim(),
		amount_cents: signedPlannedAmountCents(magnitude, draft.amountType),
		frequency: 'once',
		start_date: draft.plannedDate,
		category_id: categoryId,
	};
}

export default function PredictionsPage() {
	const dispatch = useAppDispatch();
	const { accountIdNumber } = useAccountFilter();
	const {
		loading,
		baseline,
		scenarios,
		goals,
		scenarioProjections,
		enabledScenarioIds,
		error,
	} = useAppSelector((state) => state.PredictionsReducer);
	const { items: plannedItems } = useAppSelector((state) => state.PlannedReducer);
	const { categories } = useAppSelector((state) => state.CategoryReducer);

	const activeCategories = useMemo(
		() => categories.filter((category: Category) => !category.deleted_at),
		[categories]
	);

	const [horizon, setHorizon] = useState<PredictionHorizon>(() =>
		readStoredPredictionHorizon()
	);
	const [rangeMode, setRangeMode] = useState<PredictionRangeMode>(() =>
		readStoredPredictionRangeMode()
	);
	const [customRange, setCustomRange] = useState(() =>
		readStoredPredictionCustomRange()
	);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [activeModal, setActiveModal] = useState<ActiveModal>(null);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
	const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
	const [scenarioName, setScenarioName] = useState('');
	const [scenarioLines, setScenarioLines] = useState<ScenarioLineDraft[]>([
		defaultLineDraft(),
	]);
	const [goalName, setGoalName] = useState('');
	const [goalAmountInput, setGoalAmountInput] = useState('');
	const [goalTargetDate, setGoalTargetDate] = useState(
		DateTime.now().plus({ months: 6 }).toISODate() ?? ''
	);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const dateRange = useMemo(() => {
		if (rangeMode === 'custom') {
			return predictionHorizonDateRange('custom', customRange);
		}
		return predictionHorizonDateRange(horizon);
	}, [rangeMode, horizon, customRange]);

	const rangeInvalid =
		rangeMode === 'custom' && customRange.start > customRange.end;

	useEffect(() => {
		localStorage.setItem(PREDICTION_HORIZON_STORAGE_KEY, horizon);
	}, [horizon]);

	useEffect(() => {
		localStorage.setItem(PREDICTION_RANGE_MODE_STORAGE_KEY, rangeMode);
	}, [rangeMode]);

	useEffect(() => {
		localStorage.setItem(
			PREDICTION_CUSTOM_RANGE_STORAGE_KEY,
			JSON.stringify(customRange)
		);
	}, [customRange]);

	const reloadData = useCallback(async () => {
		if (rangeInvalid) {
			return;
		}
		setLoadError(null);
		try {
			await Promise.all([
				dispatch(
					loadPredictionsBaseline({
						from: dateRange.from,
						to: dateRange.to,
						account_id: accountIdNumber,
					})
				).unwrap(),
				dispatch(getPredictionScenarios()).unwrap(),
				dispatch(getPredictionGoals()).unwrap(),
			]);
		} catch (err) {
			setLoadError(readThunkRejectMessage(err, 'Failed to load predictions'));
		}
	}, [accountIdNumber, dateRange.from, dateRange.to, dispatch, rangeInvalid]);

	useEffect(() => {
		void reloadData();
	}, [reloadData]);

	useEffect(() => {
		void dispatch(getAllCategories({ withCounts: false }));
	}, [dispatch]);

	useEffect(() => {
		if (rangeInvalid) {
			return;
		}
		void dispatch(
			getPlannedSpending({
				from: dateRange.from,
				to: dateRange.to,
			})
		);
	}, [dateRange.from, dateRange.to, dispatch, rangeInvalid]);

	useEffect(() => {
		for (const scenarioId of enabledScenarioIds) {
			void dispatch(
				loadScenarioProjection({
					scenarioId,
					range: {
						from: dateRange.from,
						to: dateRange.to,
						account_id: accountIdNumber,
					},
				})
			);
		}
	}, [accountIdNumber, dateRange.from, dateRange.to, dispatch, enabledScenarioIds]);

	const chartData = useMemo(() => {
		if (!baseline) {
			return [];
		}
		const goalTracks = goals.map((goal) => ({
			lineKey: goalChartLineKey(goal.id),
			track: buildGoalTrackByDate(
				baseline.points,
				goal.target_amount_cents,
				goal.target_date,
				baseline.metadata.starting_balance_cents,
				baseline.metadata.baseline_daily_net_cents
			),
		}));
		return baseline.points.map((point) => {
			const row: Record<string, string | number> = {
				date: point.date,
				baseline: point.balance_cents / 100,
			};
			for (const scenarioId of enabledScenarioIds) {
				const projection = scenarioProjections[scenarioId];
				const scenarioPoint = projection?.points.find(
					(entry) => entry.date === point.date
				);
				row[scenarioChartLineKey(scenarioId)] =
					(scenarioPoint?.balance_cents ?? 0) / 100;
			}
			for (const { lineKey, track } of goalTracks) {
				const value = track.get(point.date);
				if (value !== undefined) {
					row[lineKey] = value;
				}
			}
			return row;
		});
	}, [baseline, enabledScenarioIds, goals, scenarioProjections]);

	const chartDateSpan = useMemo(() => {
		const dates = chartData
			.map((row) => row.date)
			.filter((value): value is string => typeof value === 'string');
		return chartDateSpanDays(dates);
	}, [chartData]);

	const plannedMarkerState = usePlannedSpendingMarkerState();
	const savingsGoalMarkerState = useSavingsGoalMarkerState();

	const plannedChartEvents = useMemo(() => {
		const balanceByDate = new Map<string, number>();
		for (const row of chartData) {
			const baseline = row.baseline;
			if (typeof baseline === 'number' && typeof row.date === 'string') {
				balanceByDate.set(row.date, baseline);
			}
		}
		return buildPlannedSpendingChartEvents(plannedItems, balanceByDate);
	}, [chartData, plannedItems]);

	const goalChartItems = useMemo(() => {
		const dates = chartData
			.map((row) => row.date)
			.filter((value): value is string => typeof value === 'string');
		return buildSavingsGoalChartItems(goals, dates);
	}, [chartData, goals]);

	const chartYDomain = useMemo(() => {
		const values: number[] = [];
		for (const row of chartData) {
			const baseline = row.baseline;
			if (typeof baseline === 'number') {
				values.push(baseline);
			}
			for (const scenarioId of enabledScenarioIds) {
				const value = row[scenarioChartLineKey(scenarioId)];
				if (typeof value === 'number') {
					values.push(value);
				}
			}
			for (const goal of goals) {
				const value = row[goalChartLineKey(goal.id)];
				if (typeof value === 'number') {
					values.push(value);
				}
			}
		}
		return predictionChartDomain(values);
	}, [chartData, enabledScenarioIds, goals]);

	const baselineSummary = useMemo(() => {
		if (!baseline) {
			return null;
		}
		const meta = baseline.metadata;
		return `Estimate based on your current balance (${formatMoneyFromCents(meta.starting_balance_cents)}), spread day-by-day from a typical monthly change of ${formatMoneyFromCents(meta.baseline_monthly_net_cents)} (about ${formatMoneyFromCents(meta.baseline_daily_net_cents)}/day, averaged over ${String(meta.months_averaged)} recent months), and ${String(meta.planned_item_count)} planned items in this period.`;
	}, [baseline]);

	const openScenarioModal = (mode: ModalMode, scenario?: PredictionScenario) => {
		setModalMode(mode);
		setActiveModal('scenario');
		setFormError(null);
		if (mode === 'edit' && scenario) {
			setEditingScenarioId(scenario.id);
			setScenarioName(scenario.name);
			setScenarioLines(
				scenario.lines.length > 0
					? scenario.lines.map(lineDraftFromStored)
					: [defaultLineDraft()]
			);
		} else {
			setEditingScenarioId(null);
			setScenarioName('');
			setScenarioLines([defaultLineDraft()]);
		}
	};

	const openGoalModal = (mode: ModalMode, goalId?: string) => {
		setModalMode(mode);
		setActiveModal('goal');
		setFormError(null);
		if (mode === 'edit' && goalId) {
			const goal = goals.find((entry) => entry.id === goalId);
			if (!goal) {
				return;
			}
			setEditingGoalId(goal.id);
			setGoalName(goal.name);
			setGoalAmountInput(centsToDollars(goal.target_amount_cents));
			setGoalTargetDate(goal.target_date);
		} else {
			setEditingGoalId(null);
			setGoalName('');
			setGoalAmountInput('');
			setGoalTargetDate(DateTime.now().plus({ months: 6 }).toISODate() ?? '');
		}
	};

	const handleScenarioSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setFormError(null);
		const lines = scenarioLines
			.map(draftToLineInput)
			.filter((line): line is ScenarioLineInput => line !== null);
		if (scenarioName.trim().length === 0 || lines.length === 0) {
			setFormError('Add a name and at least one valid line (name, amount, date).');
			return;
		}
		setSaving(true);
		try {
			if (modalMode === 'edit' && editingScenarioId) {
				await dispatch(
					updatePredictionScenario({
						id: editingScenarioId,
						payload: { name: scenarioName.trim(), lines },
					})
				).unwrap();
			} else {
				await dispatch(
					createPredictionScenario({ name: scenarioName.trim(), lines })
				).unwrap();
			}
			setActiveModal(null);
			await reloadData();
		} catch (err) {
			setFormError(readThunkRejectMessage(err, 'Failed to save scenario'));
		} finally {
			setSaving(false);
		}
	};

	const handleGoalSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setFormError(null);
		const targetCents = dollarsToCents(goalAmountInput);
		if (goalName.trim().length === 0 || targetCents === null || targetCents <= 0) {
			setFormError('Enter a name and a positive target balance.');
			return;
		}
		setSaving(true);
		try {
			const payload = {
				name: goalName.trim(),
				target_amount_cents: targetCents,
				target_date: goalTargetDate,
			};
			if (modalMode === 'edit' && editingGoalId) {
				await dispatch(
					updatePredictionGoal({ id: editingGoalId, payload })
				).unwrap();
			} else {
				await dispatch(createPredictionGoal(payload)).unwrap();
			}
			setActiveModal(null);
		} catch (err) {
			setFormError(readThunkRejectMessage(err, 'Failed to save goal'));
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteScenario = async (id: string) => {
		if (!window.confirm('Delete this scenario?')) {
			return;
		}
		try {
			await dispatch(deletePredictionScenario(id)).unwrap();
		} catch (err) {
			setLoadError(readThunkRejectMessage(err, 'Failed to delete scenario'));
		}
	};

	const handleDeleteGoal = async (id: string) => {
		if (!window.confirm('Delete this goal?')) {
			return;
		}
		try {
			await dispatch(deletePredictionGoal(id)).unwrap();
		} catch (err) {
			setLoadError(readThunkRejectMessage(err, 'Failed to delete goal'));
		}
	};

	const pageBusy = loading;

	if (pageBusy && baseline === null && scenarios.length === 0) {
		return (
			<PageShell>
				<PageLoadingState label="Loading future predictions…" />
			</PageShell>
		);
	}

	return (
		<PageShell variant="table">
			<div className="shrink-0 space-y-3 border-b border-white/10 p-4">
				<PageHeader
					title="Future predictions"
					subtitle="See where your balance might go and plan for what-if changes."
					icon={<TrendingUp className="h-6 w-6 text-secondary-default" />}
					className="mb-0"
					pending={pageBusy}
				/>

				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-h-9 flex-wrap items-center gap-3">
						<AccountFilter />
						<SegmentedControl
							ariaLabel="Forecast range mode"
							value={rangeMode}
							onChange={setRangeMode}
							options={[
								{ value: 'preset', label: 'Presets' },
								{ value: 'custom', label: 'Custom' },
							]}
						/>
						{rangeMode === 'preset' ? (
							<PredictionHorizonFilter
								value={horizon}
								onChange={setHorizon}
								pending={pageBusy}
								ariaLabel="Forecast horizon"
							/>
						) : (
							<div className="flex flex-wrap items-center gap-2">
								<input
									type="date"
									aria-label="From date"
									value={customRange.start}
									onChange={(event) =>
										setCustomRange((range) => ({
											...range,
											start: event.target.value,
										}))
									}
									className={cn(dateInputClass, 'px-2 py-1.5')}
								/>
								<span className="text-sm text-white/40">–</span>
								<input
									type="date"
									aria-label="To date"
									value={customRange.end}
									onChange={(event) =>
										setCustomRange((range) => ({
											...range,
											end: event.target.value,
										}))
									}
									className={cn(dateInputClass, 'px-2 py-1.5')}
								/>
								<button
									type="button"
									onClick={() =>
										setCustomRange(defaultPredictionCustomRange())
									}
									className={buttonOutlineClass}
								>
									Reset
								</button>
							</div>
						)}
					</div>
				</div>

				{rangeInvalid ? (
					<InlineAlert variant="warning">
						Choose a valid date range (from on or before to).
					</InlineAlert>
				) : null}
			</div>

			<div className="min-h-0 flex-grow overflow-auto p-4">
			{(loadError ?? error) && !rangeInvalid ? (
				<div className="mb-4">
					<ErrorState
						message={loadError ?? error ?? 'Something went wrong'}
						onRetry={() => void reloadData()}
					/>
				</div>
			) : null}

			<div className={cn(glassCardClass, 'mb-6 p-4')}>
				<div className="mb-3 flex items-center gap-2 text-white">
					<LineChart size={18} />
					<h2 className="text-lg font-semibold">Projected balance</h2>
				</div>
				{baselineSummary && (
					<p className="mb-4 text-sm text-white/70">{baselineSummary}</p>
				)}
				{goalChartItems.length > 0 ? (
					<p className="mb-3 text-xs text-white/50">
						{plannedChartEvents.length > 0
							? 'Dots mark planned spending (red = out, green = in). '
							: ''}
						Dashed goal lines ramp to your target balance and bend with planned spending; diamonds mark the target date.
					</p>
				) : plannedChartEvents.length > 0 ? (
					<p className="mb-3 text-xs text-white/50">
						Dots mark planned spending (red = out, green = in).
					</p>
				) : null}
				{chartData.length === 0 ? (
					<EmptyState
						icon={LineChart}
						compact
						title="No forecast data"
						description="Add transactions or widen the horizon to see a projection."
					/>
				) : (
					<div className="h-64 w-full sm:h-72">
						<ResponsiveContainer width="100%" height="100%">
							<RechartsLineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
								<XAxis
									dataKey="date"
									stroke="rgba(255,255,255,0.6)"
									tick={{ fontSize: 12 }}
									minTickGap={28}
									tickFormatter={(value: string) =>
										formatChartAxisDate(value, chartDateSpan)
									}
								/>
								<YAxis
									stroke="rgba(255,255,255,0.6)"
									tick={{ fontSize: 12 }}
									domain={chartYDomain}
									tickFormatter={(value: number) =>
										`$${value.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
									}
								/>
								<Tooltip
									content={<BalanceTooltip />}
									wrapperStyle={
										plannedMarkerState.suppressChartTooltip ||
										savingsGoalMarkerState.suppressChartTooltip
											? { visibility: 'hidden' }
											: undefined
									}
								/>
								<Legend />
								<Line
									type="monotone"
									dataKey="baseline"
									name="Baseline"
									stroke="#22d3ee"
									strokeWidth={2}
									dot={false}
									isAnimationActive={chartData.length < 120}
								/>
								{enabledScenarioIds.map((scenarioId) => {
									const scenario = scenarios.find((entry) => entry.id === scenarioId);
									const displayName =
										scenario?.name ?? `Scenario ${scenarioId}`;
									return (
										<Line
											key={`scenario-line-${scenarioId}`}
											type="monotone"
											dataKey={scenarioChartLineKey(scenarioId)}
											name={displayName}
											stroke={scenarioColor(scenarioId)}
											strokeWidth={2}
											dot={false}
											isAnimationActive={chartData.length < 120}
										/>
									);
								})}
								{goals.map((goal) => (
									<Line
										key={`goal-line-${goal.id}`}
										type="linear"
										dataKey={goalChartLineKey(goal.id)}
										name={`Goal: ${goal.name}`}
										stroke={goalChartColor(goal.id)}
										strokeWidth={2}
										strokeDasharray="6 4"
										dot={false}
										connectNulls={false}
										isAnimationActive={chartData.length < 120}
										legendType="line"
									/>
								))}
								{renderPlannedSpendingMarkers(
									plannedChartEvents,
									plannedMarkerState
								)}
								{renderSavingsGoalChartOverlays(
									goalChartItems,
									savingsGoalMarkerState
								)}
							</RechartsLineChart>
						</ResponsiveContainer>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-2">
				<div className={cn(glassCardClass, 'p-4')}>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-white">Scenarios</h2>
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={() => openScenarioModal('add')}
						>
							<Plus size={16} className="mr-1 inline" />
							Add scenario
						</button>
					</div>
					{scenarios.length === 0 ? (
						<EmptyState
							icon={Plus}
							compact
							title="No scenarios yet"
							description="Add a what-if scenario with extra income or spending lines."
						/>
					) : (
						<ul className="space-y-3">
							{scenarios.map((scenario) => {
								const enabled = enabledScenarioIds.includes(scenario.id);
								return (
									<li
										key={scenario.id}
										className="rounded-md border border-white/10 bg-white/5 p-3"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="font-medium text-white">{scenario.name}</p>
												<p className="text-sm text-white/60">
													{scenario.lines.length} adjustment
													{scenario.lines.length === 1 ? '' : 's'}
												</p>
											</div>
											<div className="flex shrink-0 gap-1">
												<button
													type="button"
													className={buttonOutlineClass}
													aria-pressed={enabled}
													onClick={() =>
														dispatch(toggleScenarioOnChart(scenario.id))
													}
												>
													{enabled ? 'Hide' : 'Show'}
												</button>
												<button
													type="button"
													className={buttonOutlineClass}
													onClick={() => openScenarioModal('edit', scenario)}
												>
													<Edit2 size={14} />
												</button>
												<button
													type="button"
													className={buttonDangerClass}
													onClick={() => void handleDeleteScenario(scenario.id)}
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className={cn(glassCardClass, 'p-4')}>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-white">Savings goals</h2>
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={() => openGoalModal('add')}
						>
							<Target size={16} className="mr-1 inline" />
							Add goal
						</button>
					</div>
					{goals.length === 0 ? (
						<EmptyState
							icon={Target}
							compact
							title="No goals yet"
							description="Set a target balance by a date to see your shortfall and a monthly saving hint."
						/>
					) : (
						<ul className="space-y-3">
							{goals.map((goal) => {
								const gap = baseline
									? computeGoalGap(
											goal.target_amount_cents,
											goal.target_date,
											dateRange.from,
											baseline.points,
											baseline.metadata.baseline_monthly_net_cents
										)
									: null;
								return (
									<li
										key={goal.id}
										className="rounded-md border border-white/10 bg-white/5 p-3"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="font-medium text-white">{goal.name}</p>
												<p className="text-sm text-white/60">
													Target {formatMoneyFromCents(goal.target_amount_cents)} by{' '}
													{DateTime.fromISO(goal.target_date).toFormat('d MMM yyyy')}
												</p>
												{gap && (
													<div className="mt-2 space-y-1 text-sm">
														<p className="text-white/80">
															Projected balance:{' '}
															{formatMoneyFromCents(gap.projected_balance_cents)}
														</p>
														<p
															className={
																gap.current_monthly_net_cents >= 0
																	? 'text-white/80'
																	: 'text-red-300'
															}
														>
															Current pace:{' '}
															{formatMoneyFromCents(
																gap.current_monthly_net_cents
															)}
															/month
														</p>
														{gap.gap_cents > 0 ? (
															<>
																<p className="text-amber-300">
																	Shortfall: {formatMoneyFromCents(gap.gap_cents)}
																</p>
																<p className="text-green-300">
																	Save about{' '}
																	{formatMoneyFromCents(gap.suggested_monthly_cents)}
																	/month extra
																</p>
															</>
														) : (
															<p className="text-green-300">On track for this target</p>
														)}
													</div>
												)}
											</div>
											<div className="flex shrink-0 gap-1">
												<button
													type="button"
													className={buttonOutlineClass}
													onClick={() => openGoalModal('edit', goal.id)}
												>
													<Edit2 size={14} />
												</button>
												<button
													type="button"
													className={buttonDangerClass}
													onClick={() => void handleDeleteGoal(goal.id)}
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
			</div>

			<Modal
				open={activeModal === 'scenario'}
				onClose={() => setActiveModal(null)}
				closeDisabled={saving}
				title={modalMode === 'edit' ? 'Edit scenario' : 'Add scenario'}
				description="Extra income or spending on a date, same as planned spending."
				size="md"
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={() => setActiveModal(null)}
							disabled={saving}
						>
							Cancel
						</button>
						<button
							type="submit"
							form={SCENARIO_FORM_ID}
							className={buttonPrimaryClass}
							disabled={saving}
						>
							{saving ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : modalMode === 'edit' ? (
								'Save'
							) : (
								'Add'
							)}
						</button>
					</div>
				}
			>
				<form id={SCENARIO_FORM_ID} onSubmit={(event) => void handleScenarioSubmit(event)}>
					{formError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{formError}
						</InlineAlert>
					) : null}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="scenarioNameInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Name
							</label>
							<input
								id="scenarioNameInput"
								type="text"
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								value={scenarioName}
								onChange={(event) => setScenarioName(event.target.value)}
								placeholder="e.g. New job, Rent increase"
								disabled={saving}
								required
							/>
						</div>
						<div className="space-y-3">
							<p className="text-sm text-white/60">
								Baseline already includes planned spending in this period. Lines
								here are extra changes on top.
							</p>
							<p className="text-sm font-medium text-white/80">Adjustment lines</p>
							{plannedItems.length > 0 ? (
								<div>
									<label
										htmlFor="plannedItemPicker"
										className="mb-1.5 block text-sm font-medium text-white/80"
									>
										Add from planned spending
									</label>
									<select
										id="plannedItemPicker"
										className={cn(selectDarkClass, 'w-full')}
										defaultValue=""
										disabled={saving}
										onChange={(event) => {
											const itemId = event.target.value;
											if (itemId.length === 0) {
												return;
											}
											const item = plannedItems.find(
												(entry) => entry.id === itemId
											);
											if (item) {
												setScenarioLines((lines) => [
													...lines,
													lineDraftFromPlanned(item),
												]);
											}
											event.target.value = '';
										}}
									>
										<option value="" className="bg-gray-950 text-white">
											Choose planned item…
										</option>
										{plannedItems.map((item) => (
											<option
												key={item.id}
												value={item.id}
												className="bg-gray-950 text-white"
											>
												{item.name} —{' '}
												{formatMoneyFromCents(item.amount_cents)} on{' '}
												{item.start_date}
											</option>
										))}
									</select>
								</div>
							) : null}
							{scenarioLines.map((line, index) => (
								<div
									key={line.key}
									className="space-y-3 rounded-md border border-white/10 p-3"
								>
									<div>
										<label className="mb-1.5 block text-sm font-medium text-white/80">
											Line name
										</label>
										<input
											type="text"
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											placeholder="e.g. Side income"
											value={line.name}
											disabled={saving}
											onChange={(event) => {
												const next = [...scenarioLines];
												next[index] = { ...line, name: event.target.value };
												setScenarioLines(next);
											}}
										/>
									</div>
									<div>
										<div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
											<label className="text-sm font-medium text-white/80">
												Amount ($)
											</label>
											<SegmentedControl
												ariaLabel="Scenario line amount type"
												value={line.amountType}
												options={[
													{
														value: 'spending',
														label: 'Spending',
														activeClassName:
															'bg-red-500/20 text-red-400 shadow-sm',
														inactiveClassName:
															'text-white/70 hover:bg-red-500/10 hover:text-red-300',
													},
													{
														value: 'income',
														label: 'Income',
														activeClassName:
															'bg-green-500/20 text-green-400 shadow-sm',
														inactiveClassName:
															'text-white/70 hover:bg-green-500/10 hover:text-green-300',
													},
												]}
												onChange={(value) => {
													const next = [...scenarioLines];
													next[index] = {
														...line,
														amountType:
															value === 'income' ? 'income' : 'spending',
													};
													setScenarioLines(next);
												}}
											/>
										</div>
										<input
											type="text"
											inputMode="decimal"
											className={cn(
												inputDarkClass,
												'w-full px-3 py-2 font-mono'
											)}
											placeholder="0.00"
											value={line.amountInput}
											disabled={saving}
											onChange={(event) => {
												const parsed = parsePlannedAmountInput(
													event.target.value,
													line.amountType
												);
												const next = [...scenarioLines];
												next[index] = {
													...line,
													amountInput: parsed.value,
													amountType: parsed.type,
												};
												setScenarioLines(next);
											}}
											onBlur={() => {
												const magnitudeCents = dollarsToCents(line.amountInput);
												if (magnitudeCents !== null) {
													const next = [...scenarioLines];
													next[index] = {
														...line,
														amountInput: centsToDollars(
															Math.abs(magnitudeCents)
														),
													};
													setScenarioLines(next);
												}
											}}
										/>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										<div>
											<label className="mb-1.5 block text-sm font-medium text-white/80">
												Date
											</label>
											<input
												type="date"
												className={cn(dateInputClass, 'w-full px-3 py-2')}
												value={line.plannedDate}
												disabled={saving}
												onChange={(event) => {
													const next = [...scenarioLines];
													next[index] = {
														...line,
														plannedDate: event.target.value,
													};
													setScenarioLines(next);
												}}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-medium text-white/80">
												Category (optional)
											</label>
											<CategoryPicker
												value={line.categoryId}
												categories={activeCategories}
												onChange={(value) => {
													const next = [...scenarioLines];
													next[index] = { ...line, categoryId: value };
													setScenarioLines(next);
												}}
												placeholder="None"
												searchable
												variant="form"
												disabled={saving}
												className="w-full"
											/>
										</div>
									</div>
									{scenarioLines.length > 1 ? (
										<button
											type="button"
											className={buttonDangerClass}
											disabled={saving}
											onClick={() =>
												setScenarioLines(
													scenarioLines.filter(
														(entry) => entry.key !== line.key
													)
												)
											}
										>
											Remove line
										</button>
									) : null}
								</div>
							))}
							<button
								type="button"
								className={buttonOutlineClass}
								disabled={saving}
								onClick={() =>
									setScenarioLines([...scenarioLines, defaultLineDraft()])
								}
							>
								Add line
							</button>
						</div>
					</div>
				</form>
			</Modal>

			<Modal
				open={activeModal === 'goal'}
				onClose={() => setActiveModal(null)}
				closeDisabled={saving}
				title={modalMode === 'edit' ? 'Edit goal' : 'Add goal'}
				description="Target balance you want to reach by a specific date."
				size="md"
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={() => setActiveModal(null)}
							disabled={saving}
						>
							Cancel
						</button>
						<button
							type="submit"
							form={GOAL_FORM_ID}
							className={buttonPrimaryClass}
							disabled={saving}
						>
							{saving ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : modalMode === 'edit' ? (
								'Save'
							) : (
								'Add'
							)}
						</button>
					</div>
				}
			>
				<form id={GOAL_FORM_ID} onSubmit={(event) => void handleGoalSubmit(event)}>
					{formError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{formError}
						</InlineAlert>
					) : null}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="goalNameInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Name
							</label>
							<input
								id="goalNameInput"
								type="text"
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								value={goalName}
								onChange={(event) => setGoalName(event.target.value)}
								placeholder="e.g. Emergency fund"
								disabled={saving}
								required
							/>
						</div>
						<div>
							<label
								htmlFor="goalAmountInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Target balance ($)
							</label>
							<input
								id="goalAmountInput"
								type="text"
								inputMode="decimal"
								className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
								value={goalAmountInput}
								disabled={saving}
								onChange={(event) =>
									setGoalAmountInput(
										parsePlannedAmountInput(event.target.value, 'income').value
									)
								}
								onBlur={() => {
									const magnitudeCents = dollarsToCents(goalAmountInput);
									if (magnitudeCents !== null) {
										setGoalAmountInput(
											centsToDollars(Math.abs(magnitudeCents))
										);
									}
								}}
								placeholder="0.00"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="goalDateInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Target date
							</label>
							<input
								id="goalDateInput"
								type="date"
								className={cn(dateInputClass, 'w-full px-3 py-2')}
								value={goalTargetDate}
								onChange={(event) => setGoalTargetDate(event.target.value)}
								disabled={saving}
								required
							/>
						</div>
					</div>
				</form>
			</Modal>
		</PageShell>
	);
}
