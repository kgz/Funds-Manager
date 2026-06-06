import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useState } from 'react';
import { chartTheme, chartTooltipClass } from '@/graphs/theme';

// --- Helper Functions (Consider moving to a shared utils file) ---

// Helper function for currency formatting (assuming amounts are in cents)
const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
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

// --- Component Props ---
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
    onSliceClick?: (item: PieChartDataItem) => void;
};

// --- Reusable Pie Chart Component ---
export const CategoryPieChart = ({ data, chartLabel, dataKey = "value", onSliceClick }: CategoryPieChartProps) => {
    // State to track the name of the hovered slice
    const [hoveredSliceName, setHoveredSliceName] = useState<string | null>(null);

    if (data.length === 0) {
        return (
            <p className="flex h-[300px] items-center justify-center text-center text-white/50">
                No data available for {chartLabel}.
            </p>
        );
    }

    const sliceCursor = onSliceClick !== undefined ? 'pointer' : 'default';

    const legendCursor = onSliceClick !== undefined ? 'pointer' : 'default';

    return (
        <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey={dataKey}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        style={{ cursor: sliceCursor }}
                        onMouseEnter={(data) => {
                            setHoveredSliceName(data.name);
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
                        {data.map((entry, index) => {
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
                                    }}
                                />
                            );
                        })}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ ...chartTheme.legend.wrapperStyle, cursor: legendCursor }} onMouseEnter={(e) => setHoveredSliceName(e.value)} onMouseLeave={() => setHoveredSliceName(null)} onClick={(legendItem) => {
                        const item = datumFromLegendItem(legendItem, data);
                        if (item !== undefined) {
                            onSliceClick?.(item);
                        }
                    }} formatter={(value) => {
                        const cursorClass = onSliceClick !== undefined ? 'cursor-pointer' : '';
                        return hoveredSliceName === value ? <span className={`font-bold text-white ${cursorClass}`}>{value}</span> : <span className={`text-white/80 ${cursorClass}`}>{value}</span>;
                    }}/>
                </PieChart>
            </ResponsiveContainer>
    );
};