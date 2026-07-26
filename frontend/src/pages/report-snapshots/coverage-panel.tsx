import { buildDomainCoverageFromPayload } from './coverage-items';
import type { ReportSnapshotPayload } from '@/types/report-snapshots';
import { ReportCoverageGrid } from './shared';

type ReportCoveragePanelProps = {
	payload: Pick<
		ReportSnapshotPayload,
		'coverage' | 'income' | 'lenderExpenses' | 'assets' | 'liabilities'
	>;
};

export function ReportCoveragePanel({ payload }: ReportCoveragePanelProps) {
	if (payload.coverage === null) {
		return null;
	}

	const items = buildDomainCoverageFromPayload({
		coverage: payload.coverage,
		income: payload.income,
		lenderExpenses: payload.lenderExpenses,
		assets: payload.assets,
		liabilities: payload.liabilities,
	});

	return <ReportCoverageGrid items={items} />;
};
