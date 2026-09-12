import type { Page, Route } from '@playwright/test';

export type MockAccount = {
	id: string;
	bank_name: string;
	display_name: string;
	account_number: string;
	parser_name: string;
	account_type: string | null;
	created_at: string;
	deleted_at: string | null;
	statement_count: number;
	last_known_balance: number | null;
	last_known_balance_date: string | null;
};

export const SEED_ACCOUNTS: MockAccount[] = [
	{
		id: '1',
		bank_name: 'CBA',
		display_name: 'Everyday',
		account_number: '062-000 12345678',
		parser_name: 'heritage',
		account_type: 'transaction',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 4,
		last_known_balance: 12_450.32,
		last_known_balance_date: '2026-08-15',
	},
	{
		id: '2',
		bank_name: 'BankSA',
		display_name: 'Offset',
		account_number: '105-000 987654',
		parser_name: 'heritage',
		account_type: 'offset',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 3,
		last_known_balance: 48_250.0,
		last_known_balance_date: '2026-08-20',
	},
];

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

export async function installAccountsMocks(
	page: Page,
	seed: MockAccount[] = SEED_ACCOUNTS
): Promise<{ accounts: MockAccount[] }> {
	const accounts = seed.map((account) => ({ ...account }));

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, accounts);
		}
		if (path.startsWith('/api/accounts/') && method === 'PUT') {
			const id = path.slice('/api/accounts/'.length);
			const account = accounts.find((entry) => entry.id === id);
			if (account === undefined) {
				return json(route, { error: 'not found' }, 404);
			}
			let body: unknown = null;
			try {
				body = request.postDataJSON();
			} catch {
				body = null;
			}
			if (body && typeof body === 'object') {
				const bankName = Reflect.get(body, 'bank_name');
				const displayName = Reflect.get(body, 'display_name');
				if (typeof bankName === 'string') {
					account.bank_name = bankName;
				}
				if (typeof displayName === 'string') {
					account.display_name = displayName;
				}
			}
			return json(route, account);
		}

		return json(route, {});
	});

	return { accounts };
}
