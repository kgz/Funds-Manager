import type { Page } from '@playwright/test';
import { json, MOCK_ACCOUNT } from './docs-common-mocks';

const REPEAT_CATEGORIES = [
	{
		id: '3',
		name: 'Subscriptions',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#7c5cff',
		sort_order: 3,
	},
	{
		id: '8',
		name: 'Groceries',
		description: null,
		parent_category_id: null,
		deleted_at: null,
		colour: '#2d9f5a',
		sort_order: 8,
	},
];

export const SEED_RECURRING_ROWS = [
	{
		rowId: 'rec-netflix',
		key: 'netflix',
		labelSample: 'NETFLIX.COM AU',
		modeCategoryId: 3,
		flow: 'expense',
		cadenceLabel: 'Monthly',
		medianGapDays: 30,
		estimatedMonthlyDollars: 22.99,
		typicalAmountDollars: 22.99,
		minAmountDollars: 22.99,
		maxAmountDollars: 22.99,
		occurrences: 6,
		firstDate: '2026-03-04',
		lastDate: '2026-08-04',
		confidence: 0.92,
	},
	{
		rowId: 'rec-mortgage',
		key: 'mortgage',
		labelSample: 'BANKSA HOME LOAN',
		modeCategoryId: 8,
		flow: 'expense',
		cadenceLabel: 'Monthly',
		medianGapDays: 30,
		estimatedMonthlyDollars: 2640,
		typicalAmountDollars: 2640,
		minAmountDollars: 2640,
		maxAmountDollars: 2640,
		occurrences: 6,
		firstDate: '2026-03-01',
		lastDate: '2026-08-01',
		confidence: 0.99,
	},
	{
		rowId: 'rec-salary',
		key: 'salary',
		labelSample: 'ACME PTY LTD PAYROLL',
		modeCategoryId: null,
		flow: 'income',
		cadenceLabel: 'Fortnightly',
		medianGapDays: 14,
		estimatedMonthlyDollars: 8200,
		typicalAmountDollars: 3800,
		minAmountDollars: 3800,
		maxAmountDollars: 3800,
		occurrences: 12,
		firstDate: '2026-01-15',
		lastDate: '2026-08-15',
		confidence: 0.98,
	},
];

export async function installRepeatPaymentsMocks(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem('recurringGroupByCategory', 'false');
	});

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;

		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, [MOCK_ACCOUNT]);
		}
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, REPEAT_CATEGORIES);
		}
		if (path.startsWith('/api/analytics/recurring') && method === 'GET') {
			return json(route, SEED_RECURRING_ROWS);
		}

		return json(route, {});
	});
}
