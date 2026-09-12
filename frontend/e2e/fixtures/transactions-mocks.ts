import type { Page } from '@playwright/test';
import {
	json,
	installDocsCommonMocks,
	MOCK_ACCOUNT_SUMMARY,
	MOCK_CATEGORIES,
} from './docs-common-mocks';

const SEED_TRANSACTIONS = [
	{
		id: 1001,
		statement_id: 1,
		description: 'WOOLWORTHS 1234',
		amount: -8543,
		transaction_date: '2026-08-12T00:00:00Z',
		last_updated: '2026-08-12T00:00:00Z',
		deleted_at: null,
		created_at: '2026-08-12T00:00:00Z',
		status: 'posted',
		balance: 482_150,
		category_id: null,
		suggested_category_id: 1,
		suggested_category_name: 'Groceries',
		financial_account: MOCK_ACCOUNT_SUMMARY,
	},
	{
		id: 1002,
		statement_id: 1,
		description: 'ACME CORP PAYROLL',
		amount: 420_000,
		transaction_date: '2026-08-01T00:00:00Z',
		last_updated: '2026-08-01T00:00:00Z',
		deleted_at: null,
		created_at: '2026-08-01T00:00:00Z',
		status: 'posted',
		balance: 490_693,
		category_id: 2,
		financial_account: MOCK_ACCOUNT_SUMMARY,
	},
	{
		id: 1003,
		statement_id: 1,
		description: 'ORIGIN ENERGY',
		amount: -18_500,
		transaction_date: '2026-07-28T00:00:00Z',
		last_updated: '2026-07-28T00:00:00Z',
		deleted_at: null,
		created_at: '2026-07-28T00:00:00Z',
		status: 'posted',
		balance: 70_693,
		category_id: null,
		financial_account: MOCK_ACCOUNT_SUMMARY,
	},
	{
		id: 1004,
		statement_id: 2,
		description: 'TRANSFER TO SAVINGS',
		amount: -50_000,
		transaction_date: '2026-07-15T00:00:00Z',
		last_updated: '2026-07-15T00:00:00Z',
		deleted_at: null,
		created_at: '2026-07-15T00:00:00Z',
		status: 'posted',
		balance: 89_193,
		category_id: null,
		financial_account: MOCK_ACCOUNT_SUMMARY,
	},
];

const TRANSFER_SUGGESTION = {
	outTransaction: {
		id: 1004,
		description: 'TRANSFER TO SAVINGS',
		amount: -50_000,
		transactionDate: '2026-07-15',
		accountLabel: 'CBA Offset',
	},
	inTransaction: {
		id: 1005,
		description: 'TRANSFER FROM OFFSET',
		amount: 50_000,
		transactionDate: '2026-07-15',
		accountLabel: 'CBA Savings',
	},
	dayGap: 0,
	keywordMatch: true,
};

export async function installTransactionsMocks(page: Page): Promise<void> {
	await installDocsCommonMocks(page);

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/transactions' && method === 'GET') {
			return json(route, {
				items: SEED_TRANSACTIONS,
				total: SEED_TRANSACTIONS.length,
				page: 1,
				per_page: 50,
				total_pages: 1,
			});
		}
		if (path === '/api/transfers/suggestions' && method === 'GET') {
			return json(route, [TRANSFER_SUGGESTION]);
		}
		if (
			(path === '/api/transactions/categories' ||
				path.match(/^\/api\/transactions\/\d+\/category$/)) &&
			(method === 'PATCH' || method === 'POST')
		) {
			return json(route, { updated: 1 });
		}
		if (path === '/api/transactions/recategorize-uncategorized' && method === 'POST') {
			return json(route, { updated: 2 });
		}
		if (path === '/api/categories' && method === 'POST') {
			return json(route, { id: '99', name: 'New category' }, 201);
		}

		return route.fallback();
	});
}

export { SEED_TRANSACTIONS, TRANSFER_SUGGESTION, MOCK_CATEGORIES };
