import axios from 'axios';

export type LiabilityKind =
	| 'home_loan'
	| 'car_loan'
	| 'personal_loan'
	| 'credit_card'
	| 'bnpl'
	| 'hecs'
	| 'other';

export type LiabilityRateType = 'fixed' | 'variable';

export type LiabilityFrequency = 'weekly' | 'fortnightly' | 'monthly';

export type Liability = {
	id: string;
	name: string;
	kind: LiabilityKind;
	lender: string | null;
	balance_cents: number;
	credit_limit_cents: number | null;
	original_amount_cents: number | null;
	interest_rate_bps: number | null;
	rate_type: LiabilityRateType | null;
	repayment_cents: number | null;
	repayment_frequency: LiabilityFrequency | null;
	term_months: number | null;
	financial_account_id: string | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
};

export type LiabilityListResult = {
	items: Liability[];
	total_balance_cents: number;
};

export const LIABILITY_KIND_OPTIONS: { value: LiabilityKind; label: string }[] = [
	{ value: 'home_loan', label: 'Home loan' },
	{ value: 'car_loan', label: 'Car loan' },
	{ value: 'personal_loan', label: 'Personal loan' },
	{ value: 'credit_card', label: 'Credit card' },
	{ value: 'bnpl', label: 'Buy now, pay later' },
	{ value: 'hecs', label: 'HECS/HELP' },
	{ value: 'other', label: 'Other' },
];

export const LIABILITY_FREQUENCY_OPTIONS: { value: LiabilityFrequency; label: string }[] = [
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'fortnightly', label: 'Fortnightly' },
	{ value: 'monthly', label: 'Monthly' },
];

export function liabilityKindLabel(kind: LiabilityKind): string {
	const match = LIABILITY_KIND_OPTIONS.find((option) => option.value === kind);
	return match ? match.label : kind;
}

function isLiabilityKind(value: string): value is LiabilityKind {
	return (
		value === 'home_loan' ||
		value === 'car_loan' ||
		value === 'personal_loan' ||
		value === 'credit_card' ||
		value === 'bnpl' ||
		value === 'hecs' ||
		value === 'other'
	);
}

function isRateType(value: string): value is LiabilityRateType {
	return value === 'fixed' || value === 'variable';
}

function isFrequency(value: string): value is LiabilityFrequency {
	return value === 'weekly' || value === 'fortnightly' || value === 'monthly';
}

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null || value === undefined) {
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

function readNullableId(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	return readIdAsString(value);
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	return null;
}

function readNullableInt(value: unknown): number | null {
	const num = readFiniteNumber(value);
	return num === null ? null : Math.trunc(num);
}

export function normalizeLiability(raw: unknown): Liability | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readIdAsString(Reflect.get(raw, 'id'));
	const name = readString(Reflect.get(raw, 'name'));
	const kindRaw = readString(Reflect.get(raw, 'kind'));
	const balanceCents = readFiniteNumber(Reflect.get(raw, 'balance_cents'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));

	if (
		id === null ||
		name === null ||
		kindRaw === null ||
		!isLiabilityKind(kindRaw) ||
		balanceCents === null ||
		createdAt === null
	) {
		return null;
	}

	const rateTypeRaw = readNullableString(Reflect.get(raw, 'rate_type'));
	const rateType = rateTypeRaw !== null && isRateType(rateTypeRaw) ? rateTypeRaw : null;
	const frequencyRaw = readNullableString(Reflect.get(raw, 'repayment_frequency'));
	const repaymentFrequency =
		frequencyRaw !== null && isFrequency(frequencyRaw) ? frequencyRaw : null;

	return {
		id,
		name,
		kind: kindRaw,
		lender: readNullableString(Reflect.get(raw, 'lender')),
		balance_cents: Math.trunc(balanceCents),
		credit_limit_cents: readNullableInt(Reflect.get(raw, 'credit_limit_cents')),
		original_amount_cents: readNullableInt(Reflect.get(raw, 'original_amount_cents')),
		interest_rate_bps: readNullableInt(Reflect.get(raw, 'interest_rate_bps')),
		rate_type: rateType,
		repayment_cents: readNullableInt(Reflect.get(raw, 'repayment_cents')),
		repayment_frequency: repaymentFrequency,
		term_months: readNullableInt(Reflect.get(raw, 'term_months')),
		financial_account_id: readNullableId(Reflect.get(raw, 'financial_account_id')),
		notes: readNullableString(Reflect.get(raw, 'notes')),
		created_at: createdAt,
		deleted_at: readNullableString(Reflect.get(raw, 'deleted_at')),
	};
}

export function normalizeLiabilityList(raw: unknown): LiabilityListResult {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid liabilities response');
	}

	const itemsRaw = Reflect.get(raw, 'items');
	const totalBalanceCents = readFiniteNumber(Reflect.get(raw, 'total_balance_cents'));
	if (!Array.isArray(itemsRaw) || totalBalanceCents === null) {
		throw new Error('Invalid liabilities response');
	}

	const items: Liability[] = [];
	for (const entry of itemsRaw) {
		const item = normalizeLiability(entry);
		if (!item) {
			throw new Error('Invalid liabilities response');
		}
		items.push(item);
	}

	return {
		items,
		total_balance_cents: Math.trunc(totalBalanceCents),
	};
}

export type LiabilityWritePayload = {
	name: string;
	kind: LiabilityKind;
	lender?: string | null;
	balance_cents: number;
	credit_limit_cents?: number | null;
	original_amount_cents?: number | null;
	interest_rate_bps?: number | null;
	rate_type?: LiabilityRateType | null;
	repayment_cents?: number | null;
	repayment_frequency?: LiabilityFrequency | null;
	term_months?: number | null;
	financial_account_id?: number | null;
	notes?: string | null;
};

export async function fetchLiabilities(): Promise<LiabilityListResult> {
	const response = await axios.get('/api/liabilities');
	return normalizeLiabilityList(response.data);
}

export async function createLiability(payload: LiabilityWritePayload): Promise<Liability> {
	const response = await axios.post('/api/liabilities', payload);
	const item = normalizeLiability(response.data);
	if (!item) {
		throw new Error('Invalid liabilities response');
	}
	return item;
}

export async function updateLiability(
	id: string,
	payload: LiabilityWritePayload
): Promise<Liability> {
	const response = await axios.put(`/api/liabilities/${id}`, payload);
	const item = normalizeLiability(response.data);
	if (!item) {
		throw new Error('Invalid liabilities response');
	}
	return item;
}

export async function deleteLiabilityItem(id: string): Promise<void> {
	await axios.delete(`/api/liabilities/${id}`);
}

export function formatCentsAsDollars(amountCents: number): string {
	return (amountCents / 100).toFixed(2);
}

export function parsePositiveDollarsToCents(input: string): number | null {
	const trimmed = input.trim().replace(/[^\d.]/g, '');
	if (trimmed.length === 0) {
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return Math.round(parsed * 100);
}

export function bpsToPercentText(bps: number): string {
	return (bps / 100).toFixed(2);
}

export function parsePercentToBps(input: string): number | null {
	const trimmed = input.trim().replace(/[^\d.]/g, '');
	if (trimmed.length === 0) {
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	return Math.round(parsed * 100);
}
