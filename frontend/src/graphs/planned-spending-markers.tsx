import { ReferenceDot } from 'recharts';
import { chartColors, chartTooltipClass } from '@/graphs/theme';
import { formatChartTooltipDate } from '@/lib/utils/dates';
import type { PlannedSpendingItem } from '@/types/plannedSpending';
import { formatMoneyFromCents } from '@/types/predictions';
import {
	useTrendEventMarkerState,
	type TrendEventMarkerState,
} from '@/graphs/trend-event-markers';

const SPENDING_COLOR = chartColors.spending;
const INCOME_COLOR = chartColors.receiving;
const MIXED_COLOR = chartColors.mixed;

export type PlannedSpendingChartEvent = {
	date: string;
	rowIndex: number;
	y: number;
	items: PlannedSpendingItem[];
};

export function buildPlannedSpendingChartEvents(
	items: PlannedSpendingItem[],
	balanceByDate: Map<string, number>
): PlannedSpendingChartEvent[] {
	const grouped = new Map<string, PlannedSpendingItem[]>();

	for (const item of items) {
		const balance = balanceByDate.get(item.start_date);
		if (balance === undefined) {
			continue;
		}
		const list = grouped.get(item.start_date) ?? [];
		list.push(item);
		grouped.set(item.start_date, list);
	}

	return [...grouped.entries()].map(([date, eventItems], rowIndex) => ({
		date,
		rowIndex,
		y: balanceByDate.get(date) ?? 0,
		items: eventItems,
	}));
}

function markerColor(items: PlannedSpendingItem[]): string {
	const hasIncome = items.some((item) => item.amount_cents > 0);
	const hasSpending = items.some((item) => item.amount_cents < 0);
	if (hasIncome && hasSpending) {
		return MIXED_COLOR;
	}
	if (hasIncome) {
		return INCOME_COLOR;
	}
	return SPENDING_COLOR;
}

type PlannedMarkerShapeProps = {
	cx?: number;
	cy?: number;
	event: PlannedSpendingChartEvent;
	active: boolean;
	onActivate: (active: boolean) => void;
	onToggle: () => void;
};

function PlannedMarkerShape({
	cx = 0,
	cy = 0,
	event,
	active,
	onActivate,
	onToggle,
}: PlannedMarkerShapeProps) {
	const color = markerColor(event.items);
	const hitRadius = 14;
	const iconRadius = 7;

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
			<circle
				cx={cx}
				cy={cy}
				r={iconRadius + 2}
				fill={`${color}40`}
				stroke="none"
				pointerEvents="none"
			/>
			<circle
				cx={cx}
				cy={cy}
				r={iconRadius}
				fill={color}
				stroke={chartColors.surface}
				strokeWidth={2}
				pointerEvents="none"
			/>
			<circle cx={cx} cy={cy} r={2} fill={chartColors.surface} pointerEvents="none" />
			{active ? (
				<foreignObject
					x={cx + 12}
					y={cy - 80}
					width={280}
					height={160}
					style={{ overflow: 'visible', pointerEvents: 'none' }}
				>
					<div className={chartTooltipClass}>
						<p className="mb-2 text-xs text-paper-muted">
							{formatChartTooltipDate(event.date)}
						</p>
						{event.items.map((item) => (
							<p
								key={item.id}
								className="leading-snug text-paper-fg"
							>
								<span className="font-medium">{item.name}</span>
								{' — '}
								<span
									className={
										item.amount_cents >= 0
											? 'font-medium tabular-nums text-green-300'
											: 'font-medium tabular-nums text-red-300'
									}
								>
									{formatMoneyFromCents(item.amount_cents)}
								</span>
							</p>
						))}
					</div>
				</foreignObject>
			) : null}
		</g>
	);
}

export { useTrendEventMarkerState as usePlannedSpendingMarkerState };

export function renderPlannedSpendingMarkers(
	events: PlannedSpendingChartEvent[],
	markerState: TrendEventMarkerState
) {
	const { activeKey, setPinnedKey, setHoverKey } = markerState;

	return events.map((event) => {
		const key = `planned-${event.date}-${event.rowIndex}`;
		return (
			<ReferenceDot
				key={key}
				x={event.date}
				y={event.y}
				r={0}
				ifOverflow="visible"
				shape={(props) => (
					<PlannedMarkerShape
						cx={props.cx}
						cy={props.cy}
						event={event}
						active={activeKey === key}
						onActivate={(next) => {
							if (next) {
								setHoverKey(key);
								return;
							}
							setHoverKey(null);
						}}
						onToggle={() =>
							setPinnedKey((current) => (current === key ? null : key))
						}
					/>
				)}
			/>
		);
	});
}
