import axios from 'axios';
import {
	normalizeReportCoverageSummary,
	type ReportCoverageSummaryResponse,
} from '@/types/report-coverage';
import {
	normalizeIncomeSummary,
	type IncomeSummaryResponse,
} from '@/types/income';
import {
	normalizeLenderExpenseSummary,
	type LenderExpenseSummaryResponse,
} from '@/types/lender-expenses';
import {
	normalizeServiceabilitySummary,
	type ServiceabilitySummaryResponse,
} from '@/types/serviceability';

export type ReportSnapshotListItem = {
	id: number;
	name: string;
	asAt: string;
	startDate: string;
	endDate: string;
	accountId: number | null;
	rateBufferBps: number;
	createdAt: string;
};

export type ReportSnapshotNetWorth = {
	points: Array<{
		date: string;
		availableCash: number;
		assets: number;
		liabilities: number;
		netWorth: number;
	}>;
	latest: {
		date: string;
		availableCash: number;
		assets: number;
		liabilities: number;
		netWorth: number;
	} | null;
};

export type ReportSnapshotPayload = {
	version: number;
	accounts: Array<{
		id: number;
		bankName: string;
		displayName: string;
	}>;
	income: IncomeSummaryResponse;
	lenderExpenses: LenderExpenseSummaryResponse;
	serviceability: ServiceabilitySummaryResponse;
	assets: {
		totalValueCents: number;
		items: unknown[];
	};
	liabilities: {
		totalBalanceCents: number;
		items: unknown[];
	};
	netWorth: ReportSnapshotNetWorth;
	coverage: ReportCoverageSummaryResponse | null;
};

export type ReportSnapshotDetail = {
	id: number;
	name: string;
	asAt: string;
	startDate: string;
	endDate: string;
	accountId: number | null;
	rateBufferBps: number;
	createdAt: string;
	payload: ReportSnapshotPayload;
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

function readOptionalField(raw: object, camelKey: string, snakeKey: string): unknown {
	if (Reflect.has(raw, camelKey)) {
		return Reflect.get(raw, camelKey);
	}
	return Reflect.get(raw, snakeKey);
}

function normalizeNetWorthPoint(raw: unknown): ReportSnapshotNetWorth['points'][number] | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const date = readString(readOptionalField(raw, 'date', 'date'));
	const availableCash = readFiniteNumber(
		readOptionalField(raw, 'availableCash', 'available_cash')
	);
	const assets = readFiniteNumber(readOptionalField(raw, 'assets', 'assets'));
	const liabilities = readFiniteNumber(
		readOptionalField(raw, 'liabilities', 'liabilities')
	);
	const netWorth = readFiniteNumber(readOptionalField(raw, 'netWorth', 'net_worth'));
	if (
		date === null ||
		availableCash === null ||
		assets === null ||
		liabilities === null ||
		netWorth === null
	) {
		return null;
	}
	return { date, availableCash, assets, liabilities, netWorth };
}

function normalizeListItem(raw: unknown): ReportSnapshotListItem | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(readOptionalField(raw, 'id', 'id'));
	const name = readString(readOptionalField(raw, 'name', 'name'));
	const asAt = readString(readOptionalField(raw, 'asAt', 'as_at'));
	const startDate = readString(readOptionalField(raw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(raw, 'endDate', 'end_date'));
	const accountIdRaw = readOptionalField(raw, 'accountId', 'account_id');
	const accountId =
		accountIdRaw === null || accountIdRaw === undefined
			? null
			: readFiniteNumber(accountIdRaw);
	const rateBufferBps = readFiniteNumber(
		readOptionalField(raw, 'rateBufferBps', 'rate_buffer_bps')
	);
	const createdAt = readString(readOptionalField(raw, 'createdAt', 'created_at'));
	if (
		id === null ||
		name === null ||
		asAt === null ||
		startDate === null ||
		endDate === null ||
		rateBufferBps === null ||
		createdAt === null
	) {
		return null;
	}
	return {
		id: Math.trunc(id),
		name,
		asAt,
		startDate,
		endDate,
		accountId: accountId === null ? null : Math.trunc(accountId),
		rateBufferBps: Math.trunc(rateBufferBps),
		createdAt,
	};
}

export function normalizePayloadFromDetail(raw: unknown): ReportSnapshotPayload | null {
	return normalizePayload(raw);
}

function normalizePayload(raw: unknown): ReportSnapshotPayload | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const version = readFiniteNumber(readOptionalField(raw, 'version', 'version'));
	const serviceabilityRaw = readOptionalField(raw, 'serviceability', 'serviceability');
	const serviceability = normalizeServiceabilitySummary(serviceabilityRaw);
	const incomeRaw = readOptionalField(raw, 'income', 'income');
	const lenderExpensesRaw = readOptionalField(raw, 'lenderExpenses', 'lender_expenses');
	const income = normalizeIncomeSummary(incomeRaw);
	const lenderExpenses = normalizeLenderExpenseSummary(lenderExpensesRaw);
	const assetsRaw = readOptionalField(raw, 'assets', 'assets');
	const liabilitiesRaw = readOptionalField(raw, 'liabilities', 'liabilities');
	const netWorthRaw = readOptionalField(raw, 'netWorth', 'net_worth');
	const accountsRaw = readOptionalField(raw, 'accounts', 'accounts');
	if (
		version === null ||
		serviceability === null ||
		income === null ||
		lenderExpenses === null ||
		!assetsRaw ||
		typeof assetsRaw !== 'object' ||
		!liabilitiesRaw ||
		typeof liabilitiesRaw !== 'object' ||
		!netWorthRaw ||
		typeof netWorthRaw !== 'object' ||
		!Array.isArray(accountsRaw)
	) {
		return null;
	}
	const assetsTotal = readFiniteNumber(
		readOptionalField(assetsRaw, 'totalValueCents', 'total_value_cents')
	);
	const liabilitiesTotal = readFiniteNumber(
		readOptionalField(liabilitiesRaw, 'totalBalanceCents', 'total_balance_cents')
	);
	const pointsRaw = readOptionalField(netWorthRaw, 'points', 'points');
	const latestRaw = readOptionalField(netWorthRaw, 'latest', 'latest');
	if (
		assetsTotal === null ||
		liabilitiesTotal === null ||
		!Array.isArray(pointsRaw)
	) {
		return null;
	}
	const points: ReportSnapshotNetWorth['points'] = [];
	for (const entry of pointsRaw) {
		const point = normalizeNetWorthPoint(entry);
		if (point) {
			points.push(point);
		}
	}
	const latest =
		latestRaw === null || latestRaw === undefined
			? null
			: normalizeNetWorthPoint(latestRaw);
	const accounts: ReportSnapshotPayload['accounts'] = [];
	for (const entry of accountsRaw) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const id = readFiniteNumber(readOptionalField(entry, 'id', 'id'));
		const bankName = readString(readOptionalField(entry, 'bankName', 'bank_name'));
		const displayName = readString(readOptionalField(entry, 'displayName', 'display_name'));
		if (id === null || bankName === null || displayName === null) {
			continue;
		}
		accounts.push({
			id: Math.trunc(id),
			bankName,
			displayName,
		});
	}
	const assetItemsRaw = readOptionalField(assetsRaw, 'items', 'items');
	const liabilityItemsRaw = readOptionalField(liabilitiesRaw, 'items', 'items');
	const coverageRaw = readOptionalField(raw, 'coverage', 'coverage');
	const coverage =
		coverageRaw === null || coverageRaw === undefined
			? null
			: normalizeReportCoverageSummary(coverageRaw);
	return {
		version: Math.trunc(version),
		accounts,
		income,
		lenderExpenses,
		serviceability,
		assets: {
			totalValueCents: Math.trunc(assetsTotal),
			items: Array.isArray(assetItemsRaw) ? assetItemsRaw : [],
		},
		liabilities: {
			totalBalanceCents: Math.trunc(liabilitiesTotal),
			items: Array.isArray(liabilityItemsRaw) ? liabilityItemsRaw : [],
		},
		netWorth: { points, latest },
		coverage,
	};
}

function normalizeDetail(raw: unknown): ReportSnapshotDetail | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const listFields = normalizeListItem(raw);
	const payloadRaw = readOptionalField(raw, 'payload', 'payload');
	if (!listFields || payloadRaw === undefined) {
		return null;
	}
	const payload = normalizePayload(payloadRaw);
	if (!payload) {
		return null;
	}
	return { ...listFields, payload };
}

export async function fetchReportSnapshots(): Promise<ReportSnapshotListItem[]> {
	const response = await axios.get('/api/report-snapshots');
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid report snapshots list response');
	}
	const items: ReportSnapshotListItem[] = [];
	for (const entry of response.data) {
		const item = normalizeListItem(entry);
		if (item) {
			items.push(item);
		}
	}
	return items;
}

export async function fetchReportSnapshot(id: number): Promise<ReportSnapshotDetail> {
	const response = await axios.get(`/api/report-snapshots/${id}`);
	const detail = normalizeDetail(response.data);
	if (!detail) {
		throw new Error('Invalid report snapshot response');
	}
	return detail;
}

export type CreateReportSnapshotInput = {
	name: string;
	asAt?: string;
	startDate: string;
	endDate: string;
	accountId?: number | null;
	rateBufferBps?: number;
	minOccurrences?: number;
};

export async function createReportSnapshot(
	input: CreateReportSnapshotInput
): Promise<ReportSnapshotDetail> {
	const response = await axios.post('/api/report-snapshots', input);
	const detail = normalizeDetail(response.data);
	if (!detail) {
		throw new Error('Invalid create report snapshot response');
	}
	return detail;
}

export async function deleteReportSnapshot(id: number): Promise<void> {
	await axios.delete(`/api/report-snapshots/${id}`);
}
