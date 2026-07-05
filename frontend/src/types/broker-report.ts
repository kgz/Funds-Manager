import axios from 'axios';
import {
	normalizePayloadFromDetail,
	type ReportSnapshotPayload,
} from '@/types/report-snapshots';

export type ReportRedaction = {
	hideAccountNumbers: boolean;
	hiddenMerchantPatterns: string[];
};

export type BrokerReportShare = {
	id: number;
	token: string;
	urlPath: string;
	redaction: ReportRedaction;
	createdAt: string;
};

export type BrokerReportAnnotation = {
	id: number;
	transactionId: number;
	transactionDescription: string;
	transactionDate: string;
	transactionAmount: number;
	note: string;
	excludeFromAnalysis: boolean;
	createdAt: string;
};

export type PublicBrokerReportSnapshotMeta = {
	id: number;
	name: string;
	asAt: string;
	startDate: string;
	endDate: string;
	createdAt: string;
};

export type PublicBrokerReport = {
	snapshot: PublicBrokerReportSnapshotMeta;
	payload: ReportSnapshotPayload;
	annotations: BrokerReportAnnotation[];
	redaction: ReportRedaction;
	disclaimer: string;
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

function readBoolean(value: unknown): boolean | null {
	return typeof value === 'boolean' ? value : null;
}

function readOptionalField(raw: object, camelKey: string, snakeKey: string): unknown {
	if (Reflect.has(raw, camelKey)) {
		return Reflect.get(raw, camelKey);
	}
	return Reflect.get(raw, snakeKey);
}

function normalizeRedaction(raw: unknown): ReportRedaction {
	if (!raw || typeof raw !== 'object') {
		return { hideAccountNumbers: true, hiddenMerchantPatterns: [] };
	}
	const hideAccountNumbers = readBoolean(
		readOptionalField(raw, 'hideAccountNumbers', 'hide_account_numbers')
	);
	const patternsRaw = readOptionalField(
		raw,
		'hiddenMerchantPatterns',
		'hidden_merchant_patterns'
	);
	const hiddenMerchantPatterns: string[] = [];
	if (Array.isArray(patternsRaw)) {
		for (const entry of patternsRaw) {
			if (typeof entry === 'string' && entry.trim().length > 0) {
				hiddenMerchantPatterns.push(entry.trim());
			}
		}
	}
	return {
		hideAccountNumbers: hideAccountNumbers ?? true,
		hiddenMerchantPatterns,
	};
}

function normalizeShare(raw: unknown): BrokerReportShare | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(readOptionalField(raw, 'id', 'id'));
	const token = readString(readOptionalField(raw, 'token', 'token'));
	const urlPath = readString(readOptionalField(raw, 'urlPath', 'url_path'));
	const createdAt = readString(readOptionalField(raw, 'createdAt', 'created_at'));
	if (id === null || token === null || urlPath === null || createdAt === null) {
		return null;
	}
	return {
		id: Math.trunc(id),
		token,
		urlPath,
		redaction: normalizeRedaction(readOptionalField(raw, 'redaction', 'redaction')),
		createdAt,
	};
}

function normalizeAnnotation(raw: unknown): BrokerReportAnnotation | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(readOptionalField(raw, 'id', 'id'));
	const transactionId = readFiniteNumber(
		readOptionalField(raw, 'transactionId', 'transaction_id')
	);
	const transactionDescription = readString(
		readOptionalField(raw, 'transactionDescription', 'transaction_description')
	);
	const transactionDate = readString(
		readOptionalField(raw, 'transactionDate', 'transaction_date')
	);
	const transactionAmount = readFiniteNumber(
		readOptionalField(raw, 'transactionAmount', 'transaction_amount')
	);
	const note = readString(readOptionalField(raw, 'note', 'note'));
	const excludeFromAnalysis = readBoolean(
		readOptionalField(raw, 'excludeFromAnalysis', 'exclude_from_analysis')
	);
	const createdAt = readString(readOptionalField(raw, 'createdAt', 'created_at'));
	if (
		id === null ||
		transactionId === null ||
		transactionDescription === null ||
		transactionDate === null ||
		transactionAmount === null ||
		note === null ||
		excludeFromAnalysis === null ||
		createdAt === null
	) {
		return null;
	}
	return {
		id: Math.trunc(id),
		transactionId: Math.trunc(transactionId),
		transactionDescription,
		transactionDate: transactionDate.slice(0, 10),
		transactionAmount: Math.trunc(transactionAmount),
		note,
		excludeFromAnalysis,
		createdAt,
	};
}

function normalizePublicReport(raw: unknown): PublicBrokerReport | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const snapshotRaw = readOptionalField(raw, 'snapshot', 'snapshot');
	const payloadRaw = readOptionalField(raw, 'payload', 'payload');
	const disclaimer = readString(readOptionalField(raw, 'disclaimer', 'disclaimer'));
	if (!snapshotRaw || typeof snapshotRaw !== 'object' || disclaimer === null) {
		return null;
	}
	const snapshotId = readFiniteNumber(readOptionalField(snapshotRaw, 'id', 'id'));
	const name = readString(readOptionalField(snapshotRaw, 'name', 'name'));
	const asAt = readString(readOptionalField(snapshotRaw, 'asAt', 'as_at'));
	const startDate = readString(readOptionalField(snapshotRaw, 'startDate', 'start_date'));
	const endDate = readString(readOptionalField(snapshotRaw, 'endDate', 'end_date'));
	const createdAt = readString(readOptionalField(snapshotRaw, 'createdAt', 'created_at'));
	const payload = normalizePayloadFromDetail(payloadRaw);
	if (
		snapshotId === null ||
		name === null ||
		asAt === null ||
		startDate === null ||
		endDate === null ||
		createdAt === null ||
		payload === null
	) {
		return null;
	}
	const annotationsRaw = readOptionalField(raw, 'annotations', 'annotations');
	const annotations: BrokerReportAnnotation[] = [];
	if (Array.isArray(annotationsRaw)) {
		for (const entry of annotationsRaw) {
			const item = normalizeAnnotation(entry);
			if (item) {
				annotations.push(item);
			}
		}
	}
	return {
		snapshot: {
			id: Math.trunc(snapshotId),
			name,
			asAt,
			startDate,
			endDate,
			createdAt,
		},
		payload,
		annotations,
		redaction: normalizeRedaction(readOptionalField(raw, 'redaction', 'redaction')),
		disclaimer,
	};
}

export async function fetchBrokerReportShares(
	snapshotId: number
): Promise<BrokerReportShare[]> {
	const response = await axios.get(`/api/report-snapshots/${snapshotId}/shares`);
	if (!Array.isArray(response.data)) {
		return [];
	}
	const items: BrokerReportShare[] = [];
	for (const entry of response.data) {
		const item = normalizeShare(entry);
		if (item) {
			items.push(item);
		}
	}
	return items;
}

export async function createBrokerReportShare(
	snapshotId: number,
	redaction: ReportRedaction
): Promise<BrokerReportShare> {
	const response = await axios.post(`/api/report-snapshots/${snapshotId}/shares`, redaction);
	const item = normalizeShare(response.data);
	if (!item) {
		throw new Error('Invalid share response');
	}
	return item;
}

export async function revokeBrokerReportShare(
	snapshotId: number,
	shareId: number
): Promise<void> {
	await axios.delete(`/api/report-snapshots/${snapshotId}/shares/${shareId}`);
}

export async function fetchBrokerReportAnnotations(
	snapshotId: number
): Promise<BrokerReportAnnotation[]> {
	const response = await axios.get(`/api/report-snapshots/${snapshotId}/annotations`);
	if (!Array.isArray(response.data)) {
		return [];
	}
	const items: BrokerReportAnnotation[] = [];
	for (const entry of response.data) {
		const item = normalizeAnnotation(entry);
		if (item) {
			items.push(item);
		}
	}
	return items;
}

export async function createBrokerReportAnnotation(
	snapshotId: number,
	input: {
		transactionId: number;
		note: string;
		excludeFromAnalysis: boolean;
	}
): Promise<BrokerReportAnnotation> {
	const response = await axios.post(`/api/report-snapshots/${snapshotId}/annotations`, {
		transactionId: input.transactionId,
		note: input.note,
		excludeFromAnalysis: input.excludeFromAnalysis,
	});
	const item = normalizeAnnotation(response.data);
	if (!item) {
		throw new Error('Invalid annotation response');
	}
	return item;
}

export async function deleteBrokerReportAnnotation(
	snapshotId: number,
	annotationId: number
): Promise<void> {
	await axios.delete(`/api/report-snapshots/${snapshotId}/annotations/${annotationId}`);
}

export async function fetchPublicBrokerReport(token: string): Promise<PublicBrokerReport> {
	const response = await axios.get(`/api/public/broker-reports/${token}`);
	const report = normalizePublicReport(response.data);
	if (!report) {
		throw new Error('Invalid report response');
	}
	return report;
}

export function shareUrl(urlPath: string): string {
	const base = window.location.origin;
	const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
	return `${base}${path}`;
}
