import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { BrokerReportContent } from '@/pages/broker-report/report-content';
import './print.css';
import { fetchPublicBrokerReport, type PublicBrokerReport } from '@/types/broker-report';

export function PublicBrokerReportPage() {
	const params = useParams();
	const token = params.token ?? '';
	const [report, setReport] = useState<PublicBrokerReport | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (token.length === 0) {
			setError('Invalid report link');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await fetchPublicBrokerReport(token);
			setReport(data);
		} catch {
			setError('This report link is invalid or has been revoked.');
			setReport(null);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	const dataSources = useMemo(
		() =>
			report ? report.payload.accounts.map((account) => account.displayName) : [],
		[report]
	);

	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="broker-report-print-root mx-auto max-w-5xl px-4">
				{loading ? <PageLoadingState label="Loading report…" /> : null}
				{error !== null ? (
					<div className="rounded-lg border border-red-200 bg-white p-6">
						<InlineAlert variant="error">{error}</InlineAlert>
					</div>
				) : null}
				{report !== null && !loading ? (
					<BrokerReportContent
						title={report.snapshot.name}
						asAt={report.snapshot.asAt}
						startDate={report.snapshot.startDate}
						endDate={report.snapshot.endDate}
						capturedAt={report.snapshot.createdAt}
						snapshotId={report.snapshot.id}
						payload={report.payload}
						annotations={report.annotations}
						disclaimer={report.disclaimer}
						dataSources={dataSources}
					/>
				) : null}
			</div>
		</div>
	);
}
