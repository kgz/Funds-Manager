import axios from 'axios';

export type FinancialAccount = {
	id: string;
	bank_name: string;
	display_name: string;
	account_number: string;
	parser_name: string;
	account_type: string | null;
	created_at: string;
	deleted_at: string | null;
	statement_count?: number;
};

export type FinancialAccountSummary = {
	id: number;
	bank_name: string;
	display_name: string;
	account_number: string;
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

function readFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	return undefined;
}

export function normalizeFinancialAccount(raw: unknown): FinancialAccount | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readIdAsString(Reflect.get(raw, 'id'));
	const bankName = readString(Reflect.get(raw, 'bank_name'));
	const displayName = readString(Reflect.get(raw, 'display_name'));
	const accountNumber = readString(Reflect.get(raw, 'account_number'));
	const parserName = readString(Reflect.get(raw, 'parser_name'));
	const accountType = readNullableString(Reflect.get(raw, 'account_type'));
	const createdAt = readString(Reflect.get(raw, 'created_at'));
	const deletedAt = readNullableString(Reflect.get(raw, 'deleted_at'));
	const statementCount = readFiniteNumber(Reflect.get(raw, 'statement_count'));

	if (
		id === null ||
		bankName === null ||
		displayName === null ||
		accountNumber === null ||
		parserName === null ||
		createdAt === null
	) {
		return null;
	}

	return {
		id,
		bank_name: bankName,
		display_name: displayName,
		account_number: accountNumber,
		parser_name: parserName,
		account_type: accountType,
		created_at: createdAt,
		deleted_at: deletedAt,
		statement_count: statementCount,
	};
}

export function normalizeFinancialAccountSummary(
	raw: unknown
): FinancialAccountSummary | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const id = readFiniteNumber(Reflect.get(raw, 'id'));
	const bankName = readString(Reflect.get(raw, 'bank_name'));
	const displayName = readString(Reflect.get(raw, 'display_name'));
	const accountNumber = readString(Reflect.get(raw, 'account_number'));

	if (
		id === undefined ||
		bankName === null ||
		displayName === null ||
		accountNumber === null
	) {
		return null;
	}

	return {
		id,
		bank_name: bankName,
		display_name: displayName,
		account_number: accountNumber,
	};
}

export function accountDisplayLabel(
	account: Pick<FinancialAccountSummary, 'display_name' | 'bank_name' | 'account_number'>
): string {
	if (account.display_name.trim().length > 0) {
		return account.display_name;
	}
	return `${account.bank_name} ${account.account_number}`;
}

export async function fetchAccounts(withStats = true): Promise<FinancialAccount[]> {
	const query = withStats ? '?with_stats=true' : '';
	const response = await axios.get(`/api/accounts${query}`);
	if (!Array.isArray(response.data)) {
		throw new Error('Invalid accounts response');
	}

	const accounts: FinancialAccount[] = [];
	for (const item of response.data) {
		const account = normalizeFinancialAccount(item);
		if (!account) {
			throw new Error('Invalid accounts response');
		}
		accounts.push(account);
	}
	return accounts;
}

export type UpdateAccountPayload = {
	display_name?: string;
	bank_name?: string;
};

export async function updateAccountFields(
	id: string,
	payload: UpdateAccountPayload
): Promise<FinancialAccount> {
	const response = await axios.put(`/api/accounts/${id}`, payload);
	const account = normalizeFinancialAccount(response.data);
	if (!account) {
		throw new Error('Invalid account response');
	}
	return account;
}
