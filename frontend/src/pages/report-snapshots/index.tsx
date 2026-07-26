import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { AccountFilter } from '@/components/account-filter';
import {
	BREAKDOWN_PRESET_PERIODS,
	PERIOD_LABELS,
	REPORT_SNAPSHOT_PERIOD_STORAGE_KEY,
	type DashboardPeriod,
	periodDateRange,
	readStoredSnapshotPeriod,
} from '@/components/dashboard/period';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	glassCardClass,
	inputDarkClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import { fetchAssets } from '@/types/assets';
import { fetchIncomeSummary } from '@/types/income';
import { fetchLenderExpenseSummary } from '@/types/lender-expenses';
import { fetchLiabilities } from '@/types/liabilities';
import { fetchReportCoverageSummary } from '@/types/report-coverage';
import {
	createReportSnapshot,
	deleteReportSnapshot,
	fetchReportSnapshots,
	type ReportSnapshotListItem,
} from '@/types/report-snapshots';
import {
	buildDomainCoverageItems,
	type CoverageItem,
} from './coverage-items';
import {
	formatSnapshotPeriodLabel,
	formatSnapshotDate,
	ReportCoverageGrid,
	rsBtnIconClass,
	rsBtnPrimaryClass,
	rsFieldLabelClass,
	rsSaveFieldClass,
	rsSegmentButtonActiveClass,
	rsSegmentButtonClass,
	rsSegmentedClass,
	rsSnapLinkClass,
	tableTdClass,
	tableThClass,
} from './shared';

export function ReportSnapshotsPage() {
	const { accountIdNumber, selectedLabel } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredSnapshotPeriod());
	const [name, setName] = useState('');
	const [items, setItems] = useState<ReportSnapshotListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [coverageLoading, setCoverageLoading] = useState(false);
	const [coverage, setCoverage] = useState<Awaited<
		ReturnType<typeof fetchReportCoverageSummary>
	> | null>(null);
	const [coverageItems, setCoverageItems] = useState<CoverageItem[] | null>(null);

	const dateRange = useMemo(() => periodDateRange(period), [period]);

	const loadCoverage = useCallback(async () => {
		const start = dateRange.start;
		const end = dateRange.end;
		if (start === undefined || end === undefined) {
			setCoverage(null);
			setCoverageItems(null);
			return;
		}
		setCoverageLoading(true);
		try {
			const [statements, income, living, assets, liabilities] = await Promise.all([
				fetchReportCoverageSummary({
					startDate: start,
					endDate: end,
					accountId: accountIdNumber,
				}),
				fetchIncomeSummary(accountIdNumber),
				fetchLenderExpenseSummary({
					startDate: start,
					endDate: end,
					accountId: accountIdNumber,
				}),
				fetchAssets(),
				fetchLiabilities(),
			]);
			setCoverage(statements);
			setCoverageItems(
				buildDomainCoverageItems({
					statements,
					income,
					living,
					assets: {
						itemCount: assets.items.length,
						totalValueCents: assets.total_value_cents,
					},
					liabilities: {
						itemCount: liabilities.items.length,
						withRepaymentCount: liabilities.items.filter(
							(item) => item.repayment_cents !== null && item.repayment_cents > 0
						).length,
					},
				})
			);
		} catch {
			setCoverage(null);
			setCoverageItems(null);
		} finally {
			setCoverageLoading(false);
		}
	}, [accountIdNumber, dateRange.end, dateRange.start]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchReportSnapshots();
			setItems(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load snapshots');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(REPORT_SNAPSHOT_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		void loadCoverage();
	}, [loadCoverage]);

	const sortedItems = useMemo(
		() =>
			[...items].sort(
				(left, right) =>
					new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
			),
		[items]
	);

	const handleSave = async () => {
		const start = dateRange.start;
		const end = dateRange.end;
		if (start === undefined || end === undefined) {
			return;
		}
		const trimmed = name.trim();
		const snapshotName =
			trimmed.length > 0 ? trimmed : `Snapshot ${formatSnapshotDate(new Date().toISOString())}`;
		if (
			coverage !== null &&
			!coverage.sufficient &&
			!window.confirm(`${coverage.summaryStatement}. Save this snapshot anyway?`)
		) {
			return;
		}
		setSaving(true);
		setSaveError(null);
		try {
			await createReportSnapshot({
				name: snapshotName,
				startDate: start,
				endDate: end,
				accountId: accountIdNumber,
			});
			setName('');
			await load();
		} catch (err: unknown) {
			setSaveError(err instanceof Error ? err.message : 'Failed to save snapshot');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: number, snapshotName: string) => {
		if (!window.confirm(`Delete snapshot "${snapshotName}"?`)) {
			return;
		}
		setError(null);
		try {
			await deleteReportSnapshot(id);
			await load();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
		}
	};

	const canSave =
		dateRange.start !== undefined && dateRange.end !== undefined && !saving;

	const coverageHint = `${selectedLabel} · ${PERIOD_LABELS[period].toLowerCase()}`;
	const listHint =
		sortedItems.length === 0
			? 'No saved snapshots'
			: `${sortedItems.length} frozen report${sortedItems.length === 1 ? '' : 's'}`;

	if (loading && items.length === 0 && error === null) {
		return <PageLoadingState label="Loading snapshots…" />;
	}

	if (error !== null && items.length === 0) {
		return (
			<ErrorState
				title="Error loading snapshots"
				message={error}
				onRetry={() => void load()}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<header className="sticky top-0 z-30 shrink-0 border-b border-paper-border bg-paper-surface px-8 pb-5 pt-7">
				<h1 className={pageTitleClass}>Report snapshots</h1>
				<p className={pageSubtitleClass}>
					Freeze your figures at a point in time. Saved snapshots stay unchanged when live
					data moves.
				</p>
			</header>

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				<div className="flex flex-col gap-6">
					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Save new snapshot</h2>
							<p className={cn(panelHintClass, 'mt-1')}>
								Capture serviceability figures from the selected period and accounts
							</p>
						</div>
						<form
							className="flex flex-col gap-4 p-4"
							onSubmit={(event) => {
								event.preventDefault();
								void handleSave();
							}}
						>
							<div className="flex flex-wrap items-end gap-[10px]">
								<div className={rsSaveFieldClass}>
									<span className={rsFieldLabelClass}>Period</span>
									<div
										className={rsSegmentedClass}
										role="group"
										aria-label="Snapshot period"
									>
										{BREAKDOWN_PRESET_PERIODS.map((preset) => (
											<button
												key={preset}
												type="button"
												className={cn(
													rsSegmentButtonClass,
													period === preset && rsSegmentButtonActiveClass
												)}
												aria-pressed={period === preset}
												onClick={() => setPeriod(preset)}
											>
												{PERIOD_LABELS[preset]}
											</button>
										))}
									</div>
								</div>
								<div className={rsSaveFieldClass}>
									<label className={rsFieldLabelClass} htmlFor="snapshot-account">
										Account
									</label>
									<AccountFilter id="snapshot-account" className="h-8 min-w-[10rem] px-2.5" />
								</div>
								<div className={rsSaveFieldClass}>
									<label className={rsFieldLabelClass} htmlFor="snapshot-name">
										Name
									</label>
									<input
										id="snapshot-name"
										type="text"
										value={name}
										onChange={(event) => setName(event.target.value)}
										maxLength={200}
										placeholder="e.g. June refinance pack"
										className={cn(inputDarkClass, 'h-8 w-[min(280px,100%)] px-2.5')}
									/>
								</div>
								<div className="ml-auto flex shrink-0 items-center gap-2 max-[760px]:ml-0 max-[760px]:w-full max-[760px]:[&_button]:flex-1">
									<button
										type="button"
										disabled={!canSave}
										className={rsBtnPrimaryClass}
										onClick={() => {
											void handleSave();
										}}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" />
										) : (
											'Save snapshot'
										)}
									</button>
								</div>
							</div>

							{saveError !== null ? <InlineAlert variant="error">{saveError}</InlineAlert> : null}

							<ReportCoverageGrid
								items={coverageItems}
								loading={coverageLoading}
								hint={coverageHint}
							/>
						</form>
					</section>

					{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Saved snapshots</h2>
							<p className={cn(panelHintClass, 'mt-1')}>{listHint}</p>
						</div>

						{sortedItems.length === 0 ? (
							<div className="px-6 py-12 text-center">
								<div className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted">
									<Archive className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden />
								</div>
								<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
									No snapshots yet
								</h3>
								<p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] leading-[1.45] text-paper-muted">
									Save your first snapshot above to freeze income, living costs, and
									serviceability at a point in time.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-[13px]">
									<thead>
										<tr>
											<th className={cn(tableThClass, 'min-w-[200px]')}>Name</th>
											<th className={cn(tableThClass, 'w-[120px] whitespace-nowrap')}>
												As at
											</th>
											<th className={cn(tableThClass, 'w-[100px]')}>Period</th>
											<th className={cn(tableThClass, 'w-[140px] whitespace-nowrap')}>
												Saved
											</th>
											<th className={cn(tableThClass, 'w-[72px] text-right')}>
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{sortedItems.map((item) => (
											<tr
												key={item.id}
												className="transition-colors hover:[&>td]:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
											>
												<td className={tableTdClass}>
													<Link
														to={`/report-snapshots/${item.id}`}
														className={rsSnapLinkClass}
													>
														{item.name}
													</Link>
												</td>
												<td className={cn(tableTdClass, 'whitespace-nowrap font-mono tabular-nums')}>
													{formatSnapshotDate(item.asAt)}
												</td>
												<td className={cn(tableTdClass, 'text-paper-muted')}>
													{formatSnapshotPeriodLabel(item.startDate, item.endDate)}
												</td>
												<td className={cn(tableTdClass, 'whitespace-nowrap font-mono tabular-nums text-paper-muted')}>
													{formatSnapshotDate(item.createdAt, 'datetime')}
												</td>
												<td className={cn(tableTdClass, 'text-right')}>
													<button
														type="button"
														className={rsBtnIconClass}
														aria-label={`Delete ${item.name}`}
														onClick={() => {
															void handleDelete(item.id, item.name);
														}}
													>
														<Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</div>
		</PageShell>
	);
}
