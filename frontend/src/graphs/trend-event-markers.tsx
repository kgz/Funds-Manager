import { ReferenceDot } from 'recharts';
import { useState } from 'react';
import { chartTooltipClass } from '@/graphs/theme';
import { formatChartTooltipDate } from '@/lib/utils/dates';
import type { AccountOnboardingEvent } from '@/lib/utils/balanceTrendSegments';

const TREND_COLOR = '#fbbf24';

const formatCurrencyWithCommas = (value: number): string => {
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-US', {
		minimumFractionDigits,
		maximumFractionDigits: 2,
	})}`;
};

type EventMarkerShapeProps = {
	cx?: number;
	cy?: number;
	event: AccountOnboardingEvent;
	active: boolean;
	onActivate: (active: boolean) => void;
	onToggle: () => void;
};

function EventMarkerShape({
	cx = 0,
	cy = 0,
	event,
	active,
	onActivate,
	onToggle,
}: EventMarkerShapeProps) {
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
				fill="rgba(251, 191, 36, 0.25)"
				stroke="none"
				pointerEvents="none"
			/>
			<circle
				cx={cx}
				cy={cy}
				r={iconRadius}
				fill={TREND_COLOR}
				stroke="#fff"
				strokeWidth={2}
				pointerEvents="none"
			/>
			<circle cx={cx} cy={cy} r={2} fill="#fff" pointerEvents="none" />
			{active ? (
				<foreignObject
					x={cx + 12}
					y={cy - 72}
					width={240}
					height={120}
					style={{ overflow: 'visible', pointerEvents: 'none' }}
				>
					<div className={chartTooltipClass}>
						<p className="mb-1.5 text-xs text-white/60">
							{formatChartTooltipDate(event.date)}
						</p>
						{event.accounts.map((account) => (
							<p key={account.accountKey} className="leading-snug text-white/90">
								{event.isInitial ? account.label : `${account.label} added`}
								<span className="tabular-nums text-[#fbbf24]">
									{' '}
									· {formatCurrencyWithCommas(account.startingBalance)}
								</span>
							</p>
						))}
					</div>
				</foreignObject>
			) : null}
		</g>
	);
}

export function useTrendEventMarkerState() {
	const [pinnedKey, setPinnedKey] = useState<string | null>(null);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const activeKey = pinnedKey ?? hoverKey;

	return {
		activeKey,
		setPinnedKey,
		setHoverKey,
		suppressChartTooltip: activeKey !== null,
	};
}

type TrendEventMarkerState = ReturnType<typeof useTrendEventMarkerState>;

export function renderTrendEventMarkers(
	events: AccountOnboardingEvent[],
	markerState: TrendEventMarkerState,
) {
	const { activeKey, setPinnedKey, setHoverKey } = markerState;

	return events.map((event) => {
		const key = `${event.date}-${event.rowIndex}`;
		return (
			<ReferenceDot
				key={key}
				x={event.date}
				y={0}
				r={0}
				ifOverflow="visible"
				shape={(props) => (
					<EventMarkerShape
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
						onToggle={() => setPinnedKey((current) => (current === key ? null : key))}
					/>
				)}
				isFront
			/>
		);
	});
}
