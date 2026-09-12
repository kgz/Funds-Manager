import type { Page } from '@playwright/test';
import { json, MOCK_ACCOUNTS, MOCK_CATEGORIES } from './docs-shared-mocks';

export const BREAKDOWN_ROWS = [
	{
		sectionKey: 'cat:3',
		categoryId: 3,
		label: 'Groceries',
		colour: '#4a9',
		spending: 1240.5,
		income: 0,
		txnCount: 18,
		subRows: [
			{
				key: 'grp:woolworths',
				labelSample: 'WOOLWORTHS 1234 SYDNEY',
				spending: 842.25,
				income: 0,
				count: 9,
			},
			{
				key: 'grp:coles',
				labelSample: 'COLES 5678 SYDNEY',
				spending: 398.25,
				income: 0,
				count: 9,
			},
		],
	},
	{
		sectionKey: 'cat:5',
		categoryId: 5,
		label: 'Travel',
		colour: '#369',
		spending: 980,
		income: 0,
		txnCount: 3,
		subRows: [
			{
				key: 'grp:jetstar',
				labelSample: 'JETSTAR AIRWAYS',
				spending: 620,
				income: 0,
				count: 1,
			},
			{
				key: 'grp:booking',
				labelSample: 'BOOKING.COM HOTEL',
				spending: 360,
				income: 0,
				count: 2,
			},
		],
	},
	{
		sectionKey: 'cat:8',
		categoryId: 8,
		label: 'Salary',
		colour: '#6b4',
		spending: 0,
		income: 8500,
		txnCount: 2,
		subRows: [
			{
				key: 'grp:employer',
				labelSample: 'ACME PAYROLL',
				spending: 0,
				income: 8500,
				count: 2,
			},
		],
	},
];

export async function installBreakdownMocks(page: Page): Promise<void> {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/analytics/breakdown' && method === 'GET') {
			return json(route, BREAKDOWN_ROWS);
		}
		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, MOCK_ACCOUNTS);
		}
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, MOCK_CATEGORIES);
		}
		if (path === '/api/planning/match-suggestions/count' && method === 'GET') {
			return json(route, { count: 0 });
		}
		if (path === '/api/planning/match-suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/transfers/suggestions' && method === 'GET') {
			return json(route, []);
		}

		return json(route, {});
	});
}
