import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useMemo, useState } from 'react';
import { chartTheme, chartTooltipClass } from '@/graphs/theme';

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

const renderCustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
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
		<ul className="mt-4 space-y-1.5">
			{rows.map((row) => {
				const content = (
					<>
						<span className="flex min-w-0 items-center gap-2 text-white/85">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: row.color }}
							/>
							<span className="truncate">{row.name}</span>
						</span>
						<span className="shrink-0 tabular-nums text-white/60">
							{formatDollars(row.value)} · {row.percent.toFixed(1)}%
						</span>
					</>
				);
				return (
					<li key={row.groupKey}>
						{clickable ? (
							<button
								type="button"
								className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5"
								onClick={() => onRowClick(row)}
							>
								{content}
							</button>
						) : (
							<div className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm">
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
			color: '#64748b',
			percent: otherPercent,
			categoryId: null,
			groupKey: '__other__',
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
			<p className="flex h-[300px] items-center justify-center text-center text-white/50">
				No data available for {chartLabel}.
			</p>
		);
	}

	const sliceCursor = onSliceClick !== undefined ? 'pointer' : 'default';
	const legendCursor = onSliceClick !== undefined ? 'pointer' : 'default';
	const innerRadius = variant === 'donut' ? 62 : 0;
	const outerRadius = 100;

	return (
		<div className={onSliceClick !== undefined ? '[&_.recharts-pie-sector]:cursor-pointer' : undefined}>
			<ResponsiveContainer width="100%" height={300}>
				<PieChart>
					<Pie
						data={chartData}
						dataKey={dataKey}
						nameKey="name"
						cx="50%"
						cy="50%"
						innerRadius={innerRadius}
						outerRadius={outerRadius}
						labelLine={false}
						style={{ cursor: sliceCursor }}
						onMouseEnter={(entry) => {
							setHoveredSliceName(entry.name);
						}}
						onMouseLeave={() => {
							setHoveredSliceName(null);
						}}
						onClick={(sector) => {
							const item = datumFromPieSector(sector);
							if (item !== undefined && item.groupKey !== '__other__') {
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
									stroke={isHovered ? 'rgba(255,255,255,0.85)' : 'transparent'}
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
							className="fill-white"
						>
							<tspan x="50%" dy="-0.4em" className="text-[11px] fill-white/50">
								Total
							</tspan>
							<tspan x="50%" dy="1.4em" className="text-base font-semibold">
								{formatDollars(total)}
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
							onMouseEnter={(e) => setHoveredSliceName(e.value)}
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
									<span className={`font-bold text-white ${cursorClass}`}>{value}</span>
								) : (
									<span className={`text-white/80 ${cursorClass}`}>{value}</span>
								);
							}}
						/>
					) : null}
				</PieChart>
			</ResponsiveContainer>
			{showRankedList ? (
				<RankedCategoryList
					rows={otherRow !== null ? [...rankedRows, otherRow] : rankedRows}
					onRowClick={
						onSliceClick !== undefined
							? (row) => {
									if (row.groupKey !== '__other__') {
										onSliceClick(row);
									}
								}
							: undefined
					}
				/>
			) : null}
		</div>
	);
};
