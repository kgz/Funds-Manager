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
