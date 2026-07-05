import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
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
	'Supporting summary only. Not financial advice. Verify figures against your own records and official documents.';

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
					className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
				>
					<ArrowLeft size="0.875rem" aria-hidden />
					Back to snapshot
				</Link>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded bg-secondary-default px-4 py-2 text-sm font-medium text-black"
					onClick={() => window.print()}
				>
					<Printer size="1rem" aria-hidden />
					Print / Save PDF
				</button>
			</div>

			{detail !== null ? (
				<PageHeader
					title={`Report: ${detail.name}`}
					subtitle="Print-ready broker summary from frozen snapshot"
				/>
			) : (
				<PageHeader title="Broker report" />
			)}

			{loading ? <PageLoadingState label="Loading report…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{detail !== null && !loading ? (
				<div className="space-y-6">
					<div className="broker-report-no-print grid gap-4 lg:grid-cols-2">
						<SharePanel snapshotId={detail.id} />
						<AnnotationPanel snapshotId={detail.id} onChanged={() => void load()} />
					</div>
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
