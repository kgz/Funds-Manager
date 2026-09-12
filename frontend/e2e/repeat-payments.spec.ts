import { expect, test } from './test';
import { installRepeatPaymentsMocks } from './fixtures/repeat-payments-mocks';

test.describe('Repeat payments', () => {
	test.beforeEach(async ({ page }) => {
		await installRepeatPaymentsMocks(page);
	});

	test('loads patterns from mocked API', async ({ page }) => {
		await page.goto('/recurring');

		await expect(page.getByRole('heading', { name: 'Repeat payments', level: 1 })).toBeVisible();
		await expect(page.getByText('NETFLIX.COM AU')).toBeVisible();
		await expect(page.getByText('ACME PTY LTD PAYROLL')).toBeVisible();
	});

	test('switches to by-category view', async ({ page }) => {
		await page.goto('/recurring');
		await expect(page.getByText('NETFLIX.COM AU')).toBeVisible();

		await page.getByRole('button', { name: 'By category' }).click();
		await expect(page.getByText('Grouped by category')).toBeVisible();
		await expect(page.getByText('Subscriptions')).toBeVisible();
	});
});
