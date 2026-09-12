import { expect, test } from './test';
import { installPlanningMocks, type PlanningMockState } from './fixtures/planning-mocks';

test.describe('Planning hub', () => {
	let mocks: PlanningMockState;

	test.beforeEach(async ({ page }) => {
		mocks = await installPlanningMocks(page);
	});

	test('loads planning page from mocked API and filters by kind', async ({ page }) => {
		await page.goto('/planning');

		await expect(page.getByRole('heading', { name: 'Planning', level: 1 })).toBeVisible();
		await expect(page.getByText('Bali holiday')).toBeVisible();
		await expect(page.getByText('Offset redraw — kitchen')).toBeVisible();

		await page.getByRole('tab', { name: 'Cashflow' }).click();
		await expect(page.getByText('Bali holiday')).toBeVisible();
		await expect(page.getByText('Offset redraw — kitchen')).toHaveCount(0);

		await page.getByRole('tab', { name: 'Loans' }).click();
		await expect(page.getByText('Offset redraw — kitchen')).toBeVisible();
		await expect(page.getByText('Bali holiday')).toHaveCount(0);
	});

	test('redirects /planned to /planning', async ({ page }) => {
		await page.goto('/planned');
		await expect(page).toHaveURL(/\/planning$/);
		await expect(page.getByRole('heading', { name: 'Planning', level: 1 })).toBeVisible();
	});

	test('plan kind picker shows selected state and swaps fields', async ({ page }) => {
		await page.goto('/planning');
		await page.getByRole('button', { name: 'Add plan' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add plan' })).toBeVisible();

		const kindGroup = dialog.getByRole('radiogroup', { name: 'Plan kind' });
		const cashflow = kindGroup.getByRole('radio', { name: /Cashflow/ });
		const redraw = kindGroup.getByRole('radio', { name: /Loan redraw/ });

		await expect(cashflow).toHaveAttribute('aria-checked', 'true');
		await expect(redraw).toHaveAttribute('aria-checked', 'false');
		await expect(dialog.getByText('When you expect this cashflow to occur.')).toBeVisible();
		await expect(dialog.getByPlaceholder('0.00')).toBeVisible();

		await redraw.click();

		await expect(redraw).toHaveAttribute('aria-checked', 'true');
		await expect(cashflow).toHaveAttribute('aria-checked', 'false');
		await expect(
			dialog.getByText('Credits the destination account and increases the loan balance.')
		).toBeVisible();
		await expect(dialog.getByPlaceholder('50000.00')).toBeVisible();
		await expect(dialog.getByLabel('Destination account')).toBeVisible();
		await expect(dialog.getByLabel('Liability')).toBeVisible();
	});

	test('creates a loan redraw via mocked POST', async ({ page }) => {
		await page.goto('/planning');
		await page.getByRole('button', { name: 'Add plan' }).click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('radio', { name: /Loan redraw/ }).click();
		await dialog.getByPlaceholder('e.g. Holiday, Offset redraw').fill('Test redraw');
		await dialog.getByLabel('Redraw amount ($)').fill('25000');
		await dialog.locator('input[type="date"]').fill('2026-10-15');
		await dialog.getByLabel('Liability').selectOption('10');
		await dialog.getByLabel('Destination account').selectOption('1');

		const createResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/planning') &&
				response.request().method() === 'POST' &&
				response.status() === 201
		);
		await dialog.getByRole('button', { name: 'Add', exact: true }).click();
		await createResponse;

		await expect(dialog).toHaveCount(0);
		await expect(page.getByText('Test redraw')).toBeVisible();

		expect(mocks.lastCreateBody).toMatchObject({
			plan_kind: 'loan_redraw',
			name: 'Test redraw',
			amount_cents: 2_500_000,
			start_date: '2026-10-15',
			liability_id: 10,
			financial_account_id: 1,
		});
	});
});
