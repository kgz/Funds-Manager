import type { Page, Route } from '@playwright/test';

export type MockPlanKind =
	| 'cashflow'
	| 'loan_redraw'
	| 'loan_refinance'
	| 'loan_repayment_change';

export type MockPlan = {
	id: string;
	plan_kind: MockPlanKind;
	name: string;
	amount_cents: number;
	start_date: string;
	end_date: string | null;
	category_id: string | null;
	liability_id: string | null;
	financial_account_id: string | null;
	new_liability_name: string | null;
	interest_rate_bps: number | null;
	repayment_cents: number | null;
	notes: string | null;
	created_at: string;
	deleted_at: string | null;
	resolved_at: string | null;
	linked_transactions: unknown[];
	linked_total_cents: number;
};

const ACCOUNT = {
	id: '1',
	bank_name: 'CBA',
	display_name: 'Offset',
	account_number: '062-000 1234',
	parser_name: 'heritage',
	account_type: 'offset',
	created_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
	statement_count: 1,
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
	financial_account_id: '1',
	notes: null,
	created_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
};

const CATEGORY = {
	id: '5',
	name: 'Travel',
	description: null,
	parent_category_id: null,
	deleted_at: null,
	colour: '#336699',
	sort_order: 1,
};

export const SEED_PLANS: MockPlan[] = [
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
		plan_kind: 'loan_redraw',
		name: 'Offset redraw — kitchen',
		amount_cents: 5_000_000,
		start_date: '2026-09-01',
		end_date: null,
		category_id: null,
		liability_id: '10',
		financial_account_id: '1',
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
];

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

function cashflowTotalCents(plans: MockPlan[]): number {
	return plans
		.filter((plan) => plan.plan_kind === 'cashflow' && plan.deleted_at === null)
		.reduce((sum, plan) => sum + plan.amount_cents, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNullableString(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	return typeof value === 'string' ? value : null;
}

function readNullableNumber(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	return readNumber(value);
}

function readId(value: unknown): string | null {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(Math.trunc(value));
	}
	return null;
}

function parseCreateBody(raw: unknown): MockPlan | null {
	if (!isRecord(raw)) {
		return null;
	}
	const name = readString(raw.name);
	const amountCents = readNumber(raw.amount_cents);
	const startDate = readString(raw.start_date);
	const planKindRaw = readString(raw.plan_kind);
	if (name === null || amountCents === null || startDate === null) {
		return null;
	}
	const planKind: MockPlanKind =
		planKindRaw === 'loan_redraw' ||
		planKindRaw === 'loan_refinance' ||
		planKindRaw === 'loan_repayment_change'
			? planKindRaw
			: 'cashflow';

	return {
		id: String(Date.now()),
		plan_kind: planKind,
		name,
		amount_cents: Math.trunc(amountCents),
		start_date: startDate,
		end_date: readNullableString(raw.end_date),
		category_id: readId(raw.category_id),
		liability_id: readId(raw.liability_id),
		financial_account_id: readId(raw.financial_account_id),
		new_liability_name: readNullableString(raw.new_liability_name),
		interest_rate_bps: readNullableNumber(raw.interest_rate_bps),
		repayment_cents: readNullableNumber(raw.repayment_cents),
		notes: readNullableString(raw.notes),
		created_at: new Date().toISOString(),
		deleted_at: null,
		resolved_at: null,
		linked_transactions: [],
		linked_total_cents: 0,
	};
}

export type PlanningMockState = {
	plans: MockPlan[];
	lastCreateBody: unknown;
};

export async function installPlanningMocks(
	page: Page,
	seed: MockPlan[] = SEED_PLANS
): Promise<PlanningMockState> {
	const state: PlanningMockState = {
		plans: seed.map((plan) => ({ ...plan })),
		lastCreateBody: null,
	};

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/planning/match-suggestions/count' && method === 'GET') {
			return json(route, { count: 0 });
		}
		if (path === '/api/planning/match-suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/transfers/suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path.startsWith('/api/accounts') && method === 'GET') {
			return json(route, [ACCOUNT]);
		}
		if (path.startsWith('/api/categories') && method === 'GET') {
			return json(route, [CATEGORY]);
		}
		if (path === '/api/liabilities' && method === 'GET') {
			return json(route, {
				items: [LIABILITY],
				total_balance_cents: LIABILITY.balance_cents,
			});
		}
		if (path === '/api/planning' && method === 'GET') {
			const active = state.plans.filter((plan) => plan.deleted_at === null);
			return json(route, {
				items: active,
				total_cents: cashflowTotalCents(active),
			});
		}
		if (path === '/api/planning' && method === 'POST') {
			let body: unknown = null;
			try {
				body = request.postDataJSON();
			} catch {
				body = null;
			}
			state.lastCreateBody = body;
			const created = parseCreateBody(body);
			if (created === null) {
				return json(route, { error: 'invalid body' }, 400);
			}
			state.plans.push(created);
			return json(route, created, 201);
		}
		if (path.startsWith('/api/planning/') && method === 'DELETE') {
			const id = path.slice('/api/planning/'.length);
			const plan = state.plans.find((entry) => entry.id === id);
			if (plan) {
				plan.deleted_at = new Date().toISOString();
			}
			return route.fulfill({ status: 204, body: '' });
		}

		return json(route, {});
	});

	return state;
}
