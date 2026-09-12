import type { Page, Route } from '@playwright/test';

export const MOCK_ACCOUNT = {
	id: '1',
	bank_name: 'CBA',
	display_name: 'Offset',
	account_number: '062-000 1234',
	parser_name: 'heritage',
	account_type: 'offset',
	created_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
	statement_count: 4,
};

export const MOCK_ACCOUNT_SUMMARY = {
	id: 1,
	bank_name: 'CBA',
	display_name: 'Offset',
	account_number: '062-000 1234',
};

export const MOCK_CATEGORIES = [
	{
		id: '1',
		name: 'Groceries',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#2d6a4f',
		sort_order: 1,
	},
	{
		id: '2',
		name: 'Salary',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#1d3557',
		sort_order: 2,
	},
	{
		id: '3',
		name: 'Housing',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#bc6c25',
		sort_order: 3,
	},
	{
		id: '4',
		name: 'Utilities',
		description: null,
		parent_category_id: '3',
		deleted_at: null,
		colour: '#bc6c25',
		sort_order: 4,
	},
	{
		id: '5',
		name: 'Travel',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#336699',
		sort_order: 5,
	},
];

export function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

/** Nav badges and account/category lists used on most doc screenshot pages. */
export async function installDocsCommonMocks(page: Page): Promise<void> {
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
			return json(route, [MOCK_ACCOUNT]);
		}
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, MOCK_CATEGORIES);
		}

		return json(route, {});
	});
}
