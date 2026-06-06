import axios from 'axios';

export type Statement = {
	id: number;
	date: string;
	account_id: string;
	opening_balance: number;
	closing_balance: number;
	deleted_at: string | null;
	created_at: string;
};

export type PaginatedStatementsResponse = {
	items: Statement[];
	total: number;
	page: number;
	per_page: number;
	total_pages: number;
};

export type FetchStatementsPageParams = {
	page: number;
	perPage?: number;
	signal?: AbortSignal;
};

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null) {
		return null;
	}
	return typeof value === 'string' ? value : null;
}

function normalizeStatement(raw: unknown): Statement | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(Reflect.get(raw, 'id'));
	const date = readString(Reflect.get(raw, 'date'));
	const accountId = readString(Reflect.get(raw, 'account_id'));
	const openingBalance = readFiniteNumber(Reflect.get(raw, 'opening_balance'));
	const closingBalance = readFiniteNumber(Reflect.get(raw, 'closing_balance'));
	const deletedAt = readNullableString(Reflect.get(raw, 'deleted_at'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));

	if (
		id === null ||
		date === null ||
		accountId === null ||
		openingBalance === null ||
		closingBalance === null ||
		createdAt === null
	) {
		return null;
	}

	return {
		id,
		date,
		account_id: accountId,
		opening_balance: openingBalance,
		closing_balance: closingBalance,
		deleted_at: deletedAt,
		created_at: createdAt,
	};
}

function parsePaginatedStatementsPayload(payload: unknown): PaginatedStatementsResponse | string {
	if (!payload || typeof payload !== 'object') {
		return 'Invalid statements response (expected paginated object)';
	}

	const itemsRaw = Reflect.get(payload, 'items');
	const total = readFiniteNumber(Reflect.get(payload, 'total'));
	const page = readFiniteNumber(Reflect.get(payload, 'page'));
	const perPage = readFiniteNumber(Reflect.get(payload, 'per_page'));
	const totalPages = readFiniteNumber(Reflect.get(payload, 'total_pages'));

	if (
		!Array.isArray(itemsRaw) ||
		total === null ||
		page === null ||
		perPage === null ||
		totalPages === null
	) {
		return 'Invalid statements response (unexpected paginated shape)';
	}

	const items: Statement[] = [];
	for (const item of itemsRaw) {
		const statement = normalizeStatement(item);
		if (!statement) {
			return 'Invalid statements response (unexpected item shape)';
		}
		items.push(statement);
	}

	return { items, total, page, per_page: perPage, total_pages: totalPages };
}

export async function fetchStatementsPage(
	params: FetchStatementsPageParams
): Promise<PaginatedStatementsResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set('page', String(params.page));
	searchParams.set('per_page', String(params.perPage ?? 50));

	const response = await axios.get(`/api/statements?${searchParams.toString()}`, {
		signal: params.signal,
	});
	const parsed = parsePaginatedStatementsPayload(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}

export async function fetchMissingStatementPeriods(
	signal?: AbortSignal
): Promise<string[]> {
	const response = await axios.get('/api/statements/missing-periods', { signal });
	const data = response.data as { periods?: unknown };
	if (!data || !Array.isArray(data.periods)) {
		throw new Error('Invalid missing periods response');
	}
	const periods: string[] = [];
	for (const item of data.periods) {
		if (typeof item !== 'string') {
			throw new Error('Invalid missing periods response');
		}
		periods.push(item);
	}
	return periods;
}
