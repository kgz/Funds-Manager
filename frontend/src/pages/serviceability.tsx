import { useCallback, useEffect, useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import {
	BREAKDOWN_PRESET_PERIODS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	type DashboardPeriod,
	periodDateRange,
	readStoredPeriod,
} from '@/components/dashboard/period';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import { glassCardClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	fetchServiceabilitySummary,
	type ServiceabilitySummaryResponse,
} from '@/types/serviceability';

const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function surplusTone(value: number): string {
	if (value >= 0) {
		return 'text-green-400';
	}
	return 'text-red-400';
}

function BreakdownTable({
	title,
	headers,
	rows,
}: {
	title: string;
	headers: string[];
	rows: string[][];
}) {
	if (rows.length === 0) {
		return null;
	}
	return (
		<div className={glassCardClass}>
			<h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[32rem] text-sm">
					<thead>
						<tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
							{headers.map((header) => (
								<th key={header} className="px-3 py-2 font-medium">
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((cells) => (
							<tr key={cells.join('|')} className="border-t border-white/5 text-white/85">
								{cells.map((cell, index) => (
									<td
										key={`${cells[0]}-${String(index)}`}
										className={cn(
											'px-3 py-2',
											index > 0 ? 'text-right font-mono tabular-nums' : ''
										)}
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function ServiceabilityPage() {
	const { accountIdNumber } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [summary, setSummary] = useState<ServiceabilitySummaryResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const dateRange = useMemo(() => periodDateRange(period), [period]);

	const load = useCallback(async () => {
		const start = dateRange.start;
		const end = dateRange.end;
		if (start === undefined || end === undefined) {
			setSummary(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await fetchServiceabilitySummary({
				startDate: start,
				endDate: end,
				accountId: accountIdNumber,
			});
			setSummary(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load serviceability');
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [accountIdNumber, dateRange.end, dateRange.start]);

	useEffect(() => {
		localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		void load();
	}, [load]);

	const incomeRows = useMemo(
		() =>
			summary?.incomeLines.map((line) => [
				line.label,
				line.isConfirmed ? 'Yes' : 'No',
				formatMoney(line.monthlyDollars),
			]) ?? [],
		[summary]
	);

	const liabilityRows = useMemo(
		() =>
			summary?.liabilities.map((line) => [
				line.name,
				line.included ? line.rateType ?? '—' : 'No repayment set',
				line.included ? formatMoney(line.baselineRepaymentMonthlyDollars) : '—',
				line.included ? formatMoney(line.stressedRepaymentMonthlyDollars) : '—',
			]) ?? [],
		[summary]
	);

	const committedRows = useMemo(
		() =>
			summary?.livingSplit.committedBuckets.map((bucket) => [
				bucket.label,
				formatMoney(bucket.monthlyAverageDollars),
			]) ?? [],
		[summary]
	);

	const discretionaryRows = useMemo(
		() =>
			summary?.livingSplit.discretionaryBuckets.map((bucket) => [
				bucket.label,
				formatMoney(bucket.monthlyAverageDollars),
			]) ?? [],
		[summary]
	);

	return (
		<PageShell>
			<PageHeader
				title="Serviceability"
				subtitle="Monthly surplus from income, loan repayments, and living expenses. Stressed figures apply a rate buffer to variable debts."
			/>
			<div className="mb-6 flex flex-wrap items-end gap-4">
				<PeriodFilter
					value={period}
					onChange={setPeriod}
					periods={BREAKDOWN_PRESET_PERIODS}
					pending={loading}
					ariaLabel="Serviceability period"
				/>
				<AccountFilter />
			</div>

			{loading ? <PageLoadingState label="Loading serviceability…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{!loading && summary === null && error === null ? (
				<EmptyState
					icon={Scale}
					title="Choose a period"
					description="Select a date range to calculate monthly surplus."
				/>
			) : null}

			{summary !== null && !loading ? (
				<div className="space-y-6">
					{summary.incomeUsesUnconfirmed ? (
						<InlineAlert variant="warning">
							No confirmed income streams — totals include all detected income.
						</InlineAlert>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard label="Monthly income" value={formatMoney(summary.incomeMonthlyDollars)} />
						<StatCard
							label="Loan repayments"
							value={formatMoney(summary.repaymentsMonthlyDollars)}
						/>
						<StatCard
							label="Living expenses"
							value={formatMoney(summary.livingExpensesMonthlyDollars)}
						/>
						<StatCard
							label="Monthly surplus"
							value={formatMoney(summary.surplusMonthlyDollars)}
							valueClassName={surplusTone(summary.surplusMonthlyDollars)}
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<StatCard
							label={`Stressed surplus (+${(summary.rateBufferBps / 100).toFixed(1)}% buffer)`}
							value={formatMoney(summary.stressedSurplusMonthlyDollars)}
							valueClassName={surplusTone(summary.stressedSurplusMonthlyDollars)}
						/>
						<StatCard
							label="Committed (repayments + essential living)"
							value={formatMoney(summary.committedTotalMonthlyDollars)}
						/>
						<StatCard
							label="Discretionary living"
							value={formatMoney(summary.discretionaryTotalMonthlyDollars)}
						/>
					</div>
					<BreakdownTable
						title="Income streams"
						headers={['Source', 'Confirmed', 'Monthly']}
						rows={incomeRows}
					/>
					<BreakdownTable
						title="Liabilities"
						headers={['Name', 'Rate type', 'Repayment', 'Stressed']}
						rows={liabilityRows}
					/>
					<BreakdownTable
						title="Committed living expenses"
						headers={['Bucket', 'Monthly avg']}
						rows={committedRows}
					/>
					<BreakdownTable
						title="Discretionary living expenses"
						headers={['Bucket', 'Monthly avg']}
						rows={discretionaryRows}
					/>
				</div>
			) : null}
		</PageShell>
	);
}
