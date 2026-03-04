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

// Custom Tooltip Content
const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as MonthlySummary; // Access the data for the hovered bar group
        const receiving = data.receiving;
        const spending = data.spending;
        const difference = receiving - spending;

        return (
            <div className="bg-gray-800/90 text-white p-2 rounded border border-gray-600 text-sm shadow-lg">
                <p className="font-semibold mb-1">{label}</p>
                <p style={{ color: '#4ade80' }}>{`Receiving: ${formatCurrencyWithCommas(receiving)}`}</p>
                <p style={{ color: '#f87171' }}>{`Spending: ${formatCurrencyWithCommas(spending)}`}</p>
                <hr className="border-gray-600 my-1" />
                <p className={difference >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {`Difference: ${difference >= 0 ? '+' : ''}${formatCurrencyWithCommas(difference)}`}
                </p>
            </div>
        );
    }
    return null;
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
                    <Tooltip content={renderCustomTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add padding to avoid overlap */}
                    <Bar dataKey="receiving" fill="#4ade80" name="Receiving" />
                    <Bar dataKey="spending" fill="#f87171" name="Spending" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
