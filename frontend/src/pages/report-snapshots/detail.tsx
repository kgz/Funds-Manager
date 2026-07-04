import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import { glassCardClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import {
	fetchReportSnapshot,
	type ReportSnapshotDetail,
} from '@/types/report-snapshots';
import type { ServiceabilitySummaryResponse } from '@/types/serviceability';

const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCents = (cents: number): string => formatMoney(cents / 100);

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

function ServiceabilitySection({ summary }: { summary: ServiceabilitySummaryResponse }) {
	const incomeRows = useMemo(
		() =>
			summary.incomeLines.map((line) => [
				line.label,
				line.isConfirmed ? 'Yes' : 'No',
				formatMoney(line.monthlyDollars),
			]),
		[summary.incomeLines]
	);

	const liabilityRows = useMemo(
		() =>
			summary.liabilities.map((line) => [
				line.name,
				line.included ? line.rateType ?? '—' : 'No repayment set',
				line.included ? formatMoney(line.baselineRepaymentMonthlyDollars) : '—',
				line.included ? formatMoney(line.stressedRepaymentMonthlyDollars) : '—',
			]),
		[summary.liabilities]
	);

	const committedRows = useMemo(
		() =>
			summary.livingSplit.committedBuckets.map((bucket) => [
				bucket.label,
				formatMoney(bucket.monthlyAverageDollars),
			]),
		[summary.livingSplit.committedBuckets]
	);

	const discretionaryRows = useMemo(
		() =>
			summary.livingSplit.discretionaryBuckets.map((bucket) => [
				bucket.label,
				formatMoney(bucket.monthlyAverageDollars),
			]),
		[summary.livingSplit.discretionaryBuckets]
	);

	return (
		<div className="space-y-6">
			{summary.incomeUsesUnconfirmed ? (
				<InlineAlert variant="warning">
					No confirmed income streams — totals include all detected income.
				</InlineAlert>
			) : null}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard label="Monthly income" value={formatMoney(summary.incomeMonthlyDollars)} />
				<StatCard label="Loan repayments" value={formatMoney(summary.repaymentsMonthlyDollars)} />
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
	);
}

export function ReportSnapshotDetailPage() {
	const params = useParams();
	const snapshotId = params.id !== undefined ? Number.parseInt(params.id, 10) : Number.NaN;
	const [detail, setDetail] = useState<ReportSnapshotDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!Number.isFinite(snapshotId)) {
			setError('Invalid snapshot id');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await fetchReportSnapshot(snapshotId);
			setDetail(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load snapshot');
			setDetail(null);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<PageShell>
			<div className="mb-4">
				<Link
					to="/report-snapshots"
					className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
				>
					<ArrowLeft size="0.875rem" aria-hidden />
					All snapshots
				</Link>
			</div>

			{detail !== null ? (
				<PageHeader
					title={detail.name}
					subtitle={`As at ${detail.asAt} · analysis period ${detail.startDate} → ${detail.endDate}`}
				/>
			) : (
				<PageHeader title="Report snapshot" subtitle="Frozen broker figures" />
			)}

			{loading ? <PageLoadingState label="Loading snapshot…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{detail !== null && !loading ? (
				<div className="space-y-6">
					<InlineAlert variant="info">
						<Camera className="mr-1 inline" size="0.875rem" aria-hidden />
						Read-only snapshot captured {detail.createdAt}. Figures will not change when live
						data is updated.
					</InlineAlert>

					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard
							label="Total assets"
							value={formatCents(detail.payload.assets.totalValueCents)}
						/>
						<StatCard
							label="Total liabilities"
							value={formatCents(detail.payload.liabilities.totalBalanceCents)}
						/>
						<StatCard
							label="Net worth (as at)"
							value={
								detail.payload.netWorth.latest
									? formatMoney(detail.payload.netWorth.latest.netWorth)
									: '—'
							}
						/>
						<StatCard
							label="Income (monthly)"
							value={formatMoney(detail.payload.income.totalMonthlyDollars)}
						/>
					</div>

					<ServiceabilitySection summary={detail.payload.serviceability} />
				</div>
			) : null}
		</PageShell>
	);
}
