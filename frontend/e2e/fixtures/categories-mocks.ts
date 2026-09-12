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
];

export const SEED_CATEGORIES = [
	{
		id: '1',
		name: 'Groceries',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#3d9970',
		sort_order: 1,
		line_count: 42,
	},
	{
		id: '2',
		name: 'Supermarket',
		description: null,
		parent_category_id: '1',
		deleted_at: null,
		colour: '#2ecc71',
		sort_order: 1,
		line_count: 38,
	},
	{
		id: '3',
		name: 'Transport',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#336699',
		sort_order: 2,
		line_count: 12,
	},
	{
		id: '4',
		name: 'Salary',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#2d8659',
		sort_order: 3,
		line_count: 2,
	},
	{
		id: '5',
		name: 'Transfers',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#888888',
		sort_order: 90,
	},
	{
		id: '6',
		name: 'Uncategorized',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#aaaaaa',
		sort_order: 91,
	},
];

const UNCATEGORIZED = {
	line_count: 7,
	spending_total: 234.5,
	income_total: 0,
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

export async function installCategoriesMocks(page: Page): Promise<void> {
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
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, {
				categories: SEED_CATEGORIES,
				uncategorized: UNCATEGORIZED,
			});
		}

		return json(route, {});
	});
}
