import axios from 'axios';

export type ServiceabilityIncomeLine = {
	streamKey: string;
	label: string;
	monthlyDollars: number;
	isConfirmed: boolean;
};

export type ServiceabilityLiabilityLine = {
	id: number;
	name: string;
	kind: string;
	rateType: string | null;
	interestRateBps: number | null;
	included: boolean;
	baselineRepaymentMonthlyDollars: number;
	stressedRepaymentMonthlyDollars: number;
};

export type ServiceabilityBucketLine = {
	bucketKey: string;
	label: string;
	monthlyAverageDollars: number;
};

export type ServiceabilityLivingSplit = {
	committedLivingMonthlyDollars: number;
	discretionaryLivingMonthlyDollars: number;
	committedBuckets: ServiceabilityBucketLine[];
	discretionaryBuckets: ServiceabilityBucketLine[];
};

export type ServiceabilitySummaryResponse = {
	startDate: string;
	endDate: string;
	rateBufferBps: number;
	incomeUsesUnconfirmed: boolean;
	incomeMonthlyDollars: number;
	incomeLines: ServiceabilityIncomeLine[];
	repaymentsMonthlyDollars: number;
	stressedRepaymentsMonthlyDollars: number;
	livingExpensesMonthlyDollars: number;
	surplusMonthlyDollars: number;
	stressedSurplusMonthlyDollars: number;
	committedTotalMonthlyDollars: number;
	discretionaryTotalMonthlyDollars: number;
	liabilities: ServiceabilityLiabilityLine[];
	livingSplit: ServiceabilityLivingSplit;
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

function normalizeIncomeLine(raw: unknown): ServiceabilityIncomeLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const streamKey = readString(readOptionalField(raw, 'streamKey', 'stream_key'));
	const label = readString(readOptionalField(raw, 'label', 'label'));
	const monthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyDollars', 'monthly_dollars')
	);
	const isConfirmed = readBoolean(
		readOptionalField(raw, 'isConfirmed', 'is_confirmed')
	);
	if (
		streamKey === null ||
		label === null ||
		monthlyDollars === null ||
		isConfirmed === null
	) {
		return null;
	}
	return {
		streamKey,
		label,
		monthlyDollars,
		isConfirmed,
	};
}

function normalizeLiabilityLine(raw: unknown): ServiceabilityLiabilityLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(readOptionalField(raw, 'id', 'id'));
	const name = readString(readOptionalField(raw, 'name', 'name'));
	const kind = readString(readOptionalField(raw, 'kind', 'kind'));
	const rateTypeRaw = readOptionalField(raw, 'rateType', 'rate_type');
	const rateType =
		rateTypeRaw === null || rateTypeRaw === undefined
			? null
			: readString(rateTypeRaw);
	const interestRateBpsRaw = readOptionalField(raw, 'interestRateBps', 'interest_rate_bps');
	const interestRateBps =
		interestRateBpsRaw === null || interestRateBpsRaw === undefined
			? null
			: readFiniteNumber(interestRateBpsRaw);
	const included = readBoolean(readOptionalField(raw, 'included', 'included'));
	const baseline = readFiniteNumber(
		readOptionalField(
			raw,
			'baselineRepaymentMonthlyDollars',
			'baseline_repayment_monthly_dollars'
		)
	);
	const stressed = readFiniteNumber(
		readOptionalField(
			raw,
			'stressedRepaymentMonthlyDollars',
			'stressed_repayment_monthly_dollars'
		)
	);
	if (
		id === null ||
		name === null ||
		kind === null ||
		included === null ||
		baseline === null ||
		stressed === null
	) {
		return null;
	}
	return {
		id: Math.trunc(id),
		name,
		kind,
		rateType,
		interestRateBps: interestRateBps === null ? null : Math.trunc(interestRateBps),
		included,
		baselineRepaymentMonthlyDollars: baseline,
		stressedRepaymentMonthlyDollars: stressed,
	};
}

function normalizeBucketLine(raw: unknown): ServiceabilityBucketLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const bucketKey = readString(readOptionalField(raw, 'bucketKey', 'bucket_key'));
	const label = readString(readOptionalField(raw, 'label', 'label'));
	const monthlyAverageDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyAverageDollars', 'monthly_average_dollars')
	);
	if (bucketKey === null || label === null || monthlyAverageDollars === null) {
		return null;
	}
	return { bucketKey, label, monthlyAverageDollars };
}

function normalizeLivingSplit(raw: unknown): ServiceabilityLivingSplit | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const committedLiving = readFiniteNumber(
		readOptionalField(raw, 'committedLivingMonthlyDollars', 'committed_living_monthly_dollars')
	);
	const discretionaryLiving = readFiniteNumber(
		readOptionalField(
			raw,
			'discretionaryLivingMonthlyDollars',
			'discretionary_living_monthly_dollars'
		)
	);
	const committedBucketsRaw = readOptionalField(raw, 'committedBuckets', 'committed_buckets');
	const discretionaryBucketsRaw = readOptionalField(
		raw,
		'discretionaryBuckets',
		'discretionary_buckets'
	);
	if (
		committedLiving === null ||
		discretionaryLiving === null ||
		!Array.isArray(committedBucketsRaw) ||
		!Array.isArray(discretionaryBucketsRaw)
	) {
		return null;
	}
	const committedBuckets: ServiceabilityBucketLine[] = [];
	for (const entry of committedBucketsRaw) {
		const line = normalizeBucketLine(entry);
		if (line) {
			committedBuckets.push(line);
		}
	}
	const discretionaryBuckets: ServiceabilityBucketLine[] = [];
	for (const entry of discretionaryBucketsRaw) {
		const line = normalizeBucketLine(entry);
		if (line) {
			discretionaryBuckets.push(line);
		}
	}
	return {
		committedLivingMonthlyDollars: committedLiving,
		discretionaryLivingMonthlyDollars: discretionaryLiving,
		committedBuckets,
		discretionaryBuckets,
	};
}

export function normalizeServiceabilitySummary(
	raw: unknown
): ServiceabilitySummaryResponse | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const startDate = readString(readOptionalField(raw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(raw, 'endDate', 'end_date'));
	const rateBufferBps = readFiniteNumber(
		readOptionalField(raw, 'rateBufferBps', 'rate_buffer_bps')
	);
	const incomeUsesUnconfirmed = readBoolean(
		readOptionalField(raw, 'incomeUsesUnconfirmed', 'income_uses_unconfirmed')
	);
	const incomeMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'incomeMonthlyDollars', 'income_monthly_dollars')
	);
	const repaymentsMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'repaymentsMonthlyDollars', 'repayments_monthly_dollars')
	);
	const stressedRepaymentsMonthlyDollars = readFiniteNumber(
		readOptionalField(
			raw,
			'stressedRepaymentsMonthlyDollars',
			'stressed_repayments_monthly_dollars'
		)
	);
	const livingExpensesMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'livingExpensesMonthlyDollars', 'living_expenses_monthly_dollars')
	);
	const surplusMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'surplusMonthlyDollars', 'surplus_monthly_dollars')
	);
	const stressedSurplusMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'stressedSurplusMonthlyDollars', 'stressed_surplus_monthly_dollars')
	);
	const committedTotalMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'committedTotalMonthlyDollars', 'committed_total_monthly_dollars')
	);
	const discretionaryTotalMonthlyDollars = readFiniteNumber(
		readOptionalField(
			raw,
			'discretionaryTotalMonthlyDollars',
			'discretionary_total_monthly_dollars'
		)
	);
	const incomeLinesRaw = readOptionalField(raw, 'incomeLines', 'income_lines');
	const liabilitiesRaw = readOptionalField(raw, 'liabilities', 'liabilities');
	const livingSplit = normalizeLivingSplit(
		readOptionalField(raw, 'livingSplit', 'living_split')
	);
	if (
		startDate === null ||
		endDate === null ||
		rateBufferBps === null ||
		incomeUsesUnconfirmed === null ||
		incomeMonthlyDollars === null ||
		repaymentsMonthlyDollars === null ||
		stressedRepaymentsMonthlyDollars === null ||
		livingExpensesMonthlyDollars === null ||
		surplusMonthlyDollars === null ||
		stressedSurplusMonthlyDollars === null ||
		committedTotalMonthlyDollars === null ||
		discretionaryTotalMonthlyDollars === null ||
		!Array.isArray(incomeLinesRaw) ||
		!Array.isArray(liabilitiesRaw) ||
		livingSplit === null
	) {
		return null;
	}
	const incomeLines: ServiceabilityIncomeLine[] = [];
	for (const entry of incomeLinesRaw) {
		const line = normalizeIncomeLine(entry);
		if (line) {
			incomeLines.push(line);
		}
	}
	const liabilities: ServiceabilityLiabilityLine[] = [];
	for (const entry of liabilitiesRaw) {
		const line = normalizeLiabilityLine(entry);
		if (line) {
			liabilities.push(line);
		}
	}
	return {
		startDate,
		endDate,
		rateBufferBps: Math.trunc(rateBufferBps),
		incomeUsesUnconfirmed,
		incomeMonthlyDollars,
		incomeLines,
		repaymentsMonthlyDollars,
		stressedRepaymentsMonthlyDollars,
		livingExpensesMonthlyDollars,
		surplusMonthlyDollars,
		stressedSurplusMonthlyDollars,
		committedTotalMonthlyDollars,
		discretionaryTotalMonthlyDollars,
		liabilities,
		livingSplit,
	};
}

export type ServiceabilitySummaryQuery = {
	startDate: string;
	endDate: string;
	accountId?: number | null;
	rateBufferBps?: number;
	minOccurrences?: number;
};

export async function fetchServiceabilitySummary(
	params: ServiceabilitySummaryQuery
): Promise<ServiceabilitySummaryResponse> {
	const search = new URLSearchParams();
	search.set('start_date', params.startDate);
	search.set('end_date', params.endDate);
	if (params.accountId != null) {
		search.set('account_id', String(params.accountId));
	}
	if (params.rateBufferBps != null) {
		search.set('rate_buffer_bps', String(params.rateBufferBps));
	}
	if (params.minOccurrences != null) {
		search.set('min_occurrences', String(params.minOccurrences));
	}
	const response = await axios.get(`/api/serviceability/summary?${search.toString()}`);
	const summary = normalizeServiceabilitySummary(response.data);
	if (!summary) {
		throw new Error('Invalid serviceability summary response');
	}
	return summary;
}
