import axios from 'axios';

export type AssetKind =
	| 'property'
	| 'vehicle'
	| 'super'
	| 'savings'
	| 'investment'
	| 'other';

export type Asset = {
	id: string;
	name: string;
	kind: AssetKind;
	value_cents: number;
	valued_at: string | null;
	value_source: string | null;
	liability_id: string | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
};

export type AssetListResult = {
	items: Asset[];
	total_value_cents: number;
};

export const ASSET_KIND_OPTIONS: { value: AssetKind; label: string }[] = [
	{ value: 'property', label: 'Property' },
	{ value: 'vehicle', label: 'Vehicle' },
	{ value: 'super', label: 'Superannuation' },
	{ value: 'savings', label: 'Savings (external)' },
	{ value: 'investment', label: 'Investment' },
	{ value: 'other', label: 'Other' },
];

export function assetKindLabel(kind: AssetKind): string {
	const match = ASSET_KIND_OPTIONS.find((option) => option.value === kind);
	return match ? match.label : kind;
}

function isAssetKind(value: string): value is AssetKind {
	return (
		value === 'property' ||
		value === 'vehicle' ||
		value === 'super' ||
		value === 'savings' ||
		value === 'investment' ||
		value === 'other'
	);
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

export function normalizeAsset(raw: unknown): Asset | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readIdAsString(Reflect.get(raw, 'id'));
	const name = readString(Reflect.get(raw, 'name'));
	const kindRaw = readString(Reflect.get(raw, 'kind'));
	const valueCents = readFiniteNumber(Reflect.get(raw, 'value_cents'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));

	if (
		id === null ||
		name === null ||
		kindRaw === null ||
		!isAssetKind(kindRaw) ||
		valueCents === null ||
		createdAt === null
	) {
		return null;
	}

	return {
		id,
		name,
		kind: kindRaw,
		value_cents: Math.trunc(valueCents),
		valued_at: readNullableString(Reflect.get(raw, 'valued_at')),
		value_source: readNullableString(Reflect.get(raw, 'value_source')),
		liability_id: readNullableId(Reflect.get(raw, 'liability_id')),
		notes: readNullableString(Reflect.get(raw, 'notes')),
		created_at: createdAt,
		deleted_at: readNullableString(Reflect.get(raw, 'deleted_at')),
	};
}

export function normalizeAssetList(raw: unknown): AssetListResult {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Invalid assets response');
	}

	const itemsRaw = Reflect.get(raw, 'items');
	const totalValueCents = readFiniteNumber(Reflect.get(raw, 'total_value_cents'));
	if (!Array.isArray(itemsRaw) || totalValueCents === null) {
		throw new Error('Invalid assets response');
	}

	const items: Asset[] = [];
	for (const entry of itemsRaw) {
		const item = normalizeAsset(entry);
		if (!item) {
			throw new Error('Invalid assets response');
		}
		items.push(item);
	}

	return {
		items,
		total_value_cents: Math.trunc(totalValueCents),
	};
}

export type AssetWritePayload = {
	name: string;
	kind: AssetKind;
	value_cents: number;
	valued_at?: string | null;
	value_source?: string | null;
	liability_id?: number | null;
	notes?: string | null;
};

export async function fetchAssets(): Promise<AssetListResult> {
	const response = await axios.get('/api/assets');
	return normalizeAssetList(response.data);
}

export async function createAsset(payload: AssetWritePayload): Promise<Asset> {
	const response = await axios.post('/api/assets', payload);
	const item = normalizeAsset(response.data);
	if (!item) {
		throw new Error('Invalid assets response');
	}
	return item;
}

export async function updateAsset(id: string, payload: AssetWritePayload): Promise<Asset> {
	const response = await axios.put(`/api/assets/${id}`, payload);
	const item = normalizeAsset(response.data);
	if (!item) {
		throw new Error('Invalid assets response');
	}
	return item;
}

export async function deleteAssetItem(id: string): Promise<void> {
	await axios.delete(`/api/assets/${id}`);
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

export function isValuationStale(valuedAt: string | null): boolean {
	if (!valuedAt) {
		return true;
	}
	const valued = new Date(valuedAt);
	if (Number.isNaN(valued.getTime())) {
		return true;
	}
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - 12);
	return valued.getTime() < cutoff.getTime();
}
