import type { Page } from '@playwright/test';
import { json, installDocsCommonMocks } from './docs-common-mocks';

export const SEED_INCOME_SUMMARY = {
	streams: [
		{
			streamKey: 'acme-payroll',
			label: 'Acme salary',
			sourceLabel: 'ACME CORP PAYROLL',
			frequency: 'Fortnightly',
			averageAmountDollars: 4200,
			estimatedMonthlyDollars: 9100,
			minAmountDollars: 4100,
			maxAmountDollars: 4200,
			monthsObserved: 8,
			occurrences: 16,
			firstDate: '2026-01-15',
			lastDate: '2026-08-01',
			confidence: 0.92,
			isIrregular: false,
			isPrimary: true,
			isConfirmed: true,
			grossMonthlyDollars: 12500,
			estimatedYearlyExGstDollars: 109_200,
			estimatedYearlyIncGstDollars: 120_120,
			grossYearlyExGstDollars: 150_000,
			grossYearlyIncGstDollars: 165_000,
			mergedIntoKey: null,
		},
		{
			streamKey: 'side-gig',
			label: 'Consulting',
			sourceLabel: 'CLIENT PAYMENT',
			frequency: 'Monthly',
			averageAmountDollars: 1800,
			estimatedMonthlyDollars: 1800,
			minAmountDollars: 1200,
			maxAmountDollars: 2200,
			monthsObserved: 5,
			occurrences: 5,
			firstDate: '2026-03-01',
			lastDate: '2026-07-01',
			confidence: 0.71,
			isIrregular: true,
			isPrimary: false,
			isConfirmed: false,
			grossMonthlyDollars: null,
			estimatedYearlyExGstDollars: 21_600,
			estimatedYearlyIncGstDollars: 23_760,
			grossYearlyExGstDollars: null,
			grossYearlyIncGstDollars: null,
			mergedIntoKey: null,
		},
	],
	totalMonthlyDollars: 10_900,
	totalYearlyExGstDollars: 130_800,
	totalYearlyIncGstDollars: 143_880,
	primaryStreamKey: 'acme-payroll',
};

export async function installIncomeMocks(page: Page): Promise<void> {
	await installDocsCommonMocks(page);

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/income-streams' && method === 'GET') {
			return json(route, SEED_INCOME_SUMMARY);
		}
		if (path === '/api/income-streams/profiles' && method === 'PUT') {
			return json(route, { ok: true });
		}

		return route.fallback();
	});
}
