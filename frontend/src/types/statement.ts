import axios from 'axios';
import {
	normalizeFinancialAccountSummary,
	type FinancialAccountSummary,
} from '@/types/account';

export type Statement = {
	id: number;
	date: string;
	account_id: string;
	opening_balance: number;
	closing_balance: number;
	deleted_at: string | null;
	created_at: string;
	financial_account?: FinancialAccountSummary | null;
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
	accountId?: number | null;
	sortBy?: keyof Statement | null;
	sortDir?: 'asc' | 'desc';
};

export function statementSortApiKey(
	sortBy: keyof Statement | null | undefined
): string | undefined {
	if (sortBy === null || sortBy === undefined) {
		return undefined;
	}
	if (sortBy === 'financial_account') {
		return 'account';
	}
	return String(sortBy);
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
	const financialAccountRaw = Reflect.get(raw, 'financial_account');
	const financialAccount =
		financialAccountRaw === undefined || financialAccountRaw === null
			? null
			: normalizeFinancialAccountSummary(financialAccountRaw);

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
		financial_account: financialAccount,
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
	if (params.accountId != null) {
		searchParams.set('account_id', String(params.accountId));
	}
	const sortBy = statementSortApiKey(params.sortBy);
	if (sortBy) {
		searchParams.set('sort_by', sortBy);
	}
	if (params.sortDir) {
		searchParams.set('sort_dir', params.sortDir);
	}

	const response = await axios.get(`/api/statements?${searchParams.toString()}`, {
		signal: params.signal,
	});
	const parsed = parsePaginatedStatementsPayload(response.data);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	return parsed;
}

export type StatementPreviewFile = {
	filename: string;
	account_id: string;
	statement_date: string;
	period_label: string;
	conflict: boolean;
	existing_statement_id: number | null;
};

export type StatementPreviewResponse = {
	files: StatementPreviewFile[];
	errors: string[];
};

export type StatementUploadResponse = {
	processed_files: string[];
	errors: string[];
};

function parsePreviewFile(raw: unknown): StatementPreviewFile | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const filename = readString(Reflect.get(raw, 'filename'));
	const accountId = readString(Reflect.get(raw, 'account_id'));
	const statementDate = readString(Reflect.get(raw, 'statement_date'));
	const periodLabel = readString(Reflect.get(raw, 'period_label'));
	const conflict = Reflect.get(raw, 'conflict');
	const existingId = Reflect.get(raw, 'existing_statement_id');

	if (
		filename === null ||
		accountId === null ||
		statementDate === null ||
		periodLabel === null ||
		typeof conflict !== 'boolean'
	) {
		return null;
	}

	let existingStatementId: number | null = null;
	if (existingId !== null) {
		existingStatementId = readFiniteNumber(existingId);
	}

	return {
		filename,
		account_id: accountId,
		statement_date: statementDate,
		period_label: periodLabel,
		conflict,
		existing_statement_id: existingStatementId,
	};
}

function parseUploadResponse(payload: unknown): StatementUploadResponse | string {
	if (!payload || typeof payload !== 'object') {
		return 'Invalid upload response';
	}
	const processedRaw = Reflect.get(payload, 'processed_files');
	const errorsRaw = Reflect.get(payload, 'errors');
	if (!Array.isArray(processedRaw) || !Array.isArray(errorsRaw)) {
		return 'Invalid upload response';
	}
	const processed_files: string[] = [];
	for (const item of processedRaw) {
		if (typeof item !== 'string') {
			return 'Invalid upload response';
		}
		processed_files.push(item);
	}
	const errors: string[] = [];
	for (const item of errorsRaw) {
		if (typeof item !== 'string') {
			return 'Invalid upload response';
		}
		errors.push(item);
	}
	return { processed_files, errors };
}

function buildStatementFormData(files: File[]): FormData {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}
	return formData;
}

export async function previewStatementUpload(files: File[]): Promise<StatementPreviewResponse> {
	const response = await fetch('/api/statements?preview=true', {
		method: 'POST',
		body: buildStatementFormData(files),
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok || payload === null || typeof payload !== 'object') {
		throw new Error('Failed to preview statement upload');
	}
	const errorsRaw = Reflect.get(payload, 'errors');
	const filesRaw = Reflect.get(payload, 'files');
	if (!Array.isArray(errorsRaw) || !Array.isArray(filesRaw)) {
		throw new Error('Invalid preview response');
	}
	const errors: string[] = [];
	for (const item of errorsRaw) {
		if (typeof item !== 'string') {
			throw new Error('Invalid preview response');
		}
		errors.push(item);
	}
	const previewFiles: StatementPreviewFile[] = [];
	for (const item of filesRaw) {
		const parsed = parsePreviewFile(item);
		if (!parsed) {
			throw new Error('Invalid preview response');
		}
		previewFiles.push(parsed);
	}
	return { files: previewFiles, errors };
}

export async function uploadStatementFiles(
	files: File[],
	options: { replace: boolean }
): Promise<StatementUploadResponse> {
	const params = new URLSearchParams();
	if (options.replace) {
		params.set('replace', 'true');
	}
	const query = params.toString();
	const url = query.length > 0 ? `/api/statements?${query}` : '/api/statements';
	const response = await fetch(url, {
		method: 'POST',
		body: buildStatementFormData(files),
	});
	const payload: unknown = await response.json().catch(() => null);
	if (payload === null) {
		throw new Error(`Upload failed with status: ${response.status}`);
	}
	const parsed = parseUploadResponse(payload);
	if (typeof parsed === 'string') {
		throw new Error(parsed);
	}
	if (!response.ok && parsed.processed_files.length === 0) {
		throw new Error(parsed.errors[0] ?? `Upload failed with status: ${response.status}`);
	}
	return parsed;
}

export type MissingStatementPeriod = {
	account_label: string;
	period: string;
};

function normalizeMissingStatementPeriod(raw: unknown): MissingStatementPeriod | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const accountLabel = Reflect.get(raw, 'account_label');
	const period = Reflect.get(raw, 'period');
	if (typeof accountLabel !== 'string' || typeof period !== 'string') {
		return null;
	}
	return { account_label: accountLabel, period };
}

export async function fetchMissingStatementPeriods(
	accountId?: number | null,
	signal?: AbortSignal
): Promise<MissingStatementPeriod[]> {
	const params =
		accountId != null ? { account_id: accountId } : undefined;
	const response = await axios.get('/api/statements/missing-periods', {
		params,
		signal,
	});
	const data = response.data as { periods?: unknown };
	if (!data || !Array.isArray(data.periods)) {
		throw new Error('Invalid missing periods response');
	}
	const periods: MissingStatementPeriod[] = [];
	for (const item of data.periods) {
		const period = normalizeMissingStatementPeriod(item);
		if (!period) {
			throw new Error('Invalid missing periods response');
		}
		periods.push(period);
	}
	return periods;
}
