import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatChartAxisCompactMoney } from "@/lib/utils/chartMoney";
import { chartColors, chartTheme, chartTooltipClass } from "@/graphs/theme";

type MonthlySummary = {
    month: string;
    spending: number;
    receiving: number;
};

type Props = {
    data: MonthlySummary[];
    /** Shorter plot when the bar shares a row with the donut charts */
    compactInRow?: boolean;
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
            <p className="mb-2 text-[13px] font-semibold text-paper-fg">{label}</p>
            <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex items-center justify-between gap-6">
                    <span className="inline-flex items-center gap-2 text-paper-muted">
                        <span
                            className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
                            style={{ backgroundColor: chartColors.cashflowReceiving }}
                            aria-hidden
                        />
                        Receiving
                    </span>
                    <span className="font-mono tabular-nums text-paper-fg">
                        {formatCurrencyWithCommas(receiving)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="inline-flex items-center gap-2 text-paper-muted">
                        <span
                            className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
                            style={{ backgroundColor: chartColors.cashflowSpending }}
                            aria-hidden
                        />
                        Spending
                    </span>
                    <span className="font-mono tabular-nums text-paper-fg">
                        {formatCurrencyWithCommas(spending)}
                    </span>
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-6 border-t border-paper-border pt-2 text-[13px]">
                <span className="text-paper-muted">Difference</span>
                <span className="font-mono font-medium tabular-nums text-paper-fg">
                    {difference >= 0 ? '+' : ''}
                    {formatCurrencyWithCommas(difference)}
                </span>
            </div>
        </div>
    );
};

const CASHFLOW_BAR_SIZE = 18;
const CASHFLOW_BAR_GAP = 6;

export const MonthlyBarGraph = ({ data, compactInRow = false }: Props) => {
    const chartHeightClass = compactInRow
        ? 'h-[260px] @min-[80rem]/charts:h-[220px]'
        : 'h-[260px]';

    return (
        <div>
            <div className="mb-2 flex items-center gap-4 text-[11px] text-paper-muted">
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
                        style={{ backgroundColor: chartColors.cashflowReceiving }}
                        aria-hidden
                    />
                    Receiving
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
                        style={{ backgroundColor: chartColors.cashflowSpending }}
                        aria-hidden
                    />
                    Spending
                </span>
            </div>
            <div className={chartHeightClass}>
                <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 8, right: 12, bottom: 36, left: 4 }}
                barCategoryGap={4}
                barGap={CASHFLOW_BAR_GAP}
                barSize={CASHFLOW_BAR_SIZE}
            >
                <CartesianGrid
                    stroke={chartTheme.grid.stroke}
                    strokeDasharray={chartTheme.grid.strokeDasharray}
                    vertical={false}
                />
                <XAxis
                    dataKey="month"
                    stroke={chartTheme.axis.stroke}
                    tick={{
                        ...chartTheme.axis.tick,
                        fontSize: 11,
                    }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                />
                <YAxis
                    stroke={chartTheme.axis.stroke}
                    tick={{
                        ...chartTheme.axis.tick,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                    }}
                    tickFormatter={formatChartAxisCompactMoney}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                />
                <Tooltip content={renderCustomTooltip} cursor={{ fill: 'oklch(18% 0.012 250 / 0.05)' }} />
                <Bar dataKey="receiving" fill={chartColors.cashflowReceiving} name="Receiving" legendType="none" />
                <Bar dataKey="spending" fill={chartColors.cashflowSpending} name="Spending" legendType="none" />
            </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
