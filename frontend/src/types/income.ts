import axios from 'axios';

export type IncomeStreamSummary = {
	streamKey: string;
	label: string;
	sourceLabel: string;
	frequency: string;
	averageAmountDollars: number;
	estimatedMonthlyDollars: number;
	minAmountDollars: number;
	maxAmountDollars: number;
	monthsObserved: number;
	occurrences: number;
	firstDate: string;
	lastDate: string;
	confidence: number;
	isIrregular: boolean;
	isPrimary: boolean;
	isConfirmed: boolean;
	grossMonthlyDollars: number | null;
	estimatedYearlyExGstDollars: number;
	estimatedYearlyIncGstDollars: number;
	grossYearlyExGstDollars: number | null;
	grossYearlyIncGstDollars: number | null;
	mergedIntoKey: string | null;
};

export type IncomeSummaryResponse = {
	streams: IncomeStreamSummary[];
	totalMonthlyDollars: number;
	totalYearlyExGstDollars: number;
	totalYearlyIncGstDollars: number;
	primaryStreamKey: string | null;
};

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	return undefined;
}

function readNullableFiniteNumber(value: unknown): number | null | undefined {
	if (value === null) {
		return null;
	}
	return readFiniteNumber(value);
}

function readOptionalField(raw: object, camelKey: string, snakeKey: string): unknown {
	if (Reflect.has(raw, camelKey)) {
		return Reflect.get(raw, camelKey);
	}
	return Reflect.get(raw, snakeKey);
}

function normalizeIncomeStream(raw: unknown): IncomeStreamSummary | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const streamKey = readString(readOptionalField(raw, 'streamKey', 'stream_key'));
	const label = readString(Reflect.get(raw, 'label'));
	const sourceLabel = readString(readOptionalField(raw, 'sourceLabel', 'source_label'));
	const frequency = readString(Reflect.get(raw, 'frequency'));
	const averageAmountDollars = readFiniteNumber(
		readOptionalField(raw, 'averageAmountDollars', 'average_amount_dollars')
	);
	const estimatedMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'estimatedMonthlyDollars', 'estimated_monthly_dollars')
	);
	const minAmountDollars = readFiniteNumber(
		readOptionalField(raw, 'minAmountDollars', 'min_amount_dollars')
	);
	const maxAmountDollars = readFiniteNumber(
		readOptionalField(raw, 'maxAmountDollars', 'max_amount_dollars')
	);
	const monthsObserved = readFiniteNumber(
		readOptionalField(raw, 'monthsObserved', 'months_observed')
	);
	const occurrences = readFiniteNumber(Reflect.get(raw, 'occurrences'));
	const firstDate = readString(readOptionalField(raw, 'firstDate', 'first_date'));
	const lastDate = readString(readOptionalField(raw, 'lastDate', 'last_date'));
	const confidence = readFiniteNumber(Reflect.get(raw, 'confidence'));
	const isIrregular = readBoolean(readOptionalField(raw, 'isIrregular', 'is_irregular'));
	const isPrimary = readBoolean(readOptionalField(raw, 'isPrimary', 'is_primary'));
	const isConfirmed = readBoolean(readOptionalField(raw, 'isConfirmed', 'is_confirmed'));
	const grossMonthlyDollars = readNullableFiniteNumber(
		readOptionalField(raw, 'grossMonthlyDollars', 'gross_monthly_dollars')
	);
	const estimatedYearlyExGstDollars = readFiniteNumber(
		readOptionalField(raw, 'estimatedYearlyExGstDollars', 'estimated_yearly_ex_gst_dollars')
	);
	const estimatedYearlyIncGstDollars = readFiniteNumber(
		readOptionalField(raw, 'estimatedYearlyIncGstDollars', 'estimated_yearly_inc_gst_dollars')
	);
	const grossYearlyExGstDollars = readNullableFiniteNumber(
		readOptionalField(raw, 'grossYearlyExGstDollars', 'gross_yearly_ex_gst_dollars')
	);
	const grossYearlyIncGstDollars = readNullableFiniteNumber(
		readOptionalField(raw, 'grossYearlyIncGstDollars', 'gross_yearly_inc_gst_dollars')
	);
	const mergedRaw = readOptionalField(raw, 'mergedIntoKey', 'merged_into_key');
	const mergedIntoKey =
		mergedRaw === null || mergedRaw === undefined ? null : readString(mergedRaw);

	if (
		streamKey === null ||
		label === null ||
		sourceLabel === null ||
		frequency === null ||
		averageAmountDollars === undefined ||
		estimatedMonthlyDollars === undefined ||
		minAmountDollars === undefined ||
		maxAmountDollars === undefined ||
		monthsObserved === undefined ||
		occurrences === undefined ||
		firstDate === null ||
		lastDate === null ||
		confidence === undefined ||
		isIrregular === undefined ||
		isPrimary === undefined ||
		isConfirmed === undefined ||
		estimatedYearlyExGstDollars === undefined ||
		estimatedYearlyIncGstDollars === undefined
	) {
		return null;
	}

	return {
		streamKey,
		label,
		sourceLabel,
		frequency,
		averageAmountDollars,
		estimatedMonthlyDollars,
		minAmountDollars,
		maxAmountDollars,
		monthsObserved,
		occurrences,
		firstDate,
		lastDate,
		confidence,
		isIrregular,
		isPrimary,
		isConfirmed,
		grossMonthlyDollars: grossMonthlyDollars ?? null,
		estimatedYearlyExGstDollars,
		estimatedYearlyIncGstDollars,
		grossYearlyExGstDollars: grossYearlyExGstDollars ?? null,
		grossYearlyIncGstDollars: grossYearlyIncGstDollars ?? null,
		mergedIntoKey,
	};
}

export function normalizeIncomeSummary(raw: unknown): IncomeSummaryResponse | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const streamsRaw = Reflect.get(raw, 'streams');
	if (!Array.isArray(streamsRaw)) {
		return null;
	}
	const streams: IncomeStreamSummary[] = [];
	for (const item of streamsRaw) {
		const stream = normalizeIncomeStream(item);
		if (!stream) {
			return null;
		}
		streams.push(stream);
	}
	const totalMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'totalMonthlyDollars', 'total_monthly_dollars')
	);
	const totalYearlyExGstDollars = readFiniteNumber(
		readOptionalField(raw, 'totalYearlyExGstDollars', 'total_yearly_ex_gst_dollars')
	);
	const totalYearlyIncGstDollars = readFiniteNumber(
		readOptionalField(raw, 'totalYearlyIncGstDollars', 'total_yearly_inc_gst_dollars')
	);
	const primaryStreamKey = readString(
		readOptionalField(raw, 'primaryStreamKey', 'primary_stream_key')
	);
	if (
		totalMonthlyDollars === undefined ||
		totalYearlyExGstDollars === undefined ||
		totalYearlyIncGstDollars === undefined
	) {
		return null;
	}
	return {
		streams,
		totalMonthlyDollars,
		totalYearlyExGstDollars,
		totalYearlyIncGstDollars,
		primaryStreamKey,
	};
}

export async function fetchIncomeSummary(
	accountId?: number | null,
	minOccurrences = 3
): Promise<IncomeSummaryResponse> {
	const params = new URLSearchParams();
	params.set('min_occurrences', String(minOccurrences));
	if (accountId != null) {
		params.set('account_id', String(accountId));
	}
	const response = await axios.get(`/api/income-streams?${params.toString()}`);
	const summary = normalizeIncomeSummary(response.data);
	if (!summary) {
		throw new Error('Invalid income summary response');
	}
	return summary;
}

export type UpsertIncomeStreamProfilePayload = {
	streamKey: string;
	displayLabel?: string;
	isPrimary?: boolean;
	isConfirmed?: boolean;
	grossMonthlyDollars?: number | null;
	mergedIntoKey?: string | null;
};

export async function upsertIncomeStreamProfile(
	payload: UpsertIncomeStreamProfilePayload
): Promise<void> {
	await axios.put('/api/income-streams/profiles', {
		stream_key: payload.streamKey,
		display_label: payload.displayLabel,
		is_primary: payload.isPrimary,
		is_confirmed: payload.isConfirmed,
		gross_monthly_dollars: payload.grossMonthlyDollars,
		merged_into_key: payload.mergedIntoKey,
	});
}
