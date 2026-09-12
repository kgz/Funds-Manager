import type { Page, Route } from '@playwright/test';

const ACCOUNTS = [
	{
		id: '1',
		bank_name: 'CBA',
		display_name: 'Offset',
		account_number: '062-000 1234',
		parser_name: 'cba',
		account_type: 'offset',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 2,
	},
	{
		id: '2',
		bank_name: 'People\'s Choice',
		display_name: 'Everyday',
		account_number: '804-000 5678',
		parser_name: 'peoples_choice',
		account_type: 'transaction',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 1,
	},
];

const FINANCIAL_ACCOUNT_SUMMARY = {
	id: 1,
	bank_name: 'CBA',
	display_name: 'Offset',
	account_number: '062-000 1234',
};

const STATEMENTS = [
	{
		id: 101,
		date: '2026-07-31',
		account_id: '1',
		opening_balance: 12_450.0,
		closing_balance: 11_820.5,
		deleted_at: null,
		created_at: '2026-08-03T09:15:00Z',
		financial_account_id: 1,
		period_start: '2026-07-01',
		period_end: '2026-07-31',
		financial_account: FINANCIAL_ACCOUNT_SUMMARY,
	},
	{
		id: 102,
		date: '2026-06-30',
		account_id: '1',
		opening_balance: 13_100.0,
		closing_balance: 12_450.0,
		deleted_at: null,
		created_at: '2026-07-02T11:40:00Z',
		financial_account_id: 1,
		period_start: '2026-06-01',
		period_end: '2026-06-30',
		financial_account: FINANCIAL_ACCOUNT_SUMMARY,
	},
];

const MISSING_PERIODS = [
	{
		account_label: 'CBA Offset',
		period: '2026-05-01 to 2026-05-31',
	},
];

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

export async function installStatementsMocks(page: Page): Promise<void> {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/planning/match-suggestions/count' && method === 'GET') {
			return json(route, { count: 0 });
		}
		if (path === '/api/planning/match-suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/transfers/suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, ACCOUNTS);
		}
		if (path === '/api/statements/missing-periods' && method === 'GET') {
			return json(route, { periods: MISSING_PERIODS });
		}
		if (path === '/api/statements' && method === 'GET') {
			return json(route, {
				items: STATEMENTS,
				total: STATEMENTS.length,
				page: 1,
				per_page: 50,
				total_pages: 1,
			});
		}

		return json(route, {});
	});
}
