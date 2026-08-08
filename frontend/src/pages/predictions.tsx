import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	LineChart,
	Loader2,
	Plus,
	Target,
} from 'lucide-react';
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
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
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { ProjectionSummary } from '@/components/predictions/ProjectionSummary';
import {
	buttonOutlineClass,
	dateInputClass,
	glassCardClass,
	inputDarkClass,
	panelHintClass,
	panelTitleClass,
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
import { moneyDangerClass, moneySuccessClass } from '@/lib/utils/moneySemantics';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getPlannedSpending } from '@/store/thunks/plannedSpending';
import {
	toggleGoalOnChart,
	toggleScenarioOnChart,
} from '@/store/slices/predictionsSlice';
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
import { chartColors, chartSeriesColorForKey } from '@/graphs/theme';
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
const predictionPrimaryButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';
const predictionActionButtonClass =
	'inline-flex h-7 cursor-pointer items-center justify-center rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';
const predictionDeleteButtonClass =
	'inline-flex h-7 cursor-pointer items-center justify-center rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_7%,transparent)] hover:text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-50';

function scenarioColor(id: string): string {
	return chartSeriesColorForKey(id);
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

function BalanceTooltip({ active, payload }: TooltipContentProps) {
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
		<div className="rounded-paper border border-paper-border bg-paper-surface px-3 py-2 text-[13px] shadow-lg">
			<p className="mb-1 font-medium text-paper-fg">
				{formatChartTooltipDate(dateIso)}
			</p>
			{payload.map((entry, index) => {
				const key =
					typeof entry.dataKey === 'string' || typeof entry.dataKey === 'number'
						? entry.dataKey
						: index;
				const value = entry.value;
				const numericValue = typeof value === 'number' ? value : 0;
				return (
				<p key={key} style={{ color: entry.color }}>
					{entry.name}: {formatMoneyFromCents(Math.round(numericValue * 100))}
				</p>
			);
			})}
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
		enabledGoalIds,
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
		const goalTracks = goals
			.filter((goal) => enabledGoalIds.includes(goal.id))
			.map((goal) => ({
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
	}, [baseline, enabledGoalIds, enabledScenarioIds, goals, scenarioProjections]);

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
		const visibleGoals = goals.filter((goal) =>
			enabledGoalIds.includes(goal.id)
		);
		return buildSavingsGoalChartItems(visibleGoals, dates);
	}, [chartData, enabledGoalIds, goals]);

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
				if (!enabledGoalIds.includes(goal.id)) {
					continue;
				}
				const value = row[goalChartLineKey(goal.id)];
				if (typeof value === 'number') {
					values.push(value);
				}
			}
		}
		return predictionChartDomain(values);
	}, [chartData, enabledGoalIds, enabledScenarioIds, goals]);

	const baselineSummary = useMemo(() => {
		if (!baseline) {
			return null;
		}
		const meta = baseline.metadata;
		const plannedLabel =
			meta.planned_item_count === 1 ? 'planned item' : 'planned items';
		return `Baseline from ${String(meta.months_averaged)} recent months + ${String(meta.planned_item_count)} ${plannedLabel}`;
	}, [baseline]);

	const projectionSummary = useMemo(() => {
		if (!baseline) {
			return null;
		}
		const lastPoint = baseline.points[baseline.points.length - 1];
		const projectedEndCents =
			lastPoint !== undefined
				? lastPoint.balance_cents
				: baseline.metadata.starting_balance_cents;
		return {
			startingCents: baseline.metadata.starting_balance_cents,
			projectedEndCents,
			monthlyNetCents: baseline.metadata.baseline_monthly_net_cents,
		};
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
			<header className="shrink-0 border-b border-paper-border bg-paper-surface px-8 py-5">
				<h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-paper-fg">
					Future predictions
				</h1>
				<p className="mt-1 max-w-[52ch] text-[13px] text-paper-muted">
					See where your balance might go and plan for what-if changes.
				</p>
			</header>

			<div className="min-h-0 flex-grow space-y-6 overflow-auto px-8 py-6">
				<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex min-h-9 flex-wrap items-center gap-2.5">
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
								<span className="text-sm text-paper-muted">to</span>
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

					{!rangeInvalid && projectionSummary !== null ? (
						<ProjectionSummary
							startingCents={projectionSummary.startingCents}
							projectedEndCents={projectionSummary.projectedEndCents}
							monthlyNetCents={projectionSummary.monthlyNetCents}
						/>
					) : null}
				</div>

				{rangeInvalid ? (
					<InlineAlert variant="warning">
						Choose a valid date range (from on or before to).
					</InlineAlert>
				) : null}

				{(loadError ?? error) && !rangeInvalid ? (
					<ErrorState
						message={loadError ?? error ?? 'Something went wrong'}
						onRetry={() => void reloadData()}
					/>
				) : null}

			<div className={cn(glassCardClass, 'overflow-hidden p-0')}>
				<div className="border-b border-paper-border px-4 py-3.5">
					<h2 className={panelTitleClass}>Projected balance</h2>
					{baselineSummary ? (
						<p className={cn(panelHintClass, 'mt-1 max-w-[72ch]')}>
							{baselineSummary}
						</p>
					) : (
						<p className={panelHintClass}>
							Baseline from recent monthly average + planned items
						</p>
					)}
				</div>
				<div className="p-4">
				{goalChartItems.length > 0 ? (
					<p className="mb-3 text-xs text-paper-muted">
						{plannedChartEvents.length > 0
							? 'Dots mark planned spending (red = out, green = in). '
							: ''}
						Dashed goal lines ramp to your target balance and bend with planned spending; diamonds mark the target date.
					</p>
				) : plannedChartEvents.length > 0 ? (
					<p className="mb-3 text-xs text-paper-muted">
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
					<div className="h-72 w-full sm:h-80">
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart data={chartData}>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="color-mix(in oklch, var(--fg) 8%, var(--border))"
								/>
								<XAxis
									dataKey="date"
									stroke="var(--muted)"
									tick={{ fontSize: 12, fill: 'var(--muted)' }}
									minTickGap={28}
									tickFormatter={(value: string) =>
										formatChartAxisDate(value, chartDateSpan)
									}
								/>
								<YAxis
									stroke="var(--muted)"
									tick={{ fontSize: 12, fill: 'var(--muted)' }}
									domain={chartYDomain}
									tickFormatter={(value: number) =>
										`$${value.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
									}
								/>
								<Tooltip
									content={BalanceTooltip}
									wrapperStyle={
										plannedMarkerState.suppressChartTooltip ||
										savingsGoalMarkerState.suppressChartTooltip
											? { visibility: 'hidden' }
											: undefined
									}
								/>
								<Legend
									wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }}
								/>
								<Area
									type="monotone"
									dataKey="baseline"
									name="Baseline"
									stroke={chartColors.netWorth}
									strokeWidth={2}
									fill={chartColors.netWorth}
									fillOpacity={0.1}
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
											strokeDasharray="6 4"
											dot={false}
											isAnimationActive={chartData.length < 120}
										/>
									);
								})}
								{goals
									.filter((goal) => enabledGoalIds.includes(goal.id))
									.map((goal) => (
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
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				)}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-2">
				<div className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="border-b border-paper-border px-4 py-3.5">
						<h2 className={panelTitleClass}>Scenarios</h2>
						<p className={panelHintClass}>Toggle overlays on the chart</p>
					</div>
					{scenarios.length === 0 ? (
						<div className="p-4">
							<EmptyState
								icon={Plus}
								compact
								title="No scenarios yet"
								description="Add a what-if scenario with extra income or spending lines."
							/>
						</div>
					) : (
						<ul className="divide-y divide-paper-border">
							{scenarios.map((scenario) => {
								const enabled = enabledScenarioIds.includes(scenario.id);
								return (
									<li
										key={scenario.id}
										className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
									>
										<input
											type="checkbox"
											className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
											checked={enabled}
											aria-label={`${enabled ? 'Hide' : 'Show'} ${scenario.name} on chart`}
											onChange={() =>
												dispatch(toggleScenarioOnChart(scenario.id))
											}
										/>
										<div className="min-w-0">
											<p className="truncate text-[13px] font-medium tracking-[-0.01em] text-paper-fg">
												{scenario.name}
											</p>
											<p className="text-xs text-paper-muted">
												{scenario.lines.length} adjustment
												{scenario.lines.length === 1 ? '' : 's'}
											</p>
										</div>
										<div className="flex shrink-0 gap-1">
											<button
												type="button"
												className={predictionActionButtonClass}
												onClick={() => openScenarioModal('edit', scenario)}
												aria-label={`Edit ${scenario.name}`}
											>
												Edit
											</button>
											<button
												type="button"
												className={predictionDeleteButtonClass}
												onClick={() => void handleDeleteScenario(scenario.id)}
												aria-label={`Delete ${scenario.name}`}
											>
												Delete
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
					<div className="flex justify-end border-t border-paper-border bg-[color-mix(in_oklch,var(--bg)_55%,var(--surface))] px-4 py-3">
						<button
							type="button"
							className={predictionPrimaryButtonClass}
							onClick={() => openScenarioModal('add')}
						>
							Add scenario
						</button>
					</div>
				</div>

				<div className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="border-b border-paper-border px-4 py-3.5">
						<h2 className={panelTitleClass}>Savings goals</h2>
						<p className={panelHintClass}>Toggle overlays on the chart</p>
					</div>
					{goals.length === 0 ? (
						<div className="p-4">
							<EmptyState
								icon={Target}
								compact
								title="No goals yet"
								description="Set a target balance by a date to see your shortfall and a monthly saving hint."
							/>
						</div>
					) : (
						<ul className="divide-y divide-paper-border">
							{goals.map((goal) => {
								const enabled = enabledGoalIds.includes(goal.id);
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
										className="grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
									>
										<input
											type="checkbox"
											className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent)]"
											checked={enabled}
											aria-label={`${enabled ? 'Hide' : 'Show'} ${goal.name} on chart`}
											onChange={() => dispatch(toggleGoalOnChart(goal.id))}
										/>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full"
													style={{ background: goalChartColor(goal.id) }}
													aria-hidden
												/>
												<p className="truncate text-[13px] font-medium tracking-[-0.01em] text-paper-fg">
													{goal.name}
												</p>
											</div>
											<p className="mt-0.5 text-xs text-paper-muted">
												Target {formatMoneyFromCents(goal.target_amount_cents)} by{' '}
												{DateTime.fromISO(goal.target_date).toFormat('d MMM yyyy')}
											</p>
											{gap ? (
												<div className="mt-2 space-y-1 text-xs">
													<p className="text-paper-muted">
														Projected{' '}
														<span className="font-mono tabular-nums text-paper-fg">
															{formatMoneyFromCents(gap.projected_balance_cents)}
														</span>
													</p>
													{gap.gap_cents > 0 ? (
														<p className={cn('font-mono tabular-nums', moneyDangerClass)}>
															Shortfall {formatMoneyFromCents(gap.gap_cents)} · save ~
															{formatMoneyFromCents(gap.suggested_monthly_cents)}
															/mo
														</p>
													) : (
														<p className={cn('font-mono tabular-nums', moneySuccessClass)}>
															On track
														</p>
													)}
												</div>
											) : null}
										</div>
										<div className="flex shrink-0 gap-1">
											<button
												type="button"
												className={predictionActionButtonClass}
												onClick={() => openGoalModal('edit', goal.id)}
												aria-label={`Edit ${goal.name}`}
											>
												Edit
											</button>
											<button
												type="button"
												className={predictionDeleteButtonClass}
												onClick={() => void handleDeleteGoal(goal.id)}
												aria-label={`Delete ${goal.name}`}
											>
												Delete
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
					<div className="flex justify-end border-t border-paper-border bg-[color-mix(in_oklch,var(--bg)_55%,var(--surface))] px-4 py-3">
						<button
							type="button"
							className={predictionPrimaryButtonClass}
							onClick={() => openGoalModal('add')}
						>
							Add goal
						</button>
					</div>
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
							className={predictionPrimaryButtonClass}
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
								className="mb-1.5 block text-sm font-medium text-paper-fg"
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
							<p className="text-sm text-paper-muted">
								Baseline already includes planned spending in this period. Lines
								here are extra changes on top.
							</p>
							<p className="text-sm font-medium text-paper-fg">Adjustment lines</p>
							{plannedItems.length > 0 ? (
								<div>
									<label
										htmlFor="plannedItemPicker"
										className="mb-1.5 block text-sm font-medium text-paper-fg"
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
										<option value="" className="bg-paper-surface text-paper-fg">
											Choose planned item…
										</option>
										{plannedItems.map((item) => (
											<option
												key={item.id}
												value={item.id}
												className="bg-paper-surface text-paper-fg"
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
									className="space-y-3 rounded-md border border-paper-border p-3"
								>
									<div>
										<label className="mb-1.5 block text-sm font-medium text-paper-fg">
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
											<label className="text-sm font-medium text-paper-fg">
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
															'text-paper-muted hover:bg-red-500/10 hover:text-red-300',
													},
													{
														value: 'income',
														label: 'Income',
														activeClassName:
															'bg-green-500/20 text-green-400 shadow-sm',
														inactiveClassName:
															'text-paper-muted hover:bg-green-500/10 hover:text-green-300',
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
											<label className="mb-1.5 block text-sm font-medium text-paper-fg">
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
											<label className="mb-1.5 block text-sm font-medium text-paper-fg">
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
											className={predictionDeleteButtonClass}
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
							className={predictionPrimaryButtonClass}
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
								className="mb-1.5 block text-sm font-medium text-paper-fg"
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
								className="mb-1.5 block text-sm font-medium text-paper-fg"
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
								className="mb-1.5 block text-sm font-medium text-paper-fg"
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
