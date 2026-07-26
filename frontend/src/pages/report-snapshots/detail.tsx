import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	glassCardClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import {
	fetchReportSnapshot,
	type ReportSnapshotDetail,
} from '@/types/report-snapshots';
import type { ServiceabilitySummaryResponse } from '@/types/serviceability';
import {
	buildDomainCoverageFromPayload,
} from './coverage-items';
import {
	CoverageSummaryList,
	formatMoney,
	formatSnapshotPeriodLabel,
	formatSnapshotDate,
	FrozenBadge,
	MetricRows,
	ReportKpiRow,
	rsBtnClass,
	rsKpiMoneyClass,
	rsPanelHeadClass,
	SectionEyebrow,
	SurplusBar,
} from './shared';

function snapshotAccountLabel(detail: ReportSnapshotDetail): string {
	if (detail.accountId === null) {
		return 'All accounts';
	}
	const match = detail.payload.accounts.find((account) => account.id === detail.accountId);
	return match?.displayName ?? `Account ${detail.accountId}`;
}

function surplusToneClass(value: number): string {
	return value >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]';
}

function buildServiceabilityRows(summary: ServiceabilitySummaryResponse) {
	const incomeRows = summary.incomeLines.map((line) => ({
		label: line.label,
		sub: line.isConfirmed ? 'Confirmed' : 'Unconfirmed',
		value: formatMoney(line.monthlyDollars),
	}));

	const repaymentRows = summary.liabilities
		.filter((line) => line.included)
		.map((line) => ({
			label: line.name,
			sub: line.rateType ?? undefined,
			value: formatMoney(line.baselineRepaymentMonthlyDollars),
		}));

	const livingRows = [
		...summary.livingSplit.committedBuckets,
		...summary.livingSplit.discretionaryBuckets,
	].map((bucket) => ({
		label: bucket.label,
		value: formatMoney(bucket.monthlyAverageDollars),
	}));

	return { incomeRows, repaymentRows, livingRows };
}

function SnapshotDetailBody({ detail }: { detail: ReportSnapshotDetail }) {
	const summary = detail.payload.serviceability;
	const netWorth = detail.payload.netWorth.latest?.netWorth ?? null;
	const accountLabel = snapshotAccountLabel(detail);
	const periodLabel = formatSnapshotPeriodLabel(detail.startDate, detail.endDate);
	const coverageItems =
		detail.payload.coverage !== null
			? buildDomainCoverageFromPayload({
					coverage: detail.payload.coverage,
					income: detail.payload.income,
					lenderExpenses: detail.payload.lenderExpenses,
					assets: detail.payload.assets,
					liabilities: detail.payload.liabilities,
				})
			: [];
	const { incomeRows, repaymentRows, livingRows } = buildServiceabilityRows(summary);
	const surplus = summary.surplusMonthlyDollars;

	const kpiItems = [
		{
			label: 'Income',
			value: formatMoney(summary.incomeMonthlyDollars),
			delta: 'Monthly · frozen',
		},
		{
			label: 'Repayments',
			value: formatMoney(summary.repaymentsMonthlyDollars),
			delta: 'Existing facilities',
		},
		{
			label: 'Living',
			value: formatMoney(summary.livingExpensesMonthlyDollars),
			delta: 'HEM-style average',
		},
		{
			label: 'Surplus',
			value: formatMoney(surplus),
			delta: 'Net monthly',
			valueClassName: surplusToneClass(surplus),
		},
		{
			label: 'Net worth',
			value: netWorth === null ? '—' : formatMoney(netWorth),
			delta: 'Assets − liabilities',
		},
	];

	const coverageMeta = `${accountLabel} · ${periodLabel.toLowerCase()}`;

	return (
		<div className="flex flex-col gap-6">
			<ReportKpiRow items={kpiItems} />

			<div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
				<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className={rsPanelHeadClass}>
						<h2 className={panelTitleClass}>Serviceability breakdown</h2>
						<p className={cn(panelHintClass, 'm-0 shrink-0')}>Monthly · AUD</p>
					</div>
					<div className="p-4">
						<SectionEyebrow className="mb-3 mt-0">Income</SectionEyebrow>
						<MetricRows
							rows={incomeRows}
							totalLabel="Total income"
							totalValue={formatMoney(summary.incomeMonthlyDollars)}
						/>

						<SectionEyebrow className="mb-3 mt-5">Repayments</SectionEyebrow>
						<MetricRows
							rows={repaymentRows}
							totalLabel="Total repayments"
							totalValue={formatMoney(summary.repaymentsMonthlyDollars)}
						/>

						<SectionEyebrow className="mb-3 mt-5">Living costs</SectionEyebrow>
						<MetricRows
							rows={livingRows}
							totalLabel="Total living"
							totalValue={formatMoney(summary.livingExpensesMonthlyDollars)}
						/>

						<div className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-4 py-3.5">
							<span className="text-[13px] font-medium text-paper-fg">Net surplus / month</span>
							<span
								className={cn(
									rsKpiMoneyClass,
									'text-[20px]',
									surplusToneClass(surplus)
								)}
							>
								{formatMoney(surplus)}
							</span>
						</div>
						<SurplusBar surplus={surplus} income={summary.incomeMonthlyDollars} />
					</div>
				</section>

				<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className={rsPanelHeadClass}>
						<h2 className={panelTitleClass}>Coverage summary</h2>
						<p className={cn(panelHintClass, 'm-0 shrink-0')}>{coverageMeta}</p>
					</div>
					<div className="p-4">
						{coverageItems.length > 0 ? (
							<CoverageSummaryList items={coverageItems} />
						) : (
							<p className="m-0 text-[13px] text-paper-muted">
								Coverage was not recorded for this snapshot.
							</p>
						)}
					</div>
				</section>
			</div>
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

	if (loading && detail === null && error === null) {
		return <PageLoadingState label="Loading snapshot…" />;
	}

	if (error !== null && detail === null) {
		return (
			<PageShell variant="table">
				<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
					<ErrorState
						title="Snapshot not found"
						message="This snapshot may have been deleted. Return to the list and pick another report."
						onRetry={() => void load()}
						retryLabel="Try again"
					/>
					<p className="mt-4 text-center">
						<Link
							to="/report-snapshots"
							className="text-[13px] font-medium text-secondary-default underline underline-offset-2 hover:text-paper-fg"
						>
							Back to report snapshots
						</Link>
					</p>
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell variant="table">
			<header className="sticky top-0 z-30 shrink-0 border-b border-paper-border bg-paper-surface px-8 pb-5 pt-7">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<Link
							to="/report-snapshots"
							className="mb-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-paper-muted transition-colors hover:text-paper-fg"
						>
							<ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
							Report snapshots
						</Link>
						{detail !== null ? (
							<>
								<h1 className={cn(pageTitleClass, 'flex flex-wrap items-center gap-0')}>
									{detail.name}
									<FrozenBadge />
								</h1>
								<p className={pageSubtitleClass}>
									As at {formatSnapshotDate(detail.asAt)} ·{' '}
									{formatSnapshotPeriodLabel(detail.startDate, detail.endDate)} ·{' '}
									{snapshotAccountLabel(detail)} · saved{' '}
									{formatSnapshotDate(detail.createdAt, 'datetime')}
								</p>
							</>
						) : (
							<>
								<h1 className={pageTitleClass}>Report snapshot</h1>
								<p className={pageSubtitleClass}>Frozen figures from a point in time</p>
							</>
						)}
					</div>
					{detail !== null ? (
						<Link to={`/report-snapshots/${detail.id}/report`} className={rsBtnClass}>
							Print report
						</Link>
					) : null}
				</div>
			</header>

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				{detail !== null ? <SnapshotDetailBody detail={detail} /> : null}
			</div>
		</PageShell>
	);
}
