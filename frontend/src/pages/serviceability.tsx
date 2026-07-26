import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import {
	BREAKDOWN_PRESET_PERIODS,
	DASHBOARD_PERIOD_STORAGE_KEY,
	PERIOD_LABELS,
	type DashboardPeriod,
	periodDateRange,
	readStoredPeriod,
} from '@/components/dashboard/period';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import {
	glassCardClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	formatMoney,
	leKpiLabelClass,
	leKpiMoneyClass,
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
} from '@/pages/lender-expenses/shared';
import {
	MetricRows,
	rsKpiDeltaClass,
	rsPanelHeadClass,
	SurplusBar,
} from '@/pages/report-snapshots/shared';
import {
	fetchServiceabilitySummary,
	type ServiceabilitySummaryResponse,
} from '@/types/serviceability';

type ServiceabilityScenario = 'base' | 'stress';

function surplusToneClass(value: number): string {
	return value >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]';
}

function formatNegativeMoney(value: number): string {
	return `−${formatMoney(value)}`;
}

type BreakdownMetricRow = {
	label: string;
	sub?: string;
	value: string;
};

type BreakdownPanelProps = {
	title: string;
	hint: string;
	rows: BreakdownMetricRow[];
	totalLabel: string;
	totalValue: string;
	emptyMessage?: string;
};

function BreakdownPanel({
	title,
	hint,
	rows,
	totalLabel,
	totalValue,
	emptyMessage = 'Nothing to show.',
}: BreakdownPanelProps) {
	return (
		<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
			<div className={rsPanelHeadClass}>
				<h2 className={panelTitleClass}>{title}</h2>
				<p className={cn(panelHintClass, 'm-0 shrink-0')}>{hint}</p>
			</div>
			<div className="p-4">
				{rows.length > 0 ? (
					<MetricRows rows={rows} totalLabel={totalLabel} totalValue={totalValue} />
				) : (
					<p className="m-0 text-[13px] text-paper-muted">{emptyMessage}</p>
				)}
			</div>
		</section>
	);
}

export function ServiceabilityPage() {
	const { accountIdNumber } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [scenario, setScenario] = useState<ServiceabilityScenario>('base');
	const [summary, setSummary] = useState<ServiceabilitySummaryResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const dateRange = useMemo(() => periodDateRange(period), [period]);
	const stressMode = scenario === 'stress';

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

	const repaymentsMonthly = useMemo(() => {
		if (summary === null) {
			return 0;
		}
		return stressMode
			? summary.stressedRepaymentsMonthlyDollars
			: summary.repaymentsMonthlyDollars;
	}, [stressMode, summary]);

	const surplusMonthly = useMemo(() => {
		if (summary === null) {
			return 0;
		}
		return stressMode ? summary.stressedSurplusMonthlyDollars : summary.surplusMonthlyDollars;
	}, [stressMode, summary]);

	const commitmentsMonthly = useMemo(() => {
		if (summary === null) {
			return 0;
		}
		return repaymentsMonthly + summary.livingExpensesMonthlyDollars;
	}, [repaymentsMonthly, summary]);

	const incomeMetricRows = useMemo(
		() =>
			summary?.incomeLines.map((line) => ({
				label: line.label,
				sub: line.isConfirmed ? 'Confirmed' : 'Unconfirmed',
				value: formatMoney(line.monthlyDollars),
			})) ?? [],
		[summary]
	);

	const repaymentMetricRows = useMemo(
		() =>
			summary?.liabilities.map((line) => {
				if (!line.included) {
					return {
						label: line.name,
						sub: 'No repayment set',
						value: '—',
					};
				}
				const repayment = stressMode
					? line.stressedRepaymentMonthlyDollars
					: line.baselineRepaymentMonthlyDollars;
				const rateLabel = line.rateType ?? '—';
				const stressedNote =
					stressMode &&
					line.stressedRepaymentMonthlyDollars > line.baselineRepaymentMonthlyDollars
						? ' · stressed'
						: '';
				return {
					label: line.name,
					sub: `${rateLabel}${stressedNote}`,
					value: formatMoney(repayment),
				};
			}) ?? [],
		[stressMode, summary]
	);

	const livingMetricRows = useMemo(() => {
		if (summary === null) {
			return [];
		}
		return [
			...summary.livingSplit.committedBuckets,
			...summary.livingSplit.discretionaryBuckets,
		].map((bucket) => ({
			label: bucket.label,
			value: formatMoney(bucket.monthlyAverageDollars),
		}));
	}, [summary]);

	const initialLoading = loading && summary === null && error === null;
	if (initialLoading) {
		return <PageLoadingState label="Loading serviceability…" />;
	}

	if (error !== null && summary === null) {
		return (
			<ErrorState
				title="Error loading serviceability"
				message={error}
				onRetry={() => void load()}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<header className="sticky top-0 z-30 shrink-0 border-b border-paper-border bg-paper-surface px-8 py-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Serviceability</h1>
							{loading ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Broker-style surplus from income, repayments & living costs
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2.5">
						<SegmentedControl
							ariaLabel="Serviceability scenario"
							value={scenario}
							onChange={setScenario}
							options={[
								{ value: 'base', label: 'Base case' },
								{
									value: 'stress',
									label: `Stress (+${summary !== null ? (summary.rateBufferBps / 100).toFixed(0) : '3'}%)`,
								},
							]}
						/>
						<AccountFilter />
					</div>
				</div>
			</header>

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap items-center gap-2.5">
						<div className={leSegmentedClass} role="group" aria-label="Serviceability period">
							{BREAKDOWN_PRESET_PERIODS.map((preset) => (
								<button
									key={preset}
									type="button"
									className={cn(
										leSegmentButtonClass,
										period === preset && leSegmentButtonActiveClass
									)}
									aria-pressed={period === preset}
									onClick={() => setPeriod(preset)}
								>
									{PERIOD_LABELS[preset]}
								</button>
							))}
						</div>
					</div>

					{!loading && summary === null && error === null ? (
						<EmptyState
							icon={Scale}
							title="Choose a period"
							description="Select a date range to calculate monthly surplus."
						/>
					) : null}

					{summary !== null ? (
						<>
							{summary.incomeUsesUnconfirmed ? (
								<InlineAlert variant="warning">
									No confirmed income streams — totals include all detected income.
								</InlineAlert>
							) : null}

							<section
								className="grid grid-cols-1 gap-3 sm:grid-cols-3"
								aria-label="Serviceability summary"
							>
								<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
									<p className={leKpiLabelClass}>Monthly income</p>
									<p className={cn(leKpiMoneyClass, 'mt-2')}>
										{formatMoney(summary.incomeMonthlyDollars)}
									</p>
									<p className={rsKpiDeltaClass}>
										{summary.incomeUsesUnconfirmed
											? 'All detected streams'
											: 'Confirmed streams'}
									</p>
								</article>
								<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
									<p className={leKpiLabelClass}>Commitments</p>
									<p className={cn(leKpiMoneyClass, 'mt-2')}>
										{formatMoney(commitmentsMonthly)}
									</p>
									<p className={rsKpiDeltaClass}>Repayments + living</p>
								</article>
								<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
									<p className={leKpiLabelClass}>Monthly surplus</p>
									<p className={cn(leKpiMoneyClass, 'mt-2', surplusToneClass(surplusMonthly))}>
										{formatMoney(surplusMonthly)}
									</p>
									<p className={rsKpiDeltaClass}>
										{stressMode ? 'Stressed repayments' : 'Base case'}
									</p>
								</article>
							</section>

							<div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
								<BreakdownPanel
									title="Income"
									hint="Monthly · AUD"
									rows={incomeMetricRows}
									totalLabel="Total income"
									totalValue={formatMoney(summary.incomeMonthlyDollars)}
									emptyMessage="No income streams detected."
								/>
								<BreakdownPanel
									title="Repayments"
									hint="Existing facilities"
									rows={repaymentMetricRows}
									totalLabel="Total repayments"
									totalValue={formatMoney(repaymentsMonthly)}
									emptyMessage="No active liabilities."
								/>
							</div>

							<div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
								<BreakdownPanel
									title="Living costs"
									hint="From categorised spend · HEM-style"
									rows={livingMetricRows}
									totalLabel="Total living"
									totalValue={formatMoney(summary.livingExpensesMonthlyDollars)}
									emptyMessage="No living expenses in this period."
								/>

								<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
									<div className={rsPanelHeadClass}>
										<h2 className={panelTitleClass}>Surplus</h2>
										<p className={cn(panelHintClass, 'm-0 shrink-0')}>
											{stressMode
												? `Stress scenario (+${(summary.rateBufferBps / 100).toFixed(1)}% rate approx.)`
												: 'Base case'}
										</p>
									</div>
									<div className="p-4">
										<div className="flex flex-col">
											<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-paper-border py-3.5">
												<span className="text-[13px] text-paper-fg">Income</span>
												<span className="font-mono text-[15px] font-medium tabular-nums text-paper-fg">
													{formatMoney(summary.incomeMonthlyDollars)}
												</span>
											</div>
											<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-paper-border py-3.5">
												<span className="text-[13px] text-paper-fg">− Repayments</span>
												<span className="font-mono text-[15px] font-medium tabular-nums text-paper-fg">
													{formatNegativeMoney(repaymentsMonthly)}
												</span>
											</div>
											<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-paper-border py-3.5">
												<span className="text-[13px] text-paper-fg">− Living costs</span>
												<span className="font-mono text-[15px] font-medium tabular-nums text-paper-fg">
													{formatNegativeMoney(summary.livingExpensesMonthlyDollars)}
												</span>
											</div>
											<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-paper-border pt-3.5">
												<span className="text-[13px] font-medium text-paper-fg">
													Net surplus / month
												</span>
												<span
													className={cn(
														'font-mono text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums',
														surplusToneClass(surplusMonthly)
													)}
												>
													{formatMoney(surplusMonthly)}
												</span>
											</div>
											{stressMode ? (
												<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-paper-border py-3.5">
													<div className="min-w-0">
														<span className="block text-[13px] text-paper-fg">
															Stress surplus (+{(summary.rateBufferBps / 100).toFixed(1)}% rate)
														</span>
														<span className="mt-0.5 block text-[12px] text-paper-muted">
															Loan repayment stressed
														</span>
													</div>
													<span
														className={cn(
															'shrink-0 font-mono text-[15px] font-medium tabular-nums',
															surplusToneClass(summary.stressedSurplusMonthlyDollars)
														)}
													>
														{formatMoney(summary.stressedSurplusMonthlyDollars)}
													</span>
												</div>
											) : null}
										</div>
										<SurplusBar surplus={surplusMonthly} income={summary.incomeMonthlyDollars} />
										<p className={cn(panelHintClass, 'mt-2.5')}>
											Surplus as share of income · higher is healthier capacity
										</p>
									</div>
								</section>
							</div>
						</>
					) : null}

					{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}
				</div>
			</div>
		</PageShell>
	);
}
