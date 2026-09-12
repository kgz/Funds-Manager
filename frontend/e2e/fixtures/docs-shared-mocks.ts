import type { Page, Route } from '@playwright/test';

export const MOCK_ACCOUNTS = [
	{
		id: '1',
		bank_name: 'CBA',
		display_name: 'Offset',
		account_number: '062-000 1234',
		parser_name: 'heritage',
		account_type: 'offset',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 12,
	},
	{
		id: '2',
		bank_name: 'CBA',
		display_name: 'Everyday',
		account_number: '062-000 5678',
		parser_name: 'heritage',
		account_type: 'transaction',
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
		statement_count: 10,
	},
];

export const MOCK_CATEGORIES = [
	{
		id: '3',
		name: 'Groceries',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#4a9',
		sort_order: 1,
	},
	{
		id: '5',
		name: 'Travel',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#369',
		sort_order: 2,
	},
	{
		id: '8',
		name: 'Salary',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#6b4',
		sort_order: 3,
	},
];

export function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

export async function installDocsLayoutMocks(page: Page): Promise<void> {
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
			return json(route, MOCK_ACCOUNTS);
		}
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, MOCK_CATEGORIES);
		}

		return json(route, {});
	});
}
