import { useMemo } from 'react';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { ReportCoveragePanel } from '@/pages/report-snapshots/coverage-panel';
import type { BrokerReportAnnotation } from '@/types/broker-report';
import type { ReportSnapshotPayload } from '@/types/report-snapshots';
import type { ServiceabilitySummaryResponse } from '@/types/serviceability';
import { cn } from '@/lib/utils/cn';

const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCents = (cents: number): string => formatMoney(cents / 100);

function readTermMonths(item: object): number | null {
	const raw = Reflect.get(item, 'termMonths') ?? Reflect.get(item, 'term_months');
	if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
		return Math.trunc(raw);
	}
	return null;
}

function readValuedAt(item: object): string | null {
	const raw = Reflect.get(item, 'valuedAt') ?? Reflect.get(item, 'valued_at');
	if (typeof raw === 'string' && raw.length >= 10) {
		return raw;
	}
	return null;
}

function formatValuedAt(valuedAt: string | null): string {
	if (valuedAt === null) {
		return '—';
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valuedAt);
	if (match === null) {
		return '—';
	}
	const year = match[1];
	const month = Number.parseInt(match[2], 10);
	const day = Number.parseInt(match[3], 10);
	if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12) {
		return '—';
	}
	const date = new Date(Date.UTC(Number.parseInt(year, 10), month - 1, day));
	return date.toLocaleDateString('en-AU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

function formatTermRemaining(months: number | null): string {
	if (months === null) {
		return '—';
	}
	if (months === 0) {
		return 'Paid off';
	}
	if (months < 12) {
		return `${months} mo`;
	}
	const years = Math.floor(months / 12);
	const remainder = months % 12;
	if (remainder === 0) {
		return `${years} yr`;
	}
	return `${years} yr ${remainder} mo`;
}

function liabilityTermById(payload: ReportSnapshotPayload): Map<number, number | null> {
	const map = new Map<number, number | null>();
	for (const item of payload.liabilities.items) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const idRaw = Reflect.get(item, 'id');
		if (typeof idRaw !== 'number' || !Number.isFinite(idRaw)) {
			continue;
		}
		map.set(Math.trunc(idRaw), readTermMonths(item));
	}
	return map;
}

function surplusTone(value: number): string {
	if (value >= 0) {
		return 'text-emerald-700';
	}
	return 'text-red-700';
}

type ColumnAlign = 'left' | 'right';

function columnAlignClass(align: ColumnAlign, numeric: boolean): string {
	return cn(
		'px-3 py-2',
		align === 'right' ? 'text-right' : 'text-left',
		numeric ? 'font-mono tabular-nums' : ''
	);
}

function defaultColumnAligns(columnCount: number): ColumnAlign[] {
	if (columnCount <= 1) {
		return ['left'];
	}
	if (columnCount === 2) {
		return ['left', 'right'];
	}
	if (columnCount === 3) {
		return ['left', 'left', 'right'];
	}
	return Array.from({ length: columnCount }, (_, index) =>
		index === 0 ? 'left' : 'right'
	);
}

function isNumericCell(header: string): boolean {
	const lower = header.toLowerCase();
	return (
		lower.includes('monthly') ||
		lower.includes('value') ||
		lower.includes('balance') ||
		lower.includes('repayment') ||
		lower.includes('stressed') ||
		lower.includes('amount') ||
		lower === 'total'
	);
}

function ReportTable({
	title,
	headers,
	rows,
	columnAligns,
	footerRow,
}: {
	title: string;
	headers: string[];
	rows: string[][];
	columnAligns?: ColumnAlign[];
	footerRow?: string[];
}) {
	if (rows.length === 0) {
		return null;
	}
	const aligns = columnAligns ?? defaultColumnAligns(headers.length);
	return (
		<section className="broker-report-section space-y-2">
			<h2 className="text-base font-semibold text-gray-900">{title}</h2>
			<div className="overflow-x-auto rounded border border-gray-200">
				<table className="w-full table-fixed text-sm">
					<colgroup>
						{headers.map((header, index) => {
							let width = `${Math.floor(100 / headers.length)}%`;
							if (headers.length === 3) {
								width = index === 0 ? '46%' : index === 1 ? '22%' : '32%';
							} else if (headers.length === 2) {
								width = index === 0 ? '62%' : '38%';
							} else if (headers.length >= 4) {
								width =
									index === 0
										? '34%'
										: index === headers.length - 1
											? '18%'
											: `${Math.floor(48 / (headers.length - 2))}%`;
							}
							return <col key={header} style={{ width }} />;
						})}
					</colgroup>
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
							{headers.map((header, index) => (
								<th
									key={header}
									className={columnAlignClass(
										aligns[index] ?? 'left',
										isNumericCell(header)
									)}
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((cells) => (
							<tr key={cells.join('|')} className="border-t border-gray-100 text-gray-800">
								{cells.map((cell, index) => (
									<td
										key={`${cells[0]}-${String(index)}`}
										className={columnAlignClass(
											aligns[index] ?? 'left',
											isNumericCell(headers[index] ?? '')
										)}
									>
										{cell}
									</td>
								))}
							</tr>
						))}
						{footerRow !== undefined ? (
							<tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-900">
								{footerRow.map((cell, index) => (
									<td
										key={`footer-${String(index)}`}
										className={columnAlignClass(
											aligns[index] ?? 'left',
											isNumericCell(headers[index] ?? '')
										)}
									>
										{cell}
									</td>
								))}
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function HandoffSummary({ payload }: { payload: ReportSnapshotPayload }) {
	const { serviceability: svc, lenderExpenses } = payload;
	return (
		<section className="broker-report-section space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-5">
			<div>
				<h2 className="text-base font-semibold text-gray-900">At a glance</h2>
				<p className="mt-1 text-sm text-gray-600">
					Key monthly figures to have handy before a meeting — living expenses are broken down
					in the spending table below.
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="rounded border border-sky-100 bg-white px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
						Gross income (monthly)
					</p>
					<p className="mt-1 text-xl font-semibold text-gray-900">
						{formatMoney(svc.incomeMonthlyDollars)}
					</p>
					<p className="mt-1 text-xs text-gray-500">Confirmed wages, before tax</p>
				</div>
				<div className="rounded border border-sky-100 bg-white px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
						Loan repayments (monthly)
					</p>
					<p className="mt-1 text-xl font-semibold text-gray-900">
						{formatMoney(svc.repaymentsMonthlyDollars)}
					</p>
					<p className="mt-1 text-xs text-gray-500">
						Home + car from liabilities — not in living expenses
					</p>
				</div>
				<div className="rounded border border-sky-100 bg-white px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
						Living expenses (monthly avg)
					</p>
					<p className="mt-1 text-xl font-semibold text-gray-900">
						{formatMoney(lenderExpenses.totalMonthlyDollars)}
					</p>
					<p className="mt-1 text-xs text-gray-500">
						From bank statements over the analysis period
					</p>
				</div>
			</div>
			<p className="text-sm text-gray-700">
				<span className="font-medium">Left over each month:</span>{' '}
				{formatMoney(svc.surplusMonthlyDollars)}/mo — gross income minus repayments minus
				living. Take-home in your account is lower than gross income.
			</p>
		</section>
	);
}

function MonthlyBreakdownBlock({
	summary,
	liabilityTerms,
}: {
	summary: ServiceabilitySummaryResponse;
	liabilityTerms: Map<number, number | null>;
}) {
	const incomeRows = summary.incomeLines.map((line) => [
		line.label,
		line.isConfirmed ? 'Yes' : 'No',
		formatMoney(line.monthlyDollars),
	]);
	const liabilityRows = summary.liabilities.map((line) => [
		line.name,
		line.included ? line.rateType ?? '—' : 'No repayment set',
		formatTermRemaining(liabilityTerms.get(line.id) ?? null),
		line.included ? formatMoney(line.baselineRepaymentMonthlyDollars) : '—',
	]);
	const committedRows = summary.livingSplit.committedBuckets.map((bucket) => [
		bucket.label,
		formatMoney(bucket.monthlyAverageDollars),
	]);
	const discretionaryRows = summary.livingSplit.discretionaryBuckets.map((bucket) => [
		bucket.label,
		formatMoney(bucket.monthlyAverageDollars),
	]);

	return (
		<section className="broker-report-section space-y-4">
			<div>
				<h2 className="text-base font-semibold text-gray-900">Monthly breakdown</h2>
				<p className="mt-1 text-sm text-gray-600">
					How income, loan repayments, and living costs add up for this snapshot.
				</p>
			</div>
			{summary.incomeUsesUnconfirmed ? (
				<InlineAlert variant="warning">
					No confirmed income streams — totals include all detected income.
				</InlineAlert>
			) : null}
			<Stat
				label="Left over (monthly)"
				value={formatMoney(summary.surplusMonthlyDollars)}
				valueClassName={surplusTone(summary.surplusMonthlyDollars)}
			/>
			<ReportTable
				title="Income"
				headers={['Source', 'Confirmed', 'Monthly']}
				rows={incomeRows}
				columnAligns={['left', 'left', 'right']}
			/>
			<ReportTable
				title="Loan repayments"
				headers={['Name', 'Rate type', 'Term left', 'Repayment']}
				rows={liabilityRows}
				columnAligns={['left', 'left', 'left', 'right']}
			/>
			<ReportTable
				title="Essential spending"
				headers={['Category', 'Monthly avg']}
				rows={committedRows}
			/>
			<ReportTable
				title="Other spending"
				headers={['Category', 'Monthly avg']}
				rows={discretionaryRows}
				footerRow={[
					'Total living expenses',
					formatMoney(summary.livingExpensesMonthlyDollars),
				]}
			/>
		</section>
	);
}

function Stat({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
			<p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
			<p className={cn('mt-1 text-lg font-semibold text-gray-900', valueClassName)}>{value}</p>
		</div>
	);
}

function assetRows(payload: ReportSnapshotPayload): string[][] {
	const rows: string[][] = [];
	for (const item of payload.assets.items) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const name =
			typeof Reflect.get(item, 'name') === 'string' ? Reflect.get(item, 'name') : '—';
		const kind =
			typeof Reflect.get(item, 'kind') === 'string' ? Reflect.get(item, 'kind') : '—';
		const valueCents = Reflect.get(item, 'valueCents') ?? Reflect.get(item, 'value_cents');
		const cents = typeof valueCents === 'number' && Number.isFinite(valueCents) ? valueCents : 0;
		rows.push([name, kind, formatCents(cents), formatValuedAt(readValuedAt(item))]);
	}
	return rows;
}

function liabilityRows(payload: ReportSnapshotPayload): string[][] {
	const rows: string[][] = [];
	for (const item of payload.liabilities.items) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const name =
			typeof Reflect.get(item, 'name') === 'string' ? Reflect.get(item, 'name') : '—';
		const kind =
			typeof Reflect.get(item, 'kind') === 'string' ? Reflect.get(item, 'kind') : '—';
		const balanceCents =
			Reflect.get(item, 'balanceCents') ?? Reflect.get(item, 'balance_cents');
		const cents =
			typeof balanceCents === 'number' && Number.isFinite(balanceCents) ? balanceCents : 0;
		rows.push([name, kind, formatCents(cents), formatTermRemaining(readTermMonths(item))]);
	}
	return rows;
}

export type BrokerReportContentProps = {
	title: string;
	asAt: string;
	startDate: string;
	endDate: string;
	capturedAt: string;
	snapshotId: number;
	payload: ReportSnapshotPayload;
	annotations: BrokerReportAnnotation[];
	disclaimer: string;
	dataSources: string[];
};

export function BrokerReportContent({
	title,
	asAt,
	startDate,
	endDate,
	capturedAt,
	snapshotId,
	payload,
	annotations,
	disclaimer,
	dataSources,
}: BrokerReportContentProps) {
	const chartData = useMemo(
		() =>
			payload.netWorth.points.map((point) => ({
				date: point.date,
				netWorth: point.netWorth,
			})),
		[payload.netWorth.points]
	);

	const liabilityTerms = useMemo(() => liabilityTermById(payload), [payload]);

	const incomeRows = payload.income.streams.map((stream) => [
		stream.label,
		stream.isConfirmed ? 'Yes' : 'No',
		formatMoney(stream.estimatedMonthlyDollars),
	]);

	const expenseRows = payload.lenderExpenses.buckets.map((bucket) => [
		bucket.label,
		formatMoney(bucket.monthlyAverageDollars),
	]);

	const annotationRows = annotations.map((item) => [
		item.transactionDate,
		item.transactionDescription,
		formatMoney(item.transactionAmount / 100),
		item.excludeFromAnalysis ? 'Yes' : 'No',
		item.note,
	]);

	return (
		<article className="broker-report-document mx-auto max-w-5xl space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
			<header className="broker-report-section space-y-2 border-b border-gray-200 pb-6">
				<p className="text-xs uppercase tracking-[0.2em] text-gray-500">Finance summary</p>
				<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
				<p className="text-sm text-gray-600">
					As at {asAt} · analysis period {startDate} → {endDate}
				</p>
				<p className="text-sm text-gray-500">Captured {capturedAt} · snapshot #{snapshotId}</p>
			</header>

			{payload.coverage !== null && !payload.coverage.sufficient ? (
				<div className="broker-report-section">
					<ReportCoveragePanel coverage={payload.coverage} />
				</div>
			) : null}

			<HandoffSummary payload={payload} />

			<section className="broker-report-section space-y-3">
				<h2 className="text-base font-semibold text-gray-900">Position summary</h2>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<Stat label="Total assets" value={formatCents(payload.assets.totalValueCents)} />
					<Stat
						label="Total liabilities"
						value={formatCents(payload.liabilities.totalBalanceCents)}
					/>
					<Stat
						label="Net worth (as at)"
						value={
							payload.netWorth.latest
								? formatMoney(payload.netWorth.latest.netWorth)
								: '—'
						}
					/>
					<Stat
						label="Detected income (monthly)"
						value={formatMoney(payload.income.totalMonthlyDollars)}
					/>
				</div>
				<p className="text-xs text-gray-500">
					Detected income includes all streams from statements. Confirmed gross income is in
					&ldquo;At a glance&rdquo; above.
				</p>
				{chartData.length > 0 ? (
					<div className="h-64 w-full rounded border border-gray-200 bg-white p-2">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
								<XAxis dataKey="date" tick={{ fontSize: 11 }} />
								<YAxis tick={{ fontSize: 11 }} />
								<Tooltip />
								<Line
									type="monotone"
									dataKey="netWorth"
									stroke="#2563eb"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				) : null}
			</section>

			<section className="broker-report-section space-y-3">
				<div>
					<h2 className="text-base font-semibold text-gray-900">Living expenses</h2>
					<p className="mt-1 text-sm text-gray-600">
						Average monthly spending from your statements, grouped by category. Loan
						repayments are not included here.
					</p>
				</div>
				<ReportTable
					title="Monthly averages"
					headers={['Category', 'Monthly avg']}
					rows={expenseRows}
					footerRow={[
						'Total living expenses',
						formatMoney(payload.lenderExpenses.totalMonthlyDollars),
					]}
				/>
			</section>

			<section className="broker-report-section space-y-3">
				<h2 className="text-base font-semibold text-gray-900">Income from statements</h2>
				<ReportTable
					title="All detected streams"
					headers={['Source', 'Confirmed', 'Monthly est.']}
					rows={incomeRows}
					columnAligns={['left', 'left', 'right']}
				/>
			</section>

			<MonthlyBreakdownBlock
				summary={payload.serviceability}
				liabilityTerms={liabilityTerms}
			/>

			<ReportTable
				title="Assets"
				headers={['Name', 'Kind', 'Value', 'Last estimated']}
				rows={assetRows(payload)}
				columnAligns={['left', 'left', 'right', 'left']}
				footerRow={['Total assets', '', formatCents(payload.assets.totalValueCents), '']}
			/>
			<ReportTable
				title="Liabilities"
				headers={['Name', 'Kind', 'Balance', 'Term left']}
				rows={liabilityRows(payload)}
				columnAligns={['left', 'left', 'right', 'left']}
				footerRow={[
					'Total liabilities',
					'',
					formatCents(payload.liabilities.totalBalanceCents),
					'',
				]}
			/>

			{annotations.length > 0 ? (
				<ReportTable
					title="Annotations"
					headers={['Date', 'Transaction', 'Amount', 'Exclude', 'Note']}
					rows={annotationRows}
					columnAligns={['left', 'left', 'right', 'left', 'left']}
				/>
			) : null}

			<footer className="broker-report-section space-y-2 border-t border-gray-200 pt-6 text-sm text-gray-600">
				<p>{disclaimer}</p>
				<p>
					<span className="font-medium text-gray-800">Data sources:</span>{' '}
					{dataSources.length > 0 ? dataSources.join(', ') : 'All linked accounts'}
				</p>
			</footer>
		</article>
	);
}
