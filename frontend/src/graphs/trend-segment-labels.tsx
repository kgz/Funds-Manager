import { ReferenceDot } from 'recharts';
import type { TrendSegmentLabel } from '@/lib/utils/balanceTrendSegments';

const TREND_COLOR = '#fbbf24';

function formatSegmentPercent(value: number): string {
	const rounded = value.toFixed(1);
	return `${value >= 0 ? '+' : ''}${rounded}%`;
}

type SegmentLabelShapeProps = {
	cx?: number;
	cy?: number;
	label: TrendSegmentLabel;
};

function SegmentLabelShape({ cx = 0, cy = 0, label }: SegmentLabelShapeProps) {
	return (
		<text
			x={cx}
			y={cy - 14}
			textAnchor="middle"
			fill={TREND_COLOR}
			fontSize={11}
			fontWeight={600}
			pointerEvents="none"
		>
			{formatSegmentPercent(label.percentChange)}
		</text>
	);
}

export function renderTrendSegmentLabels(labels: TrendSegmentLabel[]) {
	return labels.map((label, index) => (
		<ReferenceDot
			key={`${label.date}-${index}`}
			x={label.date}
			y={label.y}
			r={0}
			ifOverflow="visible"
			shape={(props) => (
				<SegmentLabelShape cx={props.cx} cy={props.cy} label={label} />
			)}
			isFront
		/>
	));
}
