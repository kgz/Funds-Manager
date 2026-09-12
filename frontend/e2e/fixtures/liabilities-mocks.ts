import type { Page, Route } from '@playwright/test';

export type MockLiability = {
	id: string;
	name: string;
	kind: string;
	lender: string | null;
	balance_cents: number;
	credit_limit_cents: number | null;
	original_amount_cents: number | null;
	interest_rate_bps: number | null;
	rate_type: string | null;
	repayment_cents: number | null;
	repayment_frequency: string | null;
	term_months: number | null;
	financial_account_id: string | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
};

export type MockLiabilityBalance = {
	id: string;
	liability_id: string;
	balanced_at: string;
	balance_cents: number;
	source: string | null;
	created_at: string;
};

const ACCOUNT = {
	id: '2',
	bank_name: 'BankSA',
	display_name: 'Offset',
	account_number: '105-000 987654',
	parser_name: 'heritage',
	account_type: 'offset',
	created_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
	statement_count: 3,
	last_known_balance: 48_250.0,
	last_known_balance_date: '2026-08-20',
};

export const SEED_LIABILITIES: MockLiability[] = [
	{
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
	},
	{
		id: '11',
		name: 'Car loan — Toyota Finance',
		kind: 'car_loan',
		lender: 'Toyota Finance',
		balance_cents: 18_400_00,
		credit_limit_cents: null,
		original_amount_cents: 35_000_00,
		interest_rate_bps: 649,
		rate_type: 'fixed',
		repayment_cents: 620_00,
		repayment_frequency: 'fortnightly',
		term_months: 60,
		financial_account_id: null,
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		deleted_at: null,
	},
];

export const SEED_LIABILITY_BALANCES: Record<string, MockLiabilityBalance[]> = {
	'10': [
		{
			id: 'b1',
			liability_id: '10',
			balanced_at: '2026-01-01',
			balance_cents: 425_000_00,
			source: 'Loan portal',
			created_at: '2026-01-01T00:00:00Z',
		},
		{
			id: 'b2',
			liability_id: '10',
			balanced_at: '2026-08-01',
			balance_cents: 412_850_00,
			source: 'Statement',
			created_at: '2026-08-01T00:00:00Z',
		},
	],
	'11': [
		{
			id: 'b3',
			liability_id: '11',
			balanced_at: '2026-08-01',
			balance_cents: 18_400_00,
			source: 'Statement',
			created_at: '2026-08-01T00:00:00Z',
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

function totalBalanceCents(liabilities: MockLiability[]): number {
	return liabilities
		.filter((liability) => liability.deleted_at === null)
		.reduce((sum, liability) => sum + liability.balance_cents, 0);
}

export async function installLiabilitiesMocks(
	page: Page,
	seed: MockLiability[] = SEED_LIABILITIES
): Promise<{ liabilities: MockLiability[] }> {
	const liabilities = seed.map((liability) => ({ ...liability }));

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, [ACCOUNT]);
		}
		if (path === '/api/liabilities' && method === 'GET') {
			const active = liabilities.filter((liability) => liability.deleted_at === null);
			return json(route, {
				items: active,
				total_balance_cents: totalBalanceCents(active),
			});
		}
		if (path.startsWith('/api/liabilities/') && path.endsWith('/balances') && method === 'GET') {
			const liabilityId = path.slice('/api/liabilities/'.length, -'/balances'.length);
			return json(route, SEED_LIABILITY_BALANCES[liabilityId] ?? []);
		}

		return json(route, {});
	});

	return { liabilities };
}
