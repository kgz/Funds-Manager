import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Trash2 } from 'lucide-react';
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
import { glassCardClass } from '@/components/layout/tokens';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	createReportSnapshot,
	deleteReportSnapshot,
	fetchReportSnapshots,
	type ReportSnapshotListItem,
} from '@/types/report-snapshots';

function formatCreatedAt(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	return parsed.toLocaleString('en-AU', {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

export function ReportSnapshotsPage() {
	const { accountIdNumber } = useAccountFilter();
	const [period, setPeriod] = useState<DashboardPeriod>(() => readStoredPeriod());
	const [name, setName] = useState('');
	const [items, setItems] = useState<ReportSnapshotListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	const dateRange = useMemo(() => periodDateRange(period), [period]);

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
		localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
	}, [period]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSave = async (event: React.FormEvent) => {
		event.preventDefault();
		const start = dateRange.start;
		const end = dateRange.end;
		const trimmed = name.trim();
		if (!trimmed || start === undefined || end === undefined) {
			return;
		}
		setSaving(true);
		setSaveError(null);
		try {
			await createReportSnapshot({
				name: trimmed,
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
		name.trim().length > 0 &&
		dateRange.start !== undefined &&
		dateRange.end !== undefined &&
		!saving;

	return (
		<PageShell>
			<PageHeader
				title="Report snapshots"
				subtitle="Freeze broker figures at a point in time. Saved snapshots stay unchanged even when live data moves."
			/>

			<form
				onSubmit={(event) => {
					void handleSave(event);
				}}
				className={`${glassCardClass} mb-6 space-y-4 p-4`}
			>
				<h2 className="text-sm font-semibold text-white">Save new snapshot</h2>
				<div className="flex flex-wrap items-end gap-4">
					<PeriodFilter
						value={period}
						onChange={setPeriod}
						periods={BREAKDOWN_PRESET_PERIODS}
						pending={saving}
						ariaLabel="Snapshot analysis period"
					/>
					<AccountFilter />
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-white/70">
						<span>Name</span>
						<input
							type="text"
							value={name}
							onChange={(event) => {
								setName(event.target.value);
							}}
							maxLength={200}
							placeholder="e.g. Broker meeting Jul 2026"
							className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30"
						/>
					</label>
					<button
						type="submit"
						disabled={!canSave}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-default px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
					>
						<Camera size="1rem" aria-hidden />
						{saving ? 'Saving…' : 'Save snapshot'}
					</button>
				</div>
				{saveError !== null ? <InlineAlert variant="error">{saveError}</InlineAlert> : null}
			</form>

			{loading ? <PageLoadingState label="Loading snapshots…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{!loading && items.length === 0 && error === null ? (
				<EmptyState
					icon={Camera}
					title="No snapshots yet"
					description="Save a snapshot to capture income, expenses, serviceability, and net worth for a broker report."
				/>
			) : null}

			{!loading && items.length > 0 ? (
				<div className={glassCardClass}>
					<h2 className="mb-3 text-sm font-semibold text-white">Saved snapshots</h2>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[40rem] text-sm">
							<thead>
								<tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
									<th className="px-3 py-2 font-medium">Name</th>
									<th className="px-3 py-2 font-medium">As at</th>
									<th className="px-3 py-2 font-medium">Period</th>
									<th className="px-3 py-2 font-medium">Saved</th>
									<th className="px-3 py-2 font-medium text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={item.id} className="border-t border-white/5 text-white/85">
										<td className="px-3 py-2">
											<Link
												to={`/report-snapshots/${item.id}`}
												className="text-secondary-default hover:underline"
											>
												{item.name}
											</Link>
										</td>
										<td className="px-3 py-2 font-mono tabular-nums">{item.asAt}</td>
										<td className="px-3 py-2 font-mono tabular-nums text-white/65">
											{item.startDate} → {item.endDate}
										</td>
										<td className="px-3 py-2 text-white/65">
											{formatCreatedAt(item.createdAt)}
										</td>
										<td className="px-3 py-2 text-right">
											<button
												type="button"
												onClick={() => {
													void handleDelete(item.id, item.name);
												}}
												className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-400 hover:bg-white/5"
												aria-label={`Delete ${item.name}`}
											>
												<Trash2 size="0.875rem" aria-hidden />
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : null}
		</PageShell>
	);
}
