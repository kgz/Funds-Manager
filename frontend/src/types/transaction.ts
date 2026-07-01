import axios from 'axios';
import {
	normalizeFinancialAccountSummary,
	type FinancialAccountSummary,
} from '@/types/account';

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
	suggested_category_id?: number | null;
	suggested_category_name?: string | null;
	financial_account?: FinancialAccountSummary | null;
	transfer_pair_id?: number | null;
	is_transfer_leg?: boolean;
	transfer_leg?: 'out' | 'in' | null;
	transfer_pair_status?: string | null;
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
	const suggestedCategoryId = readCategoryIdField(
		Reflect.get(raw, 'suggested_category_id')
	);
	const suggestedCategoryName = readNullableString(
		Reflect.get(raw, 'suggested_category_name')
	);
	const financialAccountRaw = Reflect.get(raw, 'financial_account');
	const financialAccount =
		financialAccountRaw === undefined || financialAccountRaw === null
			? null
			: normalizeFinancialAccountSummary(financialAccountRaw);
	const transferPairStatus = readNullableString(
		Reflect.get(raw, 'transfer_pair_status')
	);
	const transferPairId = readFiniteNumber(Reflect.get(raw, 'transfer_pair_id'));
	const isTransferLegRaw = Reflect.get(raw, 'is_transfer_leg');
	const isTransferLeg = isTransferLegRaw === true;
	const transferLegRaw = readNullableString(Reflect.get(raw, 'transfer_leg'));
	const transferLeg =
		transferLegRaw === 'out' || transferLegRaw === 'in' ? transferLegRaw : null;

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
		suggested_category_id: suggestedCategoryId,
		suggested_category_name: suggestedCategoryName,
		financial_account: financialAccount,
		transfer_pair_id: transferPairId,
		is_transfer_leg: isTransferLeg ? true : undefined,
		transfer_leg: transferLeg,
		transfer_pair_status: transferPairStatus,
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
	includeSuggestions?: boolean;
	accountId?: number | null;
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
	if (params.includeSuggestions === true) {
		searchParams.set('include_suggestions', 'true');
	}
	if (params.accountId != null) {
		searchParams.set('account_id', String(params.accountId));
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

function readUpdatedCount(payload: unknown): number | string {
	if (!payload || typeof payload !== 'object') {
		return 'Invalid response';
	}
	const updated = readFiniteNumber(Reflect.get(payload, 'updated'));
	if (updated === null) {
		return 'Invalid response';
	}
	return updated;
}

export async function bulkPatchTransactionCategories(
	transactionIds: number[],
	categoryId: number | null
): Promise<number> {
	const response = await axios.patch('/api/transactions/categories', {
		transaction_ids: transactionIds,
		category_id: categoryId,
	});
	const parsed = readUpdatedCount(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}

export async function bulkPatchTransactionCategoriesByGroup(params: {
	groupKey: string;
	sourceCategoryId: number | null;
	startDate: string;
	endDate: string;
	accountId?: number | null;
	categoryId: number | null;
}): Promise<number> {
	const response = await axios.patch('/api/transactions/categories-by-group', {
		group_key: params.groupKey,
		source_category_id: params.sourceCategoryId,
		start_date: params.startDate,
		end_date: params.endDate,
		account_id: params.accountId ?? null,
		category_id: params.categoryId,
	});
	const parsed = readUpdatedCount(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}

export async function acceptTransactionSuggestions(
	transactionIds: number[]
): Promise<number> {
	const response = await axios.post('/api/transactions/accept-suggestions', {
		transaction_ids: transactionIds,
	});
	const parsed = readUpdatedCount(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}

