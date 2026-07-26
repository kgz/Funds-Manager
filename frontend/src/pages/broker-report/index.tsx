import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { glassCardClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { rsBtnPrimaryClass } from '@/pages/report-snapshots/shared';
import { AnnotationPanel } from '@/pages/broker-report/annotation-panel';
import { BrokerReportContent } from '@/pages/broker-report/report-content';
import { SharePanel } from '@/pages/broker-report/share-panel';
import './print.css';
import {
	fetchBrokerReportAnnotations,
	type BrokerReportAnnotation,
} from '@/types/broker-report';
import { fetchReportSnapshot, type ReportSnapshotDetail } from '@/types/report-snapshots';

const DISCLAIMER =
	'Personal reference only — not financial advice. Verify figures against your own records before any meeting.';

export function BrokerReportPage() {
	const params = useParams();
	const snapshotId = params.id !== undefined ? Number.parseInt(params.id, 10) : Number.NaN;
	const [detail, setDetail] = useState<ReportSnapshotDetail | null>(null);
	const [annotations, setAnnotations] = useState<BrokerReportAnnotation[]>([]);
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
			const [snapshot, annotationItems] = await Promise.all([
				fetchReportSnapshot(snapshotId),
				fetchBrokerReportAnnotations(snapshotId),
			]);
			setDetail(snapshot);
			setAnnotations(annotationItems);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load report');
			setDetail(null);
			setAnnotations([]);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	useEffect(() => {
		void load();
	}, [load]);

	const dataSources = useMemo(
		() => (detail ? detail.payload.accounts.map((account) => account.displayName) : []),
		[detail]
	);

	return (
		<PageShell>
			<div className="broker-report-no-print mb-4 flex flex-wrap items-center justify-between gap-3">
				<Link
					to={Number.isFinite(snapshotId) ? `/report-snapshots/${snapshotId}` : '/report-snapshots'}
					className="inline-flex items-center gap-1 text-sm text-paper-muted transition-colors hover:text-paper-fg"
				>
					<ArrowLeft size="0.875rem" aria-hidden />
					Back to snapshot
				</Link>
				<button
					type="button"
					className={rsBtnPrimaryClass}
					onClick={() => window.print()}
				>
					<Printer size="1rem" aria-hidden />
					Print / Save PDF
				</button>
			</div>

			{detail !== null ? (
				<PageHeader
					title={detail.name}
					subtitle="Print or save as PDF — your cheat sheet before a broker meeting"
				/>
			) : (
				<PageHeader title="Finance summary" />
			)}

			{loading ? <PageLoadingState label="Loading report…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{detail !== null && !loading ? (
				<div className="space-y-6">
					<details className={cn(glassCardClass, 'broker-report-no-print overflow-hidden')}>
						<summary className="cursor-pointer px-4 py-3 text-sm font-medium text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]">
							Share link &amp; notes (optional)
						</summary>
						<div className="grid gap-4 border-t border-paper-border p-4 lg:grid-cols-2">
							<SharePanel snapshotId={detail.id} />
							<AnnotationPanel snapshotId={detail.id} onChanged={() => void load()} />
						</div>
					</details>
					<div className="broker-report-print-root py-4">
						<BrokerReportContent
							title={detail.name}
							asAt={detail.asAt}
							startDate={detail.startDate}
							endDate={detail.endDate}
							capturedAt={detail.createdAt}
							snapshotId={detail.id}
							payload={detail.payload}
							annotations={annotations}
							disclaimer={DISCLAIMER}
							dataSources={dataSources}
						/>
					</div>
				</div>
			) : null}
		</PageShell>
	);
}
