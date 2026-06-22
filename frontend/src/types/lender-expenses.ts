import axios from 'axios';

export type LenderExpenseBucket = {
	bucketKey: string;
	label: string;
	sortOrder: number;
};

export type CategoryLenderMappingRow = {
	categoryId: number;
	categoryName: string;
	bucketKey: string | null;
	bucketLabel: string | null;
	defaultBucketKey: string | null;
	isOverride: boolean;
	isExcluded: boolean;
	isManualExclude: boolean;
};

export type LenderExpenseBucketSummary = {
	bucketKey: string;
	label: string;
	totalDollars: number;
	monthlyAverageDollars: number;
	transactionCount: number;
};

export type LenderExpenseBucketCategoryLine = {
	categoryId: number | null;
	categoryPath: string;
	categoryColour: string | null;
	totalDollars: number;
	monthlyAverageDollars: number;
	transactionCount: number;
};

export type LenderExpenseBucketBreakdownResponse = {
	bucketKey: string;
	label: string;
	startDate: string;
	endDate: string;
	monthsInRange: number;
	totalDollars: number;
	monthlyAverageDollars: number;
	transactionCount: number;
	categories: LenderExpenseBucketCategoryLine[];
};

export type LenderExpenseSummaryResponse = {
	startDate: string;
	endDate: string;
	monthsInRange: number;
	buckets: LenderExpenseBucketSummary[];
	unmapped: {
		totalDollars: number;
		monthlyAverageDollars: number;
		transactionCount: number;
	};
	excluded: {
		totalDollars: number;
		monthlyAverageDollars: number;
		transactionCount: number;
	};
	totalMonthlyDollars: number;
	allDebitsMonthlyDollars: number;
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

function readOptionalField(raw: object, camelKey: string, snakeKey: string): unknown {
	if (Reflect.has(raw, camelKey)) {
		return Reflect.get(raw, camelKey);
	}
	return Reflect.get(raw, snakeKey);
}

function normalizeBucket(raw: unknown): LenderExpenseBucket | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const bucketKey = readString(readOptionalField(raw, 'bucketKey', 'bucket_key'));
	const label = readString(Reflect.get(raw, 'label'));
	const sortOrder = readFiniteNumber(readOptionalField(raw, 'sortOrder', 'sort_order'));
	if (bucketKey === null || label === null || sortOrder === undefined) {
		return null;
	}
	return { bucketKey, label, sortOrder };
}

function normalizeMappingRow(raw: unknown): CategoryLenderMappingRow | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const categoryId = readFiniteNumber(readOptionalField(raw, 'categoryId', 'category_id'));
	const categoryName = readString(readOptionalField(raw, 'categoryName', 'category_name'));
	const bucketKeyRaw = readOptionalField(raw, 'bucketKey', 'bucket_key');
	const bucketKey =
		bucketKeyRaw === null || bucketKeyRaw === undefined ? null : readString(bucketKeyRaw);
	const bucketLabelRaw = readOptionalField(raw, 'bucketLabel', 'bucket_label');
	const bucketLabel =
		bucketLabelRaw === null || bucketLabelRaw === undefined ? null : readString(bucketLabelRaw);
	const defaultBucketKeyRaw = readOptionalField(raw, 'defaultBucketKey', 'default_bucket_key');
	const defaultBucketKey =
		defaultBucketKeyRaw === null || defaultBucketKeyRaw === undefined
			? null
			: readString(defaultBucketKeyRaw);
	const isOverride = readBoolean(readOptionalField(raw, 'isOverride', 'is_override'));
	const isExcluded = readBoolean(readOptionalField(raw, 'isExcluded', 'is_excluded'));
	const isManualExclude = readBoolean(
		readOptionalField(raw, 'isManualExclude', 'is_manual_exclude')
	);
	if (
		categoryId === undefined ||
		categoryName === null ||
		isOverride === undefined ||
		isExcluded === undefined ||
		isManualExclude === undefined
	) {
		return null;
	}
	return {
		categoryId,
		categoryName,
		bucketKey,
		bucketLabel,
		defaultBucketKey,
		isOverride,
		isExcluded,
		isManualExclude,
	};
}

function normalizeBucketSummary(raw: unknown): LenderExpenseBucketSummary | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const bucketKey = readString(readOptionalField(raw, 'bucketKey', 'bucket_key'));
	const label = readString(Reflect.get(raw, 'label'));
	const totalDollars = readFiniteNumber(
		readOptionalField(raw, 'totalDollars', 'total_dollars')
	);
	const monthlyAverageDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyAverageDollars', 'monthly_average_dollars')
	);
	const transactionCount = readFiniteNumber(
		readOptionalField(raw, 'transactionCount', 'transaction_count')
	);
	if (
		bucketKey === null ||
		label === null ||
		totalDollars === undefined ||
		monthlyAverageDollars === undefined ||
		transactionCount === undefined
	) {
		return null;
	}
	return { bucketKey, label, totalDollars, monthlyAverageDollars, transactionCount };
}

function normalizeUnmapped(raw: unknown): LenderExpenseSummaryResponse['unmapped'] | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const totalDollars = readFiniteNumber(
		readOptionalField(raw, 'totalDollars', 'total_dollars')
	);
	const monthlyAverageDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyAverageDollars', 'monthly_average_dollars')
	);
	const transactionCount = readFiniteNumber(
		readOptionalField(raw, 'transactionCount', 'transaction_count')
	);
	if (
		totalDollars === undefined ||
		monthlyAverageDollars === undefined ||
		transactionCount === undefined
	) {
		return null;
	}
	return { totalDollars, monthlyAverageDollars, transactionCount };
}

export function normalizeLenderExpenseSummary(raw: unknown): LenderExpenseSummaryResponse | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const startDate = readString(readOptionalField(raw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(raw, 'endDate', 'end_date'));
	const monthsInRange = readFiniteNumber(
		readOptionalField(raw, 'monthsInRange', 'months_in_range')
	);
	const totalMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'totalMonthlyDollars', 'total_monthly_dollars')
	);
	const bucketsRaw = Reflect.get(raw, 'buckets');
	if (
		startDate === null ||
		endDate === null ||
		monthsInRange === undefined ||
		totalMonthlyDollars === undefined ||
		!Array.isArray(bucketsRaw)
	) {
		return null;
	}
	const buckets: LenderExpenseBucketSummary[] = [];
	for (const item of bucketsRaw) {
		const bucket = normalizeBucketSummary(item);
		if (!bucket) {
			return null;
		}
		buckets.push(bucket);
	}
	const unmapped = normalizeUnmapped(Reflect.get(raw, 'unmapped'));
	const excluded = normalizeUnmapped(Reflect.get(raw, 'excluded'));
	const allDebitsMonthlyDollars = readFiniteNumber(
		readOptionalField(raw, 'allDebitsMonthlyDollars', 'all_debits_monthly_dollars')
	);
	if (!unmapped || !excluded) {
		return null;
	}
	if (allDebitsMonthlyDollars === undefined) {
		return null;
	}
	return {
		startDate,
		endDate,
		monthsInRange,
		buckets,
		unmapped,
		excluded,
		totalMonthlyDollars,
		allDebitsMonthlyDollars,
	};
}

export async function fetchLenderExpenseBuckets(): Promise<LenderExpenseBucket[]> {
	const response = await axios.get('/api/lender-expenses/buckets');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid lender buckets response');
	}
	const buckets: LenderExpenseBucket[] = [];
	for (const item of response.data) {
		const bucket = normalizeBucket(item);
		if (!bucket) {
			throw new Error('Invalid lender buckets response');
		}
		buckets.push(bucket);
	}
	return buckets;
}

export async function fetchCategoryLenderMappings(): Promise<CategoryLenderMappingRow[]> {
	const response = await axios.get('/api/lender-expenses/mappings');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid lender mappings response');
	}
	const rows: CategoryLenderMappingRow[] = [];
	for (const item of response.data) {
		const row = normalizeMappingRow(item);
		if (!row) {
			throw new Error('Invalid lender mappings response');
		}
		rows.push(row);
	}
	return rows;
}

export async function upsertCategoryLenderMapping(
	categoryId: number,
	bucketKey: string | null
): Promise<void> {
	await axios.put('/api/lender-expenses/mappings', {
		category_id: categoryId,
		bucket_key: bucketKey,
	});
}

export async function fetchLenderExpenseSummary(params: {
	startDate: string;
	endDate: string;
	accountId?: number | null;
}): Promise<LenderExpenseSummaryResponse> {
	const search = new URLSearchParams();
	search.set('start_date', params.startDate);
	search.set('end_date', params.endDate);
	if (params.accountId != null) {
		search.set('account_id', String(params.accountId));
	}
	const response = await axios.get(`/api/lender-expenses/summary?${search.toString()}`);
	const summary = normalizeLenderExpenseSummary(response.data);
	if (!summary) {
		throw new Error('Invalid lender expense summary response');
	}
	return summary;
}

function normalizeBucketCategoryLine(raw: unknown): LenderExpenseBucketCategoryLine | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const categoryIdRaw = readOptionalField(raw, 'categoryId', 'category_id');
	const categoryId =
		categoryIdRaw === null || categoryIdRaw === undefined
			? null
			: readFiniteNumber(categoryIdRaw);
	if (categoryIdRaw !== null && categoryIdRaw !== undefined && categoryId === undefined) {
		return null;
	}
	const categoryPath = readString(readOptionalField(raw, 'categoryPath', 'category_path'));
	const categoryColourRaw = readOptionalField(raw, 'categoryColour', 'category_colour');
	const categoryColour =
		categoryColourRaw === null || categoryColourRaw === undefined
			? null
			: readString(categoryColourRaw);
	const totalDollars = readFiniteNumber(
		readOptionalField(raw, 'totalDollars', 'total_dollars')
	);
	const monthlyAverageDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyAverageDollars', 'monthly_average_dollars')
	);
	const transactionCount = readFiniteNumber(
		readOptionalField(raw, 'transactionCount', 'transaction_count')
	);
	if (
		categoryPath === null ||
		totalDollars === undefined ||
		monthlyAverageDollars === undefined ||
		transactionCount === undefined
	) {
		return null;
	}
	return {
		categoryId: categoryId ?? null,
		categoryPath,
		categoryColour,
		totalDollars,
		monthlyAverageDollars,
		transactionCount,
	};
}

export function normalizeLenderExpenseBucketBreakdown(
	raw: unknown
): LenderExpenseBucketBreakdownResponse | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const bucketKey = readString(readOptionalField(raw, 'bucketKey', 'bucket_key'));
	const label = readString(Reflect.get(raw, 'label'));
	const startDate = readString(readOptionalField(raw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(raw, 'endDate', 'end_date'));
	const monthsInRange = readFiniteNumber(
		readOptionalField(raw, 'monthsInRange', 'months_in_range')
	);
	const totalDollars = readFiniteNumber(
		readOptionalField(raw, 'totalDollars', 'total_dollars')
	);
	const monthlyAverageDollars = readFiniteNumber(
		readOptionalField(raw, 'monthlyAverageDollars', 'monthly_average_dollars')
	);
	const transactionCount = readFiniteNumber(
		readOptionalField(raw, 'transactionCount', 'transaction_count')
	);
	const categoriesRaw = Reflect.get(raw, 'categories');
	if (
		bucketKey === null ||
		label === null ||
		startDate === null ||
		endDate === null ||
		monthsInRange === undefined ||
		totalDollars === undefined ||
		monthlyAverageDollars === undefined ||
		transactionCount === undefined ||
		!Array.isArray(categoriesRaw)
	) {
		return null;
	}
	const categories: LenderExpenseBucketCategoryLine[] = [];
	for (const item of categoriesRaw) {
		const line = normalizeBucketCategoryLine(item);
		if (!line) {
			return null;
		}
		categories.push(line);
	}
	return {
		bucketKey,
		label,
		startDate,
		endDate,
		monthsInRange,
		totalDollars,
		monthlyAverageDollars,
		transactionCount,
		categories,
	};
}

export async function fetchLenderExpenseBucketBreakdown(params: {
	bucketKey: string;
	startDate: string;
	endDate: string;
	accountId?: number | null;
}): Promise<LenderExpenseBucketBreakdownResponse> {
	const search = new URLSearchParams();
	search.set('start_date', params.startDate);
	search.set('end_date', params.endDate);
	if (params.accountId != null) {
		search.set('account_id', String(params.accountId));
	}
	const response = await axios.get(
		`/api/lender-expenses/buckets/${encodeURIComponent(params.bucketKey)}/breakdown?${search.toString()}`
	);
	const breakdown = normalizeLenderExpenseBucketBreakdown(response.data);
	if (!breakdown) {
		throw new Error('Invalid lender bucket breakdown response');
	}
	return breakdown;
}
