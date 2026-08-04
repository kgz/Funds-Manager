import { ReferenceDot } from 'recharts';
import {
	chartColors,
	chartSeriesColorForKey,
	chartTooltipClass,
} from '@/graphs/theme';
import { formatChartTooltipDate } from '@/lib/utils/dates';
import { formatMoneyFromCents } from '@/types/predictions';
import type { PredictionGoal } from '@/types/predictions';
import {
	useTrendEventMarkerState,
	type TrendEventMarkerState,
} from '@/graphs/trend-event-markers';

export function goalChartColor(id: string): string {
	return chartSeriesColorForKey(id);
}

export type SavingsGoalChartItem = {
	id: string;
	name: string;
	targetDate: string;
	targetAmountCents: number;
	targetAmountDollars: number;
	showMarker: boolean;
};

export function buildSavingsGoalChartItems(
	goals: PredictionGoal[],
	chartDates: string[]
): SavingsGoalChartItem[] {
	if (chartDates.length === 0) {
		return [];
	}
	const rangeStart = chartDates[0];
	const rangeEnd = chartDates[chartDates.length - 1];
	return goals.map((goal) => ({
		id: goal.id,
		name: goal.name,
		targetDate: goal.target_date,
		targetAmountCents: goal.target_amount_cents,
		targetAmountDollars: goal.target_amount_cents / 100,
		showMarker:
			goal.target_date >= rangeStart && goal.target_date <= rangeEnd,
	}));
}

type GoalMarkerShapeProps = {
	cx?: number;
	cy?: number;
	goal: SavingsGoalChartItem;
	color: string;
	active: boolean;
	onActivate: (active: boolean) => void;
	onToggle: () => void;
};

function GoalMarkerShape({
	cx = 0,
	cy = 0,
	goal,
	color,
	active,
	onActivate,
	onToggle,
}: GoalMarkerShapeProps) {
	const hitRadius = 14;
	const size = 8;

	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={hitRadius}
				fill="transparent"
				style={{ cursor: 'pointer' }}
				onPointerEnter={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onActivate(true);
				}}
				onPointerMove={(pointerEvent) => pointerEvent.stopPropagation()}
				onPointerLeave={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onActivate(false);
				}}
				onClick={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onToggle();
				}}
			/>
			<polygon
				points={`${cx},${cy - size - 2} ${cx + size + 2},${cy} ${cx},${cy + size + 2} ${cx - size - 2},${cy}`}
				fill={`${color}40`}
				stroke="none"
				pointerEvents="none"
			/>
			<polygon
				points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
				fill={color}
				stroke={chartColors.surface}
				strokeWidth={2}
				pointerEvents="none"
			/>
			{active ? (
				<foreignObject
					x={cx + 12}
					y={cy - 72}
					width={260}
					height={120}
					style={{ overflow: 'visible', pointerEvents: 'none' }}
				>
					<div className={chartTooltipClass}>
						<p className="mb-1 font-medium text-paper-fg">{goal.name}</p>
						<p className="text-xs text-paper-muted">
							{formatChartTooltipDate(goal.targetDate)}
						</p>
						<p className="mt-2 font-mono text-[13px] tabular-nums text-paper-fg">
							Target {formatMoneyFromCents(goal.targetAmountCents)}
						</p>
					</div>
				</foreignObject>
			) : null}
		</g>
	);
}

export { useTrendEventMarkerState as useSavingsGoalMarkerState };

export function renderSavingsGoalChartOverlays(
	goals: SavingsGoalChartItem[],
	markerState: TrendEventMarkerState
) {
	const { activeKey, setPinnedKey, setHoverKey } = markerState;

	return goals.flatMap((goal) => {
		const color = goalChartColor(goal.id);
		const markerKey = `goal-${goal.id}`;

		if (!goal.showMarker) {
			return [];
		}

		return [
			<ReferenceDot
				key={`${goal.id}-dot`}
				x={goal.targetDate}
				y={goal.targetAmountDollars}
				r={0}
				ifOverflow="visible"
				shape={(props) => (
					<GoalMarkerShape
						cx={props.cx}
						cy={props.cy}
						goal={goal}
						color={color}
						active={activeKey === markerKey}
						onActivate={(next) => {
							if (next) {
								setHoverKey(markerKey);
								return;
							}
							setHoverKey(null);
						}}
						onToggle={() =>
							setPinnedKey((current) =>
								current === markerKey ? null : markerKey
							)
						}
					/>
				)}
			/>,
		];
	});
}
