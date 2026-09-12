import type { Page } from '@playwright/test';
import { json, installDocsCommonMocks } from './docs-common-mocks';

export const LENDER_BUCKETS = [
	{ bucketKey: 'housing', label: 'Housing', sortOrder: 1 },
	{ bucketKey: 'food', label: 'Food', sortOrder: 2 },
	{ bucketKey: 'transport', label: 'Transport', sortOrder: 3 },
	{ bucketKey: 'utilities', label: 'Utilities', sortOrder: 4 },
	{ bucketKey: 'other', label: 'Other living expenses', sortOrder: 5 },
];

export const SEED_LENDER_SUMMARY = {
	startDate: '2026-01-01',
	endDate: '2026-08-31',
	monthsInRange: 8,
	buckets: [
		{
			bucketKey: 'housing',
			label: 'Housing',
			totalDollars: 18_400,
			monthlyAverageDollars: 2300,
			transactionCount: 8,
		},
		{
			bucketKey: 'food',
			label: 'Food',
			totalDollars: 6400,
			monthlyAverageDollars: 800,
			transactionCount: 42,
		},
		{
			bucketKey: 'transport',
			label: 'Transport',
			totalDollars: 3200,
			monthlyAverageDollars: 400,
			transactionCount: 16,
		},
		{
			bucketKey: 'utilities',
			label: 'Utilities',
			totalDollars: 2400,
			monthlyAverageDollars: 300,
			transactionCount: 8,
		},
		{
			bucketKey: 'other',
			label: 'Other living expenses',
			totalDollars: 800,
			monthlyAverageDollars: 100,
			transactionCount: 4,
		},
	],
	unmapped: {
		totalDollars: 1200,
		monthlyAverageDollars: 150,
		transactionCount: 6,
	},
	excluded: {
		totalDollars: 33_600,
		monthlyAverageDollars: 4200,
		transactionCount: 16,
	},
	totalMonthlyDollars: 4050,
	allDebitsMonthlyDollars: 5200,
};

export const HOUSING_BREAKDOWN = {
	bucketKey: 'housing',
	label: 'Housing',
	startDate: '2026-01-01',
	endDate: '2026-08-31',
	monthsInRange: 8,
	totalDollars: 18_400,
	monthlyAverageDollars: 2300,
	transactionCount: 8,
	categories: [
		{
			categoryId: 3,
			categoryPath: 'Housing',
			categoryColour: '#bc6c25',
			totalDollars: 16_000,
			monthlyAverageDollars: 2000,
			transactionCount: 8,
		},
		{
			categoryId: 4,
			categoryPath: 'Housing / Utilities',
			categoryColour: '#bc6c25',
			totalDollars: 2400,
			monthlyAverageDollars: 300,
			transactionCount: 8,
		},
	],
};

export const SEED_LENDER_MAPPINGS = [
	{
		categoryId: 1,
		categoryName: 'Groceries',
		bucketKey: 'food',
		bucketLabel: 'Food',
		defaultBucketKey: 'food',
		isOverride: false,
		isExcluded: false,
		isManualExclude: false,
		autoExcludeReason: null,
	},
	{
		categoryId: 2,
		categoryName: 'Salary',
		bucketKey: null,
		bucketLabel: null,
		defaultBucketKey: null,
		isOverride: false,
		isExcluded: true,
		isManualExclude: false,
		autoExcludeReason: 'income',
	},
	{
		categoryId: 3,
		categoryName: 'Housing',
		bucketKey: 'housing',
		bucketLabel: 'Housing',
		defaultBucketKey: 'housing',
		isOverride: false,
		isExcluded: false,
		isManualExclude: false,
		autoExcludeReason: null,
	},
	{
		categoryId: 4,
		categoryName: 'Utilities',
		bucketKey: 'utilities',
		bucketLabel: 'Utilities',
		defaultBucketKey: 'utilities',
		isOverride: true,
		isExcluded: false,
		isManualExclude: false,
		autoExcludeReason: null,
	},
	{
		categoryId: 5,
		categoryName: 'Travel',
		bucketKey: null,
		bucketLabel: null,
		defaultBucketKey: 'other',
		isOverride: false,
		isExcluded: true,
		isManualExclude: true,
		autoExcludeReason: null,
	},
];

export async function installLivingExpensesMocks(page: Page): Promise<void> {
	await installDocsCommonMocks(page);

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/lender-expenses/buckets' && method === 'GET') {
			return json(route, LENDER_BUCKETS);
		}
		if (path === '/api/lender-expenses/mappings' && method === 'GET') {
			return json(route, SEED_LENDER_MAPPINGS);
		}
		if (path === '/api/lender-expenses/mappings' && method === 'PUT') {
			return json(route, { ok: true });
		}
		if (path === '/api/lender-expenses/summary' && method === 'GET') {
			return json(route, SEED_LENDER_SUMMARY);
		}
		if (
			path === '/api/lender-expenses/buckets/housing/breakdown' &&
			method === 'GET'
		) {
			return json(route, HOUSING_BREAKDOWN);
		}

		return route.fallback();
	});
}
