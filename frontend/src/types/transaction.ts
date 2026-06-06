import axios from 'axios';

export type Transaction = {
	id: number;
	statement_id: number;
	description: string;
	amount: number;
	transaction_date: string;
	last_updated: string;
	deleted_at: string | null;
	created_at: string;
	status: string;
	balance: number;
	category_id?: number | null;
};

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null) {
		return null;
	}
	return typeof value === 'string' ? value : null;
}

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

function readCategoryIdField(value: unknown): number | null | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (value === null) {
		return null;
	}
	const parsed = readFiniteNumber(value);
	return parsed === null ? undefined : parsed;
}

export function normalizeTransaction(raw: unknown): Transaction | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readFiniteNumber(Reflect.get(raw, 'id'));
	const statementId = readFiniteNumber(Reflect.get(raw, 'statement_id'));
	const description = readString(Reflect.get(raw, 'description'));
	const amount = readFiniteNumber(Reflect.get(raw, 'amount'));
	const transactionDate = readString(Reflect.get(raw, 'transaction_date'));
	const lastUpdated = readString(Reflect.get(raw, 'last_updated'));
	const deletedAt = readNullableString(Reflect.get(raw, 'deleted_at'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));
	const status = readString(Reflect.get(raw, 'status'));
	const balance = readFiniteNumber(Reflect.get(raw, 'balance'));
	const categoryId = readCategoryIdField(Reflect.get(raw, 'category_id'));

	if (
		id === null ||
		statementId === null ||
		description === null ||
		amount === null ||
		transactionDate === null ||
		lastUpdated === null ||
		createdAt === null ||
		status === null ||
		balance === null
	) {
		return null;
	}

	return {
		id,
		statement_id: statementId,
		description,
		amount,
		transaction_date: transactionDate,
		last_updated: lastUpdated,
		deleted_at: deletedAt,
		created_at: createdAt,
		status,
		balance,
		category_id: categoryId,
	};
}

export type PaginatedTransactionsResponse = {
	items: Transaction[];
	total: number;
	page: number;
	per_page: number;
	total_pages: number;
};

export type FetchTransactionsPageParams = {
	page: number;
	perPage?: number;
	search?: string;
	uncategorizedOnly?: boolean;
	signal?: AbortSignal;
};

function parsePaginatedTransactionsPayload(
	payload: unknown
): PaginatedTransactionsResponse | string {
	if (!payload || typeof payload !== 'object') {
		return 'Invalid transactions response (expected paginated object)';
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
		return 'Invalid transactions response (unexpected paginated shape)';
	}

	const items: Transaction[] = [];
	for (const item of itemsRaw) {
		const transaction = normalizeTransaction(item);
		if (!transaction) {
			return 'Invalid transactions response (unexpected item shape)';
		}
		items.push(transaction);
	}

	return { items, total, page, per_page: perPage, total_pages: totalPages };
}

export async function fetchTransactionsPage(
	params: FetchTransactionsPageParams
): Promise<PaginatedTransactionsResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set('page', String(params.page));
	searchParams.set('per_page', String(params.perPage ?? 50));
	if (params.search && params.search.trim().length > 0) {
		searchParams.set('search', params.search.trim());
	}
	if (params.uncategorizedOnly === true) {
		searchParams.set('uncategorized_only', 'true');
	}

	const response = await axios.get(`/api/transactions?${searchParams.toString()}`, {
		signal: params.signal,
	});
	const parsed = parsePaginatedTransactionsPayload(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}
