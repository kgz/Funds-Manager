import axios from 'axios';

export type ReportCoverageGap = {
	startDate: string;
	endDate: string;
};

export type ReportCoverageAccountLine = {
	accountId: number | null;
	accountLabel: string;
	monthsExpected: number;
	monthsCovered: number;
	missingMonths: string[];
	gapRanges: ReportCoverageGap[];
	multiMonthCadence: boolean;
	sufficient: boolean;
};

export type ReportCoverageSummaryResponse = {
	startDate: string;
	endDate: string;
	monthsInRange: number;
	totalMonthSlots: number;
	coveredMonthSlots: number;
	sufficient: boolean;
	summaryStatement: string;
	accounts: ReportCoverageAccountLine[];
};

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	return null;
}

function readBoolean(value: unknown): boolean | null {
	if (typeof value === 'boolean') {
		return value;
	}
	return null;
}

function readOptionalField(raw: object, camelKey: string, snakeKey: string): unknown {
	if (Reflect.has(raw, camelKey)) {
		return Reflect.get(raw, camelKey);
	}
	return Reflect.get(raw, snakeKey);
}

function normalizeAccountLine(raw: unknown): ReportCoverageAccountLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const accountIdRaw = readOptionalField(raw, 'accountId', 'account_id');
	const accountId =
		accountIdRaw === null || accountIdRaw === undefined
			? null
			: readFiniteNumber(accountIdRaw);
	const accountLabel = readString(
		readOptionalField(raw, 'accountLabel', 'account_label')
	);
	const monthsExpected = readFiniteNumber(
		readOptionalField(raw, 'monthsExpected', 'months_expected')
	);
	const monthsCovered = readFiniteNumber(
		readOptionalField(raw, 'monthsCovered', 'months_covered')
	);
	const sufficient = readBoolean(readOptionalField(raw, 'sufficient', 'sufficient'));
	const missingMonthsRaw = readOptionalField(raw, 'missingMonths', 'missing_months');
	const gapRangesRaw = readOptionalField(raw, 'gapRanges', 'gap_ranges');
	const multiMonthCadenceRaw = readOptionalField(
		raw,
		'multiMonthCadence',
		'multi_month_cadence'
	);
	const multiMonthCadence =
		multiMonthCadenceRaw === null || multiMonthCadenceRaw === undefined
			? false
			: readBoolean(multiMonthCadenceRaw);
	if (
		accountLabel === null ||
		monthsExpected === null ||
		monthsCovered === null ||
		sufficient === null ||
		!Array.isArray(missingMonthsRaw) ||
		multiMonthCadence === null
	) {
		return null;
	}
	const missingMonths: string[] = [];
	for (const entry of missingMonthsRaw) {
		if (typeof entry === 'string') {
			missingMonths.push(entry);
		}
	}
	const gapRanges: ReportCoverageGap[] = [];
	if (Array.isArray(gapRangesRaw)) {
		for (const entry of gapRangesRaw) {
			if (!entry || typeof entry !== 'object') {
				continue;
			}
			const startDate = readString(
				readOptionalField(entry, 'startDate', 'start_date')
			);
			const endDate = readString(readOptionalField(entry, 'endDate', 'end_date'));
			if (startDate !== null && endDate !== null) {
				gapRanges.push({ startDate, endDate });
			}
		}
	}
	return {
		accountId: accountId === null ? null : Math.trunc(accountId),
		accountLabel,
		monthsExpected: Math.trunc(monthsExpected),
		monthsCovered: Math.trunc(monthsCovered),
		missingMonths,
		gapRanges,
		multiMonthCadence,
		sufficient,
	};
}

export function normalizeReportCoverageSummary(
	raw: unknown
): ReportCoverageSummaryResponse | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const startDate = readString(readOptionalField(raw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(raw, 'endDate', 'end_date'));
	const monthsInRange = readFiniteNumber(
		readOptionalField(raw, 'monthsInRange', 'months_in_range')
	);
	const totalMonthSlots = readFiniteNumber(
		readOptionalField(raw, 'totalMonthSlots', 'total_month_slots')
	);
	const coveredMonthSlots = readFiniteNumber(
		readOptionalField(raw, 'coveredMonthSlots', 'covered_month_slots')
	);
	const sufficient = readBoolean(readOptionalField(raw, 'sufficient', 'sufficient'));
	const summaryStatement = readString(
		readOptionalField(raw, 'summaryStatement', 'summary_statement')
	);
	const accountsRaw = readOptionalField(raw, 'accounts', 'accounts');
	if (
		startDate === null ||
		endDate === null ||
		monthsInRange === null ||
		totalMonthSlots === null ||
		coveredMonthSlots === null ||
		sufficient === null ||
		summaryStatement === null ||
		!Array.isArray(accountsRaw)
	) {
		return null;
	}
	const accounts: ReportCoverageAccountLine[] = [];
	for (const entry of accountsRaw) {
		const line = normalizeAccountLine(entry);
		if (line) {
			accounts.push(line);
		}
	}
	return {
		startDate,
		endDate,
		monthsInRange: Math.trunc(monthsInRange),
		totalMonthSlots: Math.trunc(totalMonthSlots),
		coveredMonthSlots: Math.trunc(coveredMonthSlots),
		sufficient,
		summaryStatement,
		accounts,
	};
}

export type ReportCoverageSummaryQuery = {
	startDate: string;
	endDate: string;
	accountId?: number | null;
};

export async function fetchReportCoverageSummary(
	params: ReportCoverageSummaryQuery
): Promise<ReportCoverageSummaryResponse> {
	const search = new URLSearchParams();
	search.set('start_date', params.startDate);
	search.set('end_date', params.endDate);
	if (params.accountId != null) {
		search.set('account_id', String(params.accountId));
	}
	const response = await axios.get(`/api/report-coverage/summary?${search.toString()}`);
	const summary = normalizeReportCoverageSummary(response.data);
	if (!summary) {
		throw new Error('Invalid report coverage summary response');
	}
	return summary;
}
