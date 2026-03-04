import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

// --- Helper Functions (Consider moving to a shared utils file) ---

// Helper function for currency formatting (assuming amounts are in cents)
const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

// Custom Tooltip Content (Duplicated for simplicity, consider moving to utils)
const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // Access the data object of the hovered slice
        const percentValue = data.percent; // Use the pre-calculated percent from data
        return (
            <div className="bg-gray-800/90 text-white p-2 rounded border border-gray-600 text-sm">
                <p className="font-semibold">{`${data.name}`}</p>
                <p>{`Amount: ${formatCurrency(data.value * 100)}`}</p> {/* Convert back to cents for formatting */}
                <p>{`Percent: ${isNaN(percentValue) ? 'N/A' : percentValue.toFixed(1) + '%'}`}</p>
            </div>
        );
    }
    return null;
};

// --- Component Props ---
export type PieChartDataItem = {
    name: string;
    value: number;
    color: string;
    percent: number;
    categoryId: string | number | null;
};

type CategoryPieChartProps = {
    data: PieChartDataItem[];
    title: string;
    dataKey?: string; // Optional: If data key is different from 'value'
};

// --- Reusable Pie Chart Component ---
export const CategoryPieChart = ({ data, title, dataKey = "value" }: CategoryPieChartProps) => {
    // State to track the name of the hovered slice
    const [hoveredSliceName, setHoveredSliceName] = useState<string | null>(null);

    if (data.length === 0) {
        return <p className="text-center text-white/50 h-[300px] flex items-center justify-center">No data available for {title}.</p>;
    }

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
                        onMouseEnter={(data) => {
                            setHoveredSliceName(data.name);
                        }}
                        onMouseLeave={() => {
                            setHoveredSliceName(null);
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
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} onMouseEnter={(e) => setHoveredSliceName(e.value)} onMouseLeave={() => setHoveredSliceName(null)} formatter={(value, entry) => {
                        return hoveredSliceName === value ? <span className="font-bold text-white cursor-pointer">{value}</span> : <span className="text-white/80 cursor-pointer">{value}</span>;
                    }}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};