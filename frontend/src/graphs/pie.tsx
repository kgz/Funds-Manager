import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { useMemo, useState } from 'react';
import { chartColors, chartTheme, chartTooltipClass } from '@/graphs/theme';
import { cn } from '@/lib/utils/cn';

const formatCurrency = (amount: number): string => {
	const absAmount = Math.abs(amount / 100).toFixed(2);
	return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

const formatDollars = (dollars: number): string => {
	const abs = Math.abs(dollars).toLocaleString('en-US', {
		minimumFractionDigits: dollars % 1 !== 0 ? 2 : 0,
		maximumFractionDigits: 2,
	});
	return `${dollars < 0 ? '-' : ''}$${abs}`;
};

const formatCompactDollars = (dollars: number): string => {
	const abs = Math.abs(dollars);
	if (abs >= 1000) {
		return `${dollars < 0 ? '-' : ''}$${Math.round(abs / 1000)}k`;
	}
	return formatDollars(dollars);
};

function isPieChartDataItem(value: unknown): value is PieChartDataItem {
	if (typeof value !== 'object' || value === null) return false;
	if (!('name' in value && 'value' in value && 'groupKey' in value)) return false;
	if (typeof value.name !== 'string') return false;
	if (typeof value.value !== 'number') return false;
	if (typeof value.groupKey !== 'string') return false;
	if (!('color' in value && 'percent' in value && 'categoryId' in value)) return false;
	if (typeof value.color !== 'string') return false;
	if (typeof value.percent !== 'number') return false;
	const cid = value.categoryId;
	if (!(cid === null || typeof cid === 'string' || typeof cid === 'number')) return false;
	return true;
}

function datumFromPieSector(sector: unknown): PieChartDataItem | undefined {
	if (typeof sector !== 'object' || sector === null) return undefined;
	if (!('payload' in sector)) return undefined;
	const inner = sector.payload;
	return isPieChartDataItem(inner) ? inner : undefined;
}

function datumFromLegendItem(legendItem: unknown, series: PieChartDataItem[]): PieChartDataItem | undefined {
	if (typeof legendItem !== 'object' || legendItem === null) return undefined;
	const nested = 'payload' in legendItem ? legendItem.payload : undefined;
	if (isPieChartDataItem(nested)) return nested;
	const value = 'value' in legendItem ? legendItem.value : undefined;
	if (typeof value === 'string') {
		return series.find((d) => d.name === value);
	}
	return undefined;
}

const renderCustomTooltip = ({ active, payload }: TooltipContentProps) => {
	if (!active || payload === undefined || payload.length === 0) return null;
	const nested = payload[0]?.payload;
	if (!isPieChartDataItem(nested)) return null;
	const percentValue = nested.percent;
	return (
		<div className={chartTooltipClass}>
			<p className="font-semibold">{nested.name}</p>
			<p>{`Amount: ${formatCurrency(nested.value * 100)}`}</p>
			<p>{`Percent: ${Number.isNaN(percentValue) ? 'N/A' : percentValue.toFixed(1) + '%'}`}</p>
		</div>
	);
};

export type PieChartDataItem = {
	name: string;
	value: number;
	color: string;
	percent: number;
	categoryId: string | number | null;
	groupKey: string;
};

type CategoryPieChartProps = {
	data: PieChartDataItem[];
	chartLabel: string;
	dataKey?: string;
	variant?: 'pie' | 'donut';
	showRankedList?: boolean;
	onSliceClick?: (item: PieChartDataItem) => void;
};

function RankedCategoryList({
	rows,
	onRowClick,
}: {
	rows: PieChartDataItem[];
	onRowClick?: (item: PieChartDataItem) => void;
}) {
	const clickable = onRowClick !== undefined;

	return (
		<ul className="flex w-fit max-w-full flex-col gap-2">
			{rows.map((row) => {
				const content = (
					<>
						<span className="flex min-w-0 items-center gap-2">
							<span
								className="h-2 w-2 shrink-0 rounded-full"
								style={{ backgroundColor: row.color }}
								aria-hidden
							/>
							<span className="truncate text-paper-fg">{row.name}</span>
						</span>
						<span className="shrink-0 font-mono text-xs tabular-nums text-paper-muted">
							{formatDollars(row.value)}
						</span>
					</>
				);
				return (
					<li key={row.groupKey}>
						{clickable ? (
							<button
								type="button"
								className="grid cursor-pointer grid-cols-[auto_auto] items-center gap-x-3 rounded-paper py-0.5 text-left text-xs hover:opacity-80"
								onClick={() => onRowClick(row)}
							>
								{content}
							</button>
						) : (
							<div className="grid grid-cols-[auto_auto] items-center gap-x-3 text-xs">
								{content}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export const CategoryPieChart = ({
	data,
	chartLabel,
	dataKey = 'value',
	variant = 'pie',
	showRankedList = false,
	onSliceClick,
}: CategoryPieChartProps) => {
	const [hoveredSliceName, setHoveredSliceName] = useState<string | null>(null);

	const { chartData, rankedRows, otherRow } = useMemo(() => {
		if (!showRankedList || data.length <= 5) {
			return { chartData: data, rankedRows: data, otherRow: null as PieChartDataItem | null };
		}
		const top = data.slice(0, 5);
		const rest = data.slice(5);
		const otherValue = rest.reduce((sum, row) => sum + row.value, 0);
		const otherPercent = rest.reduce((sum, row) => sum + row.percent, 0);
		const other: PieChartDataItem = {
			name: 'Other',
			value: otherValue,
			color: chartColors.other,
			percent: otherPercent,
			categoryId: null,
			groupKey: rest.map((row) => row.groupKey).join(','),
		};
		return {
			chartData: [...top, other],
			rankedRows: top,
			otherRow: other,
		};
	}, [data, showRankedList]);

	const total = useMemo(
		() => chartData.reduce((sum, row) => sum + row.value, 0),
		[chartData]
	);

	if (data.length === 0) {
		return (
			<p className="flex h-[300px] items-center justify-center text-center text-paper-muted">
				No data available for {chartLabel}.
			</p>
		);
	}

	const sliceCursor = onSliceClick !== undefined ? 'pointer' : 'default';
	const legendCursor = onSliceClick !== undefined ? 'pointer' : 'default';
	const donutRadii =
		variant === 'donut'
			? showRankedList
				? { innerRadius: 42, outerRadius: 67 }
				: { innerRadius: 62, outerRadius: 100 }
			: { innerRadius: 0, outerRadius: 100 };
	const chartHeight = showRankedList ? 160 : 300;
	const hoveredItem =
		hoveredSliceName === null
			? null
			: chartData.find((row) => row.name === hoveredSliceName) ?? null;
	const centerPrimary = hoveredItem?.name.split(' ')[0] ?? 'Total';
	const centerSecondary =
		hoveredItem !== null && total > 0
			? `${((hoveredItem.value / total) * 100).toFixed(0)}%`
			: formatCompactDollars(total);

	return (
		<div
			className={cn(
				showRankedList &&
					'grid min-h-[180px] grid-cols-[160px_minmax(0,1fr)] items-center gap-5 max-lg:grid-cols-1'
			)}
		>
			<div
				className={cn(
					'min-w-0',
					showRankedList && 'mx-auto h-[160px] w-[160px] max-lg:mx-auto lg:mx-0'
				)}
			>
				<ResponsiveContainer width="100%" height={chartHeight}>
					<PieChart>
					<Pie
						data={chartData}
						dataKey={dataKey}
						nameKey="name"
						cx="50%"
						cy="50%"
						innerRadius={donutRadii.innerRadius}
						outerRadius={donutRadii.outerRadius}
						labelLine={false}
						style={{ cursor: sliceCursor }}
						onMouseEnter={(entry) => {
							setHoveredSliceName(entry.name ?? null);
						}}
						onMouseLeave={() => {
							setHoveredSliceName(null);
						}}
						onClick={(sector) => {
							const item = datumFromPieSector(sector);
							if (item !== undefined) {
								onSliceClick?.(item);
							}
						}}
					>
						{chartData.map((entry, index) => {
							const isHovered = hoveredSliceName === entry.name;
							return (
								<Cell
									key={`cell-${chartLabel.replace(/\s+/g, '-')}-${index}`}
									fill={entry.color}
									fillOpacity={hoveredSliceName === null || isHovered ? 1 : 0.35}
									stroke={isHovered ? chartColors.surface : 'transparent'}
									strokeWidth={isHovered ? 2 : 0}
									style={{
										transform: isHovered ? 'scale(1.03)' : 'scale(1)',
										transformOrigin: 'center',
										transition: 'transform 150ms ease-out',
										cursor: onSliceClick !== undefined ? 'pointer' : 'default',
									}}
								/>
							);
						})}
					</Pie>
					{variant === 'donut' ? (
						<text
							x="50%"
							y="50%"
							textAnchor="middle"
							dominantBaseline="middle"
						>
							<tspan
								x="50%"
								dy="-0.35em"
								className="fill-paper-fg text-[13px] font-semibold"
							>
								{centerPrimary}
							</tspan>
							<tspan
								x="50%"
								dy="1.35em"
								className="fill-paper-muted font-mono text-[11px] font-medium tabular-nums"
							>
								{centerSecondary}
							</tspan>
						</text>
					) : null}
						<Tooltip content={renderCustomTooltip} />
						{variant === 'pie' ? (
							<Legend
							layout="vertical"
							align="right"
							verticalAlign="middle"
							iconSize={10}
							wrapperStyle={{ ...chartTheme.legend.wrapperStyle, cursor: legendCursor }}
							onMouseEnter={(e) => setHoveredSliceName(e.value ?? null)}
							onMouseLeave={() => setHoveredSliceName(null)}
							onClick={(legendItem) => {
								const item = datumFromLegendItem(legendItem, chartData);
								if (item !== undefined) {
									onSliceClick?.(item);
								}
							}}
							formatter={(value) => {
								const cursorClass = onSliceClick !== undefined ? 'cursor-pointer' : '';
								return hoveredSliceName === value ? (
									<span className={`font-bold text-paper-fg ${cursorClass}`}>{value}</span>
								) : (
									<span className={`text-paper-fg ${cursorClass}`}>{value}</span>
								);
							}}
							/>
						) : null}
					</PieChart>
				</ResponsiveContainer>
			</div>
			{showRankedList ? (
				<div className="min-w-0">
					<RankedCategoryList
						rows={otherRow !== null ? [...rankedRows, otherRow] : rankedRows}
						onRowClick={
							onSliceClick !== undefined
								? (row) => {
										onSliceClick(row);
									}
								: undefined
						}
					/>
				</div>
			) : null}
		</div>
	);
};
