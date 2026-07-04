import axios from 'axios';

export type PlannedSpendingItem = {
	id: string;
	name: string;
	amount_cents: number;
	start_date: string;
	end_date: string | null;
	category_id: string | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
	resolved_at?: string | null;
	linked_transactions: PlannedMatchTransaction[];
	linked_total_cents: number;
};

export type PlannedMatchTransaction = {
	id: number;
	description: string;
	amount: number;
	transaction_date: string;
	category_id: number | null;
	account_label: string;
};

export type PlannedMatchSuggestion = {
	planned: PlannedSpendingItem;
	transaction: PlannedMatchTransaction;
	date_variance_days: number;
	amount_variance_cents: number;
	reasons: string[];
};

export type PlannedSpendingListResult = {
	items: PlannedSpendingItem[];
	total_cents: number;
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

function readIdAsString(value: unknown): string | null {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(Math.trunc(value));
	}
	return null;
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	return null;
}

export function normalizePlannedSpendingItem(raw: unknown): PlannedSpendingItem | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readIdAsString(Reflect.get(raw, 'id'));
	const name = readString(Reflect.get(raw, 'name'));
	const amountCents = readFiniteNumber(Reflect.get(raw, 'amount_cents'));
	const startDate = readString(Reflect.get(raw, 'start_date'));
	const endDate = readNullableString(Reflect.get(raw, 'end_date'));
	const categoryIdRaw = Reflect.get(raw, 'category_id');
	const categoryId =
		categoryIdRaw === null || categoryIdRaw === undefined
			? null
			: readIdAsString(categoryIdRaw);
	const notes = readNullableString(Reflect.get(raw, 'notes'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));
	const deletedAt = readNullableString(Reflect.get(raw, 'deleted_at'));
	const resolvedAt = readNullableString(Reflect.get(raw, 'resolved_at'));
	const linkedTotalCents = readFiniteNumber(Reflect.get(raw, 'linked_total_cents'));
	const linkedTransactionsRaw = Reflect.get(raw, 'linked_transactions');

	if (
		id === null ||
		name === null ||
		amountCents === null ||
		startDate === null ||
		createdAt === null
	) {
		return null;
	}

	return {
		id,
		name,
		amount_cents: Math.trunc(amountCents),
		start_date: startDate,
		end_date: endDate,
		category_id: categoryId,
		notes,
		created_at: createdAt,
		deleted_at: deletedAt,
		resolved_at: resolvedAt,
		linked_total_cents: Math.trunc(linkedTotalCents ?? 0),
		linked_transactions: normalizePlannedMatchTransactions(linkedTransactionsRaw),
	};
}

function normalizePlannedMatchTransactions(raw: unknown): PlannedMatchTransaction[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const transactions: PlannedMatchTransaction[] = [];
	for (const entry of raw) {
		const transaction = normalizePlannedMatchTransaction(entry);
		if (transaction) {
			transactions.push(transaction);
		}
	}
	return transactions;
}

function normalizePlannedMatchTransaction(raw: unknown): PlannedMatchTransaction | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(Reflect.get(raw, 'id'));
	const description = readString(Reflect.get(raw, 'description'));
	const amount = readFiniteNumber(Reflect.get(raw, 'amount'));
	const transactionDate = readString(Reflect.get(raw, 'transaction_date'));
	const categoryIdRaw = Reflect.get(raw, 'category_id');
	const categoryId =
		categoryIdRaw === null || categoryIdRaw === undefined
			? null
			: readFiniteNumber(categoryIdRaw);
	const accountLabel = readString(Reflect.get(raw, 'account_label'));
	if (
		id === null ||
		description === null ||
		amount === null ||
		transactionDate === null ||
		accountLabel === null
	) {
		return null;
	}
	return {
		id: Math.trunc(id),
		description,
		amount: Math.trunc(amount),
		transaction_date: transactionDate,
		category_id: categoryId === null ? null : Math.trunc(categoryId),
		account_label: accountLabel,
	};
}

export function normalizePlannedMatchSuggestion(
	raw: unknown
): PlannedMatchSuggestion | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const planned = normalizePlannedSpendingItem(Reflect.get(raw, 'planned'));
	const transaction = normalizePlannedMatchTransaction(Reflect.get(raw, 'transaction'));
	const dateVariance = readFiniteNumber(Reflect.get(raw, 'date_variance_days'));
	const amountVariance = readFiniteNumber(Reflect.get(raw, 'amount_variance_cents'));
	const reasonsRaw = Reflect.get(raw, 'reasons');
	if (
		planned === null ||
		transaction === null ||
		dateVariance === null ||
		amountVariance === null ||
		!Array.isArray(reasonsRaw)
	) {
		return null;
	}
	const reasons: string[] = [];
	for (const entry of reasonsRaw) {
		if (typeof entry === 'string') {
			reasons.push(entry);
		}
	}
	return {
		planned,
		transaction,
		date_variance_days: Math.trunc(dateVariance),
		amount_variance_cents: Math.trunc(amountVariance),
		reasons,
	};
}

export function normalizePlannedSpendingList(raw: unknown): PlannedSpendingListResult {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid planned spending response');
	}

	const itemsRaw = Reflect.get(raw, 'items');
	const totalCents = readFiniteNumber(Reflect.get(raw, 'total_cents'));
	if (!Array.isArray(itemsRaw) || totalCents === null) {
		throw new Error('Invalid planned spending response');
	}

	const items: PlannedSpendingItem[] = [];
	for (const entry of itemsRaw) {
		const item = normalizePlannedSpendingItem(entry);
		if (!item) {
			throw new Error('Invalid planned spending response');
		}
		items.push(item);
	}

	return {
		items,
		total_cents: Math.trunc(totalCents),
	};
}

export type PlannedSpendingQuery = {
	from?: string;
	to?: string;
};

export type CreatePlannedSpendingPayload = {
	name: string;
	amount_cents: number;
	start_date: string;
	end_date?: string | null;
	category_id?: number | null;
	notes?: string | null;
};

export type UpdatePlannedSpendingPayload = {
	name?: string;
	amount_cents?: number;
	start_date?: string;
	end_date?: string | null;
	category_id?: number | null;
	notes?: string | null;
};

function buildQuery(params: PlannedSpendingQuery): string {
	const search = new URLSearchParams();
	if (params.from) {
		search.set('from', params.from);
	}
	if (params.to) {
		search.set('to', params.to);
	}
	const query = search.toString();
	return query.length > 0 ? `?${query}` : '';
}

export async function fetchPlannedSpending(
	params: PlannedSpendingQuery
): Promise<PlannedSpendingListResult> {
	const response = await axios.get(`/api/planned-spending${buildQuery(params)}`);
	return normalizePlannedSpendingList(response.data);
}

export async function createPlannedSpendingItem(
	payload: CreatePlannedSpendingPayload
): Promise<PlannedSpendingItem> {
	const response = await axios.post('/api/planned-spending', payload);
	const item = normalizePlannedSpendingItem(response.data);
	if (!item) {
		throw new Error('Invalid planned spending response');
	}
	return item;
}

export async function updatePlannedSpendingItem(
	id: string,
	payload: UpdatePlannedSpendingPayload
): Promise<PlannedSpendingItem> {
	const response = await axios.put(`/api/planned-spending/${id}`, payload);
	const item = normalizePlannedSpendingItem(response.data);
	if (!item) {
		throw new Error('Invalid planned spending response');
	}
	return item;
}

export async function deletePlannedSpendingItem(id: string): Promise<void> {
	await axios.delete(`/api/planned-spending/${id}`);
}

export async function fetchPlannedMatchSuggestions(): Promise<PlannedMatchSuggestion[]> {
	const response = await axios.get('/api/planned-spending/match-suggestions');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid planned match suggestions response');
	}
	const suggestions: PlannedMatchSuggestion[] = [];
	for (const entry of response.data) {
		const suggestion = normalizePlannedMatchSuggestion(entry);
		if (!suggestion) {
			throw new Error('Invalid planned match suggestions response');
		}
		suggestions.push(suggestion);
	}
	return suggestions;
}

export async function fetchPlannedMatchSuggestionCount(): Promise<number> {
	const response = await axios.get('/api/planned-spending/match-suggestions/count');
	if (!response.data || typeof response.data !== 'object') {
		throw new Error('Invalid planned match count response');
	}
	const count = readFiniteNumber(Reflect.get(response.data, 'count'));
	if (count === null) {
		throw new Error('Invalid planned match count response');
	}
	return Math.trunc(count);
}

export type ResolvePlannedMatchAction =
	| 'confirm'
	| 'link'
	| 'dismiss'
	| 'complete'
	| 'unlink';

export async function fetchPlannedLinkCandidates(
	plannedId: string,
	search?: string
): Promise<PlannedMatchTransaction[]> {
	const searchParams = new URLSearchParams();
	if (search && search.trim().length > 0) {
		searchParams.set('search', search.trim());
	}
	const query = searchParams.toString();
	const url =
		query.length > 0
			? `/api/planned-spending/${plannedId}/link-candidates?${query}`
			: `/api/planned-spending/${plannedId}/link-candidates`;
	const response = await axios.get(url);
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid link candidates response');
	}
	const candidates: PlannedMatchTransaction[] = [];
	for (const entry of response.data) {
		const candidate = normalizePlannedMatchTransaction(entry);
		if (!candidate) {
			throw new Error('Invalid link candidates response');
		}
		candidates.push(candidate);
	}
	return candidates;
}

export async function resolvePlannedMatch(
	plannedId: string,
	transactionId: number | null,
	action: ResolvePlannedMatchAction
): Promise<void> {
	const payload: { action: ResolvePlannedMatchAction; transaction_id?: number } = {
		action,
	};
	if (transactionId !== null) {
		payload.transaction_id = transactionId;
	}
	await axios.post(`/api/planned-spending/${plannedId}/resolve-match`, payload);
}

export async function markPlannedComplete(plannedId: string): Promise<void> {
	await resolvePlannedMatch(plannedId, null, 'complete');
}

export type PlannedAmountType = 'spending' | 'income';

export function plannedAmountTypeFromCents(amountCents: number): PlannedAmountType {
	return amountCents < 0 ? 'spending' : 'income';
}

export function signedPlannedAmountCents(
	magnitudeCents: number,
	type: PlannedAmountType
): number {
	const magnitude = Math.abs(magnitudeCents);
	return type === 'spending' ? -magnitude : magnitude;
}

export function sanitizePositiveCurrencyInput(raw: string): string {
	let value = raw.replace(/-/g, '').replace(/[^\d.]/g, '');
	const dotIndex = value.indexOf('.');
	if (dotIndex >= 0) {
		const before = value.slice(0, dotIndex + 1);
		const after = value.slice(dotIndex + 1).replace(/\./g, '');
		value = before + after.slice(0, 2);
	}
	return value;
}

export function parsePlannedAmountInput(
	raw: string,
	currentType: PlannedAmountType
): { value: string; type: PlannedAmountType } {
	const trimmed = raw.trim();
	const flipType = trimmed.startsWith('-');
	const value = sanitizePositiveCurrencyInput(trimmed);
	return {
		value,
		type: flipType
			? currentType === 'spending'
				? 'income'
				: 'spending'
			: currentType,
	};
}

export function sanitizeCurrencyInput(raw: string): string {
	const trimmed = raw.trim();
	const negative = trimmed.startsWith('-');
	let value = trimmed.replace(/-/g, '').replace(/[^\d.]/g, '');
	const dotIndex = value.indexOf('.');
	if (dotIndex >= 0) {
		const before = value.slice(0, dotIndex + 1);
		const after = value.slice(dotIndex + 1).replace(/\./g, '');
		value = before + after.slice(0, 2);
	}
	if (negative) {
		return value.length > 0 ? `-${value}` : '-';
	}
	return value;
}

export function dollarsToCents(input: string): number | null {
	const trimmed = sanitizeCurrencyInput(input.trim());
	if (trimmed.length === 0 || trimmed === '-') {
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed) || parsed === 0) {
		return null;
	}
	return Math.round(parsed * 100);
}

export function centsToDollars(amountCents: number): string {
	return (amountCents / 100).toFixed(2);
}
