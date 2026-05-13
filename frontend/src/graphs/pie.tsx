import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useState } from 'react';

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
        <div className="bg-gray-800/90 text-white p-2 rounded border border-gray-600 text-sm">
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
    title: string;
    dataKey?: string; // Optional: If data key is different from 'value'
    onSliceClick?: (item: PieChartDataItem) => void;
};

// --- Reusable Pie Chart Component ---
export const CategoryPieChart = ({ data, title, dataKey = "value", onSliceClick }: CategoryPieChartProps) => {
    // State to track the name of the hovered slice
    const [hoveredSliceName, setHoveredSliceName] = useState<string | null>(null);

    if (data.length === 0) {
        return <p className="text-center text-white/50 h-[300px] flex items-center justify-center">No data available for {title}.</p>;
    }

    const sliceCursor = onSliceClick !== undefined ? 'pointer' : 'default';

    return (
        <div className=" p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white/90 mb-4 text-center">{title}</h3>
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
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${title.replace(/\s+/g, '-')}-${index}`}
                                fill={entry.color}
                                // Adjust opacity based on hover state
                                fillOpacity={hoveredSliceName === null || hoveredSliceName === entry.name ? 1 : 0.3}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: '12px', cursor: sliceCursor }} onMouseEnter={(e) => setHoveredSliceName(e.value)} onMouseLeave={() => setHoveredSliceName(null)} onClick={(legendItem) => {
                        const item = datumFromLegendItem(legendItem, data);
                        if (item !== undefined) {
                            onSliceClick?.(item);
                        }
                    }} formatter={(value) => {
                        return hoveredSliceName === value ? <span className="font-bold text-white cursor-pointer">{value}</span> : <span className="text-white/80 cursor-pointer">{value}</span>;
                    }}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};