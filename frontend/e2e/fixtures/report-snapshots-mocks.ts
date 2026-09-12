import type { Page } from '@playwright/test';
import { json, MOCK_ACCOUNT } from './docs-common-mocks';
import { SEED_LIABILITIES } from './liabilities-mocks';
import { SEED_SERVICEABILITY_SUMMARY } from './serviceability-mocks';

const MOCK_LIABILITY = SEED_LIABILITIES[0];

const PERIOD = {
	startDate: '2026-03-01',
	endDate: '2026-08-31',
};

export const SEED_INCOME_SUMMARY = {
	streams: [
		{
			streamKey: 'salary',
			label: 'Acme Pty Ltd salary',
			sourceLabel: 'ACME PTY LTD',
			frequency: 'Fortnightly',
			averageAmountDollars: 3800,
			estimatedMonthlyDollars: 8200,
			minAmountDollars: 3800,
			maxAmountDollars: 3800,
			monthsObserved: 6,
			occurrences: 12,
			firstDate: '2026-01-15',
			lastDate: '2026-08-15',
			confidence: 0.98,
			isIrregular: false,
			isPrimary: true,
			isConfirmed: true,
			grossMonthlyDollars: null,
			estimatedYearlyExGstDollars: 98400,
			estimatedYearlyIncGstDollars: 98400,
			grossYearlyExGstDollars: null,
			grossYearlyIncGstDollars: null,
			mergedIntoKey: null,
		},
	],
	totalMonthlyDollars: 9200,
	totalYearlyExGstDollars: 110400,
	totalYearlyIncGstDollars: 110400,
	primaryStreamKey: 'salary',
};

export const SEED_LENDER_EXPENSE_SUMMARY = {
	startDate: PERIOD.startDate,
	endDate: PERIOD.endDate,
	monthsInRange: 6,
	buckets: [
		{
			bucketKey: 'groceries',
			label: 'Groceries',
			totalDollars: 5100,
			monthlyAverageDollars: 850,
			transactionCount: 48,
		},
		{
			bucketKey: 'utilities',
			label: 'Utilities',
			totalDollars: 2520,
			monthlyAverageDollars: 420,
			transactionCount: 12,
		},
	],
	unmapped: {
		totalDollars: 200,
		monthlyAverageDollars: 33,
		transactionCount: 4,
	},
	excluded: {
		totalDollars: 500,
		monthlyAverageDollars: 83,
		transactionCount: 2,
	},
	totalMonthlyDollars: 3850,
	allDebitsMonthlyDollars: 4200,
};

export const SEED_REPORT_COVERAGE = {
	startDate: PERIOD.startDate,
	endDate: PERIOD.endDate,
	monthsInRange: 6,
	totalMonthSlots: 6,
	coveredMonthSlots: 6,
	sufficient: true,
	summaryStatement: 'Statement coverage looks good for this period.',
	accounts: [
		{
			accountId: 1,
			accountLabel: 'CBA Offset',
			monthsExpected: 6,
			monthsCovered: 6,
			missingMonths: [],
			gapRanges: [],
			multiMonthCadence: false,
			sufficient: true,
		},
	],
};

export const SEED_SNAPSHOT_LIST_ITEM = {
	id: 1,
	name: 'June refinance pack',
	asAt: '2026-06-30',
	startDate: PERIOD.startDate,
	endDate: PERIOD.endDate,
	accountId: null,
	rateBufferBps: 300,
	createdAt: '2026-07-01T10:15:00.000Z',
};

export const SEED_SNAPSHOT_DETAIL = {
	...SEED_SNAPSHOT_LIST_ITEM,
	payload: {
		version: 1,
		accounts: [
			{
				id: 1,
				bankName: 'CBA',
				displayName: 'Offset',
			},
		],
		income: SEED_INCOME_SUMMARY,
		lenderExpenses: SEED_LENDER_EXPENSE_SUMMARY,
		serviceability: SEED_SERVICEABILITY_SUMMARY,
		assets: {
			totalValueCents: 85_000_00,
			items: [],
		},
		liabilities: {
			totalBalanceCents: MOCK_LIABILITY.balance_cents,
			items: [MOCK_LIABILITY],
		},
		netWorth: {
			points: [],
			latest: {
				date: '2026-06-30',
				availableCash: 42_500,
				assets: 85000,
				liabilities: 412850,
				netWorth: -327850,
			},
		},
		coverage: SEED_REPORT_COVERAGE,
	},
};

export async function installReportSnapshotsMocks(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem('reportSnapshotPeriod', 'last-6-months');
	});

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;

		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, [MOCK_ACCOUNT]);
		}
		if (path === '/api/liabilities' && method === 'GET') {
			return json(route, {
				items: [MOCK_LIABILITY],
				total_balance_cents: MOCK_LIABILITY.balance_cents,
			});
		}
		if (path === '/api/assets' && method === 'GET') {
			return json(route, {
				items: [],
				total_value_cents: 85_000_00,
			});
		}
		if (path.startsWith('/api/income-streams') && method === 'GET') {
			return json(route, SEED_INCOME_SUMMARY);
		}
		if (path.startsWith('/api/lender-expenses/summary') && method === 'GET') {
			return json(route, SEED_LENDER_EXPENSE_SUMMARY);
		}
		if (path.startsWith('/api/report-coverage/summary') && method === 'GET') {
			return json(route, SEED_REPORT_COVERAGE);
		}
		if (path.startsWith('/api/serviceability/summary') && method === 'GET') {
			return json(route, SEED_SERVICEABILITY_SUMMARY);
		}
		if (path === '/api/report-snapshots' && method === 'GET') {
			return json(route, [SEED_SNAPSHOT_LIST_ITEM]);
		}
		if (path === '/api/report-snapshots/1' && method === 'GET') {
			return json(route, SEED_SNAPSHOT_DETAIL);
		}
		if (path === '/api/report-snapshots/1/annotations' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/report-snapshots/1/shares' && method === 'GET') {
			return json(route, []);
		}

		return json(route, {});
	});
}
