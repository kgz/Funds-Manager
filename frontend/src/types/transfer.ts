export type TransferTransactionSummary = {
	id: number;
	description: string;
	amount: number;
	transactionDate: string;
	accountLabel: string;
};

export type TransferSuggestion = {
	outTransaction: TransferTransactionSummary;
	inTransaction: TransferTransactionSummary;
	dayGap: number;
	keywordMatch: boolean;
};

function readString(value: unknown): string | null {
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

function readBoolean(value: unknown): boolean | null {
	if (typeof value === 'boolean') {
		return value;
	}
	return null;
}

function normalizeTransferTransactionSummary(
	raw: unknown
): TransferTransactionSummary | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const id = readFiniteNumber(Reflect.get(raw, 'id'));
	const description = readString(Reflect.get(raw, 'description'));
	const amount = readFiniteNumber(Reflect.get(raw, 'amount'));
	const transactionDate = readString(Reflect.get(raw, 'transactionDate'));
	const accountLabel = readString(Reflect.get(raw, 'accountLabel'));

	if (
		id === null ||
		description === null ||
		amount === null ||
		transactionDate === null ||
		accountLabel === null
	) {
		return null;
	}

	return { id, description, amount, transactionDate, accountLabel };
}

export function normalizeTransferSuggestion(raw: unknown): TransferSuggestion | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const outTransaction = normalizeTransferTransactionSummary(
		Reflect.get(raw, 'outTransaction')
	);
	const inTransaction = normalizeTransferTransactionSummary(
		Reflect.get(raw, 'inTransaction')
	);
	const dayGap = readFiniteNumber(Reflect.get(raw, 'dayGap'));
	const keywordMatch = readBoolean(Reflect.get(raw, 'keywordMatch'));

	if (
		outTransaction === null ||
		inTransaction === null ||
		dayGap === null ||
		keywordMatch === null
	) {
		return null;
	}

	return { outTransaction, inTransaction, dayGap, keywordMatch };
}

export async function fetchTransferSuggestions(
	accountId?: number
): Promise<TransferSuggestion[]> {
	const params = new URLSearchParams();
	if (accountId !== undefined) {
		params.set('account_id', String(accountId));
	}
	const query = params.toString();
	const response = await fetch(
		query.length > 0 ? `/api/transfers/suggestions?${query}` : '/api/transfers/suggestions'
	);
	if (!response.ok) {
		throw new Error('Failed to load transfer suggestions');
	}
	const payload: unknown = await response.json();
	if (!Array.isArray(payload)) {
		return [];
	}
	return payload
		.map((row) => normalizeTransferSuggestion(row))
		.filter((row): row is TransferSuggestion => row !== null);
}

export async function confirmTransferPair(
	outTransactionId: number,
	inTransactionId: number
): Promise<void> {
	const response = await fetch('/api/transfers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			out_transaction_id: outTransactionId,
			in_transaction_id: inTransactionId,
		}),
	});
	if (!response.ok) {
		throw new Error('Failed to confirm transfer');
	}
}

export async function dismissTransferPair(
	outTransactionId: number,
	inTransactionId: number
): Promise<void> {
	const response = await fetch('/api/transfers/dismiss', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			out_transaction_id: outTransactionId,
			in_transaction_id: inTransactionId,
		}),
	});
	if (!response.ok) {
		throw new Error('Failed to dismiss transfer');
	}
}
