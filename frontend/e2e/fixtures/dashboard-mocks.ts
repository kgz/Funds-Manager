import type { Page } from '@playwright/test';
import {
	json,
	MOCK_ACCOUNTS,
	MOCK_CATEGORIES,
} from './docs-shared-mocks';

const DASHBOARD_ANALYTICS = {
	monthlySummary: [
		{ month: '2026-04', spending: 2800, receiving: 7200 },
		{ month: '2026-05', spending: 3100, receiving: 7100 },
		{ month: '2026-06', spending: 2950, receiving: 8500 },
		{ month: '2026-07', spending: 3400, receiving: 7200 },
		{ month: '2026-08', spending: 3200, receiving: 8500 },
		{ month: '2026-09', spending: 3050, receiving: 8500 },
	],
	spendingByCategory: [
		{
			groupKey: 'cat:3',
			categoryId: 3,
			name: 'Groceries',
			colour: '#4a9',
			value: 1240,
			percent: 38.8,
		},
		{
			groupKey: 'cat:5',
			categoryId: 5,
			name: 'Travel',
			colour: '#369',
			value: 980,
			percent: 30.6,
		},
		{
			groupKey: 'cat:0',
			categoryId: null,
			name: 'Uncategorised',
			colour: null,
			value: 980,
			percent: 30.6,
		},
	],
	incomeByCategory: [
		{
			groupKey: 'cat:8',
			categoryId: 8,
			name: 'Salary',
			colour: '#6b4',
			value: 8200,
			percent: 96.5,
		},
		{
			groupKey: 'cat:0',
			categoryId: null,
			name: 'Uncategorised',
			colour: null,
			value: 300,
			percent: 3.5,
		},
	],
	balanceSeries: [
		{ date: '2026-04-01', balance: 38200 },
		{ date: '2026-05-01', balance: 40100 },
		{ date: '2026-06-01', balance: 41850 },
		{ date: '2026-07-01', balance: 40900 },
		{ date: '2026-08-01', balance: 42500 },
		{ date: '2026-09-01', balance: 43800 },
	],
	balanceStack: {
		accounts: [
			{ accountKey: 'acct:1', accountId: 1, label: 'Offset' },
			{ accountKey: 'acct:2', accountId: 2, label: 'Everyday' },
		],
		rows: [
			{
				date: '2026-04-01',
				total: 38200,
				values: { 'acct:1': 32000, 'acct:2': 6200 },
			},
			{
				date: '2026-05-01',
				total: 40100,
				values: { 'acct:1': 33500, 'acct:2': 6600 },
			},
			{
				date: '2026-06-01',
				total: 41850,
				values: { 'acct:1': 34800, 'acct:2': 7050 },
			},
			{
				date: '2026-07-01',
				total: 40900,
				values: { 'acct:1': 34000, 'acct:2': 6900 },
			},
			{
				date: '2026-08-01',
				total: 42500,
				values: { 'acct:1': 35200, 'acct:2': 7300 },
			},
			{
				date: '2026-09-01',
				total: 43800,
				values: { 'acct:1': 36100, 'acct:2': 7700 },
			},
		],
	},
};

const DASHBOARD_KPIS = {
	balance: 43800,
	spending: 3050,
	income: 8500,
	net: 5450,
};

const PREVIOUS_KPIS = {
	balance: 42500,
	spending: 3200,
	income: 8500,
	net: 5300,
};

const NET_WORTH = [
	{
		date: '2026-04-01',
		available_cash: 38200,
		assets: 120000,
		liabilities: 412850,
		net_worth: -254650,
	},
	{
		date: '2026-05-01',
		available_cash: 40100,
		assets: 120000,
		liabilities: 411200,
		net_worth: -251100,
	},
	{
		date: '2026-06-01',
		available_cash: 41850,
		assets: 121000,
		liabilities: 409800,
		net_worth: -246950,
	},
	{
		date: '2026-07-01',
		available_cash: 40900,
		assets: 121000,
		liabilities: 408500,
		net_worth: -246600,
	},
	{
		date: '2026-08-01',
		available_cash: 42500,
		assets: 122000,
		liabilities: 407200,
		net_worth: -242700,
	},
	{
		date: '2026-09-01',
		available_cash: 43800,
		assets: 122500,
		liabilities: 405900,
		net_worth: -239600,
	},
];

const DRILLDOWN_TXNS = [
	{
		id: 501,
		description: 'WOOLWORTHS 1234 SYDNEY',
		amount: -8425,
		transaction_date: '2026-09-05',
		category_id: 3,
		financial_account_id: 2,
	},
	{
		id: 502,
		description: 'COLES 5678 SYDNEY',
		amount: -3975,
		transaction_date: '2026-09-12',
		category_id: 3,
		financial_account_id: 2,
	},
];

export async function installDashboardMocks(page: Page): Promise<void> {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/analytics/dashboard' && method === 'GET') {
			return json(route, DASHBOARD_ANALYTICS);
		}
		if (path === '/api/analytics/kpis' && method === 'GET') {
			const start = url.searchParams.get('start');
			if (start === '2026-03-01') {
				return json(route, PREVIOUS_KPIS);
			}
			return json(route, DASHBOARD_KPIS);
		}
		if (path === '/api/analytics/net-worth' && method === 'GET') {
			return json(route, NET_WORTH);
		}
		if (path === '/api/analytics/spending-drilldown' && method === 'GET') {
			return json(route, {
				items: DRILLDOWN_TXNS,
				total: DRILLDOWN_TXNS.length,
				page: 1,
				per_page: 50,
				total_pages: 1,
			});
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
