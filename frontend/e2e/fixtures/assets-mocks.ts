import type { Page, Route } from '@playwright/test';

export type MockAsset = {
	id: string;
	name: string;
	kind: string;
	value_cents: number;
	valued_at: string | null;
	value_source: string | null;
	liability_id: string | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
};

export type MockAssetValuation = {
	id: string;
	asset_id: string;
	valued_at: string;
	value_cents: number;
	source: string | null;
	created_at: string;
};

const LIABILITY = {
	id: '10',
	name: 'Home loan — BankSA',
	kind: 'home_loan',
	lender: 'BankSA',
	balance_cents: 412_850_00,
	credit_limit_cents: null,
	original_amount_cents: 500_000_00,
	interest_rate_bps: 589,
	rate_type: 'variable',
	repayment_cents: 264_000,
	repayment_frequency: 'monthly',
	term_months: 300,
	financial_account_id: '2',
	notes: null,
	created_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
};

export const SEED_ASSETS: MockAsset[] = [
	{
		id: '20',
		name: 'Family home — Unley Park',
		kind: 'property',
		value_cents: 1_250_000_00,
		valued_at: '2026-06-01',
		value_source: 'Bank valuation',
		liability_id: '10',
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
	},
	{
		id: '21',
		name: 'AustralianSuper',
		kind: 'super',
		value_cents: 285_400_00,
		valued_at: '2026-07-31',
		value_source: 'Member statement',
		liability_id: null,
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
	},
];

export const SEED_ASSET_VALUATIONS: Record<string, MockAssetValuation[]> = {
	'20': [
		{
			id: 'v1',
			asset_id: '20',
			valued_at: '2025-06-01',
			value_cents: 1_180_000_00,
			source: 'Agent appraisal',
			created_at: '2025-06-01T00:00:00Z',
		},
		{
			id: 'v2',
			asset_id: '20',
			valued_at: '2026-06-01',
			value_cents: 1_250_000_00,
			source: 'Bank valuation',
			created_at: '2026-06-01T00:00:00Z',
		},
	],
	'21': [
		{
			id: 'v3',
			asset_id: '21',
			valued_at: '2026-07-31',
			value_cents: 285_400_00,
			source: 'Member statement',
			created_at: '2026-07-31T00:00:00Z',
		},
	],
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

function totalValueCents(assets: MockAsset[]): number {
	return assets
		.filter((asset) => asset.deleted_at === null)
		.reduce((sum, asset) => sum + asset.value_cents, 0);
}

export async function installAssetsMocks(
	page: Page,
	seed: MockAsset[] = SEED_ASSETS
): Promise<{ assets: MockAsset[] }> {
	const assets = seed.map((asset) => ({ ...asset }));

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/assets' && method === 'GET') {
			const active = assets.filter((asset) => asset.deleted_at === null);
			return json(route, {
				items: active,
				total_value_cents: totalValueCents(active),
			});
		}
		if (path === '/api/liabilities' && method === 'GET') {
			return json(route, {
				items: [LIABILITY],
				total_balance_cents: LIABILITY.balance_cents,
			});
		}
		if (path.startsWith('/api/assets/') && path.endsWith('/valuations') && method === 'GET') {
			const assetId = path.slice('/api/assets/'.length, -'/valuations'.length);
			return json(route, SEED_ASSET_VALUATIONS[assetId] ?? []);
		}

		return json(route, {});
	});

	return { assets };
}
