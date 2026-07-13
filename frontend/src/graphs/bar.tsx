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
import type { TooltipContentProps } from "recharts";
import { chartTheme, chartTooltipClass } from "@/graphs/theme";

type MonthlySummary = {
    month: string;
    spending: number;
    receiving: number;
};

type Props = {
    data: MonthlySummary[];
};

const formatCurrencyWithCommas = (value: number): string => {
    const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
    return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: 2,
    })}`;
};

function isMonthlySummary(value: unknown): value is MonthlySummary {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const month = Reflect.get(value, 'month');
    const spending = Reflect.get(value, 'spending');
    const receiving = Reflect.get(value, 'receiving');
    return (
        typeof month === 'string' &&
        typeof spending === 'number' &&
        typeof receiving === 'number'
    );
}

const renderCustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || payload === undefined || payload.length === 0) {
        return null;
    }
    const nested = payload[0]?.payload;
    if (!isMonthlySummary(nested)) {
        return null;
    }
    const receiving = nested.receiving;
    const spending = nested.spending;
    const difference = receiving - spending;

    return (
        <div className={chartTooltipClass}>
            <p className="mb-1 font-semibold">{label}</p>
            <p style={{ color: '#4ade80' }}>{`Receiving: ${formatCurrencyWithCommas(receiving)}`}</p>
            <p style={{ color: '#f87171' }}>{`Spending: ${formatCurrencyWithCommas(spending)}`}</p>
            <hr className="my-1 border-white/15" />
            <p className={difference >= 0 ? 'text-green-400' : 'text-red-400'}>
                {`Difference: ${difference >= 0 ? '+' : ''}${formatCurrencyWithCommas(difference)}`}
            </p>
        </div>
    );
};

export const MonthlyBarGraph = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid
                    stroke={chartTheme.grid.stroke}
                    strokeDasharray={chartTheme.grid.strokeDasharray}
                />
                <XAxis dataKey="month" stroke={chartTheme.axis.stroke} tick={chartTheme.axis.tick} />
                <YAxis
                    stroke={chartTheme.axis.stroke}
                    tick={chartTheme.axis.tick}
                    tickFormatter={(val) => `${formatCurrencyWithCommas(val)}`}
                />
                <Tooltip content={renderCustomTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }} />
                <Legend wrapperStyle={chartTheme.legend.wrapperStyle} />
                <Bar dataKey="receiving" fill="#4ade80" name="Receiving" />
                <Bar dataKey="spending" fill="#f87171" name="Spending" />
            </BarChart>
        </ResponsiveContainer>
    );
};
