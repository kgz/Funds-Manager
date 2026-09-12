import type { Page } from '@playwright/test';
import { json, MOCK_ACCOUNT } from './docs-common-mocks';

export const SEED_SERVICEABILITY_SUMMARY = {
	startDate: '2026-03-01',
	endDate: '2026-08-31',
	rateBufferBps: 300,
	incomeUsesUnconfirmed: false,
	incomeMonthlyDollars: 9200,
	incomeLines: [
		{
			streamKey: 'salary',
			label: 'Acme Pty Ltd salary',
			monthlyDollars: 8200,
			isConfirmed: true,
		},
		{
			streamKey: 'rental',
			label: 'Investment property rent',
			monthlyDollars: 1000,
			isConfirmed: true,
		},
	],
	repaymentsMonthlyDollars: 2640,
	stressedRepaymentsMonthlyDollars: 2985,
	livingExpensesMonthlyDollars: 3850,
	surplusMonthlyDollars: 2710,
	stressedSurplusMonthlyDollars: 2365,
	committedTotalMonthlyDollars: 2100,
	discretionaryTotalMonthlyDollars: 1750,
	liabilities: [
		{
			id: 10,
			name: 'Home loan — BankSA',
			kind: 'home_loan',
			rateType: 'variable',
			interestRateBps: 589,
			included: true,
			baselineRepaymentMonthlyDollars: 2640,
			stressedRepaymentMonthlyDollars: 2985,
		},
	],
	livingSplit: {
		committedLivingMonthlyDollars: 2100,
		discretionaryLivingMonthlyDollars: 1750,
		committedBuckets: [
			{
				bucketKey: 'groceries',
				label: 'Groceries',
				monthlyAverageDollars: 850,
			},
			{
				bucketKey: 'utilities',
				label: 'Utilities',
				monthlyAverageDollars: 420,
			},
		],
		discretionaryBuckets: [
			{
				bucketKey: 'dining',
				label: 'Dining out',
				monthlyAverageDollars: 380,
			},
			{
				bucketKey: 'entertainment',
				label: 'Entertainment',
				monthlyAverageDollars: 290,
			},
		],
	},
};

export async function installServiceabilityMocks(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem('dashboardDateRange', 'last-6-months');
	});

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;

		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, [MOCK_ACCOUNT]);
		}
		if (path.startsWith('/api/serviceability/summary') && method === 'GET') {
			return json(route, SEED_SERVICEABILITY_SUMMARY);
		}

		return json(route, {});
	});
}
