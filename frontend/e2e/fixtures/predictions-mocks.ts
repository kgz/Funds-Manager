import type { Page } from '@playwright/test';
import { json, MOCK_ACCOUNTS, MOCK_CATEGORIES } from './docs-shared-mocks';

const BASELINE_POINTS = [
	{ date: '2026-09-12', balance_cents: 4_380_000 },
	{ date: '2026-10-01', balance_cents: 4_420_000 },
	{ date: '2026-11-01', balance_cents: 4_460_000 },
	{ date: '2026-12-01', balance_cents: 4_140_000 },
	{ date: '2027-01-01', balance_cents: 4_180_000 },
	{ date: '2027-02-01', balance_cents: 4_220_000 },
	{ date: '2027-03-01', balance_cents: 4_260_000 },
];

const BASELINE_METADATA = {
	starting_balance_cents: 4_380_000,
	baseline_monthly_net_cents: 545_000,
	baseline_daily_net_cents: 18_167,
	months_averaged: 6,
	planned_item_count: 2,
	repeat_adjustment_count: 0,
};

const SCENARIO = {
	id: '201',
	name: 'Rent increase',
	created_at: '2026-08-01T00:00:00Z',
	lines: [
		{
			id: '301',
			scenario_id: '201',
			name: 'Higher rent',
			amount_cents: -150_000,
			frequency: 'once',
			start_date: '2027-01-15',
			end_date: null,
			category_id: null,
			sort_order: 0,
		},
	],
};

const GOAL = {
	id: '401',
	name: 'Emergency fund',
	target_amount_cents: 5_000_000,
	target_date: '2027-03-01',
	created_at: '2026-08-01T00:00:00Z',
	deleted_at: null,
};

const PLANNED_ITEMS = {
	items: [
		{
			id: '101',
			plan_kind: 'cashflow',
			name: 'Bali holiday',
			amount_cents: -320_000,
			start_date: '2026-12-10',
			end_date: null,
			category_id: '5',
			liability_id: null,
			financial_account_id: null,
			new_liability_name: null,
			interest_rate_bps: null,
			repayment_cents: null,
			notes: null,
			created_at: '2026-08-01T00:00:00Z',
			deleted_at: null,
			resolved_at: null,
			linked_transactions: [],
			linked_total_cents: 0,
		},
		{
			id: '102',
			plan_kind: 'cashflow',
			name: 'Tax refund',
			amount_cents: 180_000,
			start_date: '2027-02-01',
			end_date: null,
			category_id: null,
			liability_id: null,
			financial_account_id: null,
			new_liability_name: null,
			interest_rate_bps: null,
			repayment_cents: null,
			notes: null,
			created_at: '2026-08-01T00:00:00Z',
			deleted_at: null,
			resolved_at: null,
			linked_transactions: [],
			linked_total_cents: 0,
		},
	],
	total_cents: -140_000,
};

function scenarioProjectionPoints(): typeof BASELINE_POINTS {
	return BASELINE_POINTS.map((point, index) => ({
		date: point.date,
		balance_cents: point.balance_cents - (index >= 4 ? 150_000 : 0),
	}));
}

export async function installPredictionsMocks(page: Page): Promise<void> {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/predictions/baseline' && method === 'POST') {
			return json(route, {
				points: BASELINE_POINTS,
				metadata: BASELINE_METADATA,
			});
		}
		if (path.startsWith('/api/predictions/scenario/') && method === 'POST') {
			return json(route, {
				points: scenarioProjectionPoints(),
				metadata: BASELINE_METADATA,
			});
		}
		if (path === '/api/prediction-scenarios' && method === 'GET') {
			return json(route, [SCENARIO]);
		}
		if (path === '/api/prediction-goals' && method === 'GET') {
			return json(route, [GOAL]);
		}
		if (path === '/api/planning' && method === 'GET') {
			return json(route, PLANNED_ITEMS);
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
