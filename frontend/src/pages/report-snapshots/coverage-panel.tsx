import { Link } from 'react-router';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { glassCardClass } from '@/components/layout/tokens';
import type { ReportCoverageSummaryResponse } from '@/types/report-coverage';

type ReportCoveragePanelProps = {
	coverage: ReportCoverageSummaryResponse | null;
	loading?: boolean;
};

export function ReportCoveragePanel({ coverage, loading = false }: ReportCoveragePanelProps) {
	if (loading) {
		return (
			<div className={`${glassCardClass} p-4 text-sm text-paper-muted`}>
				Checking statement coverage…
			</div>
		);
	}

	if (coverage === null) {
		return null;
	}

	return (
		<div className={`${glassCardClass} space-y-3 p-4`}>
			<h2 className="text-sm font-semibold text-paper-fg">Statement coverage</h2>
			{coverage.sufficient ? (
				<InlineAlert variant="info">{coverage.summaryStatement}</InlineAlert>
			) : (
				<InlineAlert variant="warning">
					{coverage.summaryStatement}. Upload missing statements before handing this to a
					broker.{' '}
					<Link to="/statements" className="underline">
						Go to statements
					</Link>
				</InlineAlert>
			)}
			{coverage.accounts.some(
				(account) => account.missingMonths.length > 0 || account.gapRanges.length > 0
			) ? (
				<ul className="space-y-2 text-sm text-paper-muted">
					{coverage.accounts.map((account) => {
						if (
							account.missingMonths.length === 0 &&
							account.gapRanges.length === 0
						) {
							return null;
						}
						const gapText =
							account.gapRanges.length > 0
								? account.gapRanges
										.map((gap) => `${gap.startDate} to ${gap.endDate}`)
										.join('; ')
								: account.missingMonths.join(', ');
						return (
							<li key={`${account.accountLabel}-${account.accountId ?? 'legacy'}`}>
								<span className="font-medium text-paper-fg">{account.accountLabel}</span>
								{account.multiMonthCadence ? (
									<span className="text-paper-muted"> (half-yearly statements)</span>
								) : null}
								{' — '}
								{gapText}
								{account.gapRanges.length > 0 ? ' uncovered' : ' missing'}
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}
