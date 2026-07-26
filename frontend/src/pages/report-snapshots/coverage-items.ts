import type { ReportCoverageSummaryResponse } from '@/types/report-coverage';
import type { IncomeSummaryResponse } from '@/types/income';
import type { LenderExpenseSummaryResponse } from '@/types/lender-expenses';

export type CoverageCategory = 'income' | 'living' | 'liabilities' | 'assets';

export type CoverageItem = {
	key: CoverageCategory;
	label: string;
	state: 'ok' | 'warn';
	detail: string;
};

const COVERAGE_LABELS: Record<CoverageCategory, string> = {
	income: 'Income',
	living: 'Living expenses',
	liabilities: 'Liabilities',
	assets: 'Assets',
};

export type DomainCoverageInput = {
	statements: ReportCoverageSummaryResponse;
	income: IncomeSummaryResponse;
	living: LenderExpenseSummaryResponse;
	assets: {
		itemCount: number;
		totalValueCents: number;
	};
	liabilities: {
		itemCount: number;
		withRepaymentCount: number;
	};
};

function plural(count: number, singular: string, pluralForm: string): string {
	return count === 1 ? singular : pluralForm;
}

function statementGapDetail(statements: ReportCoverageSummaryResponse): string {
	if (statements.accounts.length === 1) {
		const account = statements.accounts[0];
		if (account.missingMonths.length > 0) {
			return `${account.monthsCovered} of ${account.monthsExpected} statement months for ${account.accountLabel}`;
		}
		return statements.summaryStatement;
	}
	const gapAccounts = statements.accounts.filter((account) => !account.sufficient);
	if (gapAccounts.length === 1) {
		const account = gapAccounts[0];
		return `Statement gaps on ${account.accountLabel}`;
	}
	return `Statement gaps on ${gapAccounts.length} accounts`;
}

function buildIncomeCoverage(
	statements: ReportCoverageSummaryResponse,
	income: IncomeSummaryResponse
): CoverageItem {
	const streams = income.streams.filter((stream) => stream.mergedIntoKey === null);
	const confirmed = streams.filter((stream) => stream.isConfirmed);

	if (streams.length === 0) {
		return {
			key: 'income',
			label: COVERAGE_LABELS.income,
			state: 'warn',
			detail: 'No income streams detected for period',
		};
	}

	if (!statements.sufficient) {
		return {
			key: 'income',
			label: COVERAGE_LABELS.income,
			state: 'warn',
			detail: statementGapDetail(statements),
		};
	}

	if (confirmed.length === 0) {
		return {
			key: 'income',
			label: COVERAGE_LABELS.income,
			state: 'warn',
			detail: `${streams.length} ${plural(streams.length, 'stream', 'streams')} · none confirmed`,
		};
	}

	const monthsObserved = streams.reduce(
		(max, stream) => Math.max(max, stream.monthsObserved),
		0
	);
	const monthLabel = monthsObserved >= 12 ? '12+ months history' : `${monthsObserved}+ months history`;

	return {
		key: 'income',
		label: COVERAGE_LABELS.income,
		state: 'ok',
		detail: `${confirmed.length} ${plural(confirmed.length, 'stream', 'streams')} · ${monthLabel}`,
	};
}

function buildLivingCoverage(
	statements: ReportCoverageSummaryResponse,
	living: LenderExpenseSummaryResponse
): CoverageItem {
	if (living.totalMonthlyDollars <= 0 && living.allDebitsMonthlyDollars <= 0) {
		return {
			key: 'living',
			label: COVERAGE_LABELS.living,
			state: 'warn',
			detail: 'No living expense data for period',
		};
	}

	if (!statements.sufficient) {
		return {
			key: 'living',
			label: COVERAGE_LABELS.living,
			state: 'warn',
			detail: statementGapDetail(statements),
		};
	}

	if (living.unmapped.transactionCount > 0) {
		const unmappedShare =
			living.allDebitsMonthlyDollars > 0
				? living.unmapped.monthlyAverageDollars / living.allDebitsMonthlyDollars
				: 1;
		if (unmappedShare >= 0.15) {
			return {
				key: 'living',
				label: COVERAGE_LABELS.living,
				state: 'warn',
				detail: `${living.unmapped.transactionCount} uncategorised transactions in period`,
			};
		}
	}

	const monthLabel =
		living.monthsInRange >= 6
			? '6+ months of categorised spend'
			: 'HEM buckets mapped for period';

	return {
		key: 'living',
		label: COVERAGE_LABELS.living,
		state: 'ok',
		detail: monthLabel,
	};
}

function buildLiabilitiesCoverage(liabilities: DomainCoverageInput['liabilities']): CoverageItem {
	if (liabilities.itemCount === 0) {
		return {
			key: 'liabilities',
			label: COVERAGE_LABELS.liabilities,
			state: 'warn',
			detail: 'No loan facilities on file',
		};
	}

	if (liabilities.withRepaymentCount < liabilities.itemCount) {
		const missing = liabilities.itemCount - liabilities.withRepaymentCount;
		return {
			key: 'liabilities',
			label: COVERAGE_LABELS.liabilities,
			state: 'warn',
			detail: `${missing} ${plural(missing, 'facility', 'facilities')} missing repayments`,
		};
	}

	return {
		key: 'liabilities',
		label: COVERAGE_LABELS.liabilities,
		state: 'ok',
		detail: 'Facilities reconciled',
	};
}

function buildAssetsCoverage(assets: DomainCoverageInput['assets']): CoverageItem {
	if (assets.itemCount === 0) {
		return {
			key: 'assets',
			label: COVERAGE_LABELS.assets,
			state: 'warn',
			detail: 'No assets recorded',
		};
	}

	return {
		key: 'assets',
		label: COVERAGE_LABELS.assets,
		state: 'ok',
		detail:
			assets.itemCount === 1
				? '1 asset on file'
				: `${assets.itemCount} assets on file`,
	};
}

export function buildDomainCoverageItems(input: DomainCoverageInput): CoverageItem[] {
	return [
		buildIncomeCoverage(input.statements, input.income),
		buildLivingCoverage(input.statements, input.living),
		buildLiabilitiesCoverage(input.liabilities),
		buildAssetsCoverage(input.assets),
	];
}

export function buildDomainCoverageFromPayload(payload: {
	coverage: ReportCoverageSummaryResponse;
	income: IncomeSummaryResponse;
	lenderExpenses: LenderExpenseSummaryResponse;
	assets: { items: unknown[]; totalValueCents: number };
	liabilities: { items: unknown[]; totalBalanceCents: number };
}): CoverageItem[] {
	const liabilityItems = payload.liabilities.items;
	let withRepaymentCount = 0;
	for (const entry of liabilityItems) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const repayment = Reflect.get(entry, 'repayment_cents') ?? Reflect.get(entry, 'repaymentCents');
		if (typeof repayment === 'number' && repayment > 0) {
			withRepaymentCount += 1;
		}
	}

	return buildDomainCoverageItems({
		statements: payload.coverage,
		income: payload.income,
		living: payload.lenderExpenses,
		assets: {
			itemCount: payload.assets.items.length,
			totalValueCents: payload.assets.totalValueCents,
		},
		liabilities: {
			itemCount: payload.liabilities.items.length,
			withRepaymentCount,
		},
	});
}
