import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

type MonthlySummary = {
    month: string;
    spending: number;
    receiving: number;
};

type Props = {
    data: MonthlySummary[];
	title?: String
};

// Helper function for currency formatting with commas
const formatCurrencyWithCommas = (value: number): string => {
    // Show decimals only if they are not .00
    const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
    return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: 2,
    })}`;
};

export const MonthlyBarGraph = ({ data, title }: Props) => {
    return (
        <div className="p-4">
            {title && <h3 className="text-lg font-semibold text-white/90 mb-4 text-center">{title}</h3>}
            
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}> {/* Adjust margins for labels */}
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(val) => `${formatCurrencyWithCommas(val)}`} />
                    <Tooltip
                        formatter={(value: number) => `${formatCurrencyWithCommas(value)}`}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} // Optional: Style the hover cursor background
                        contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid #4b5563', borderRadius: '4px' }} // Dark background, border, rounded corners
                        labelStyle={{ color: '#e5e7eb' }} // Style for the label (e.g., month)
                        itemStyle={{ color: '#d1d5db' }} // Style for the individual items (Spending/Receiving)
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add padding to avoid overlap */}
                    <Bar dataKey="receiving" fill="#4ade80" name="Receiving" />
                    <Bar dataKey="spending" fill="#f87171" name="Spending" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
