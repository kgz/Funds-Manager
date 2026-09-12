import { expect, test } from './test';
import { installServiceabilityMocks } from './fixtures/serviceability-mocks';

test.describe('Serviceability', () => {
	test.beforeEach(async ({ page }) => {
		await installServiceabilityMocks(page);
	});

	test('loads base case from mocked API', async ({ page }) => {
		await page.goto('/serviceability');

		await expect(page.getByRole('heading', { name: 'Serviceability', level: 1 })).toBeVisible();
		await expect(page.getByText('Acme Pty Ltd salary')).toBeVisible();
		await expect(page.getByText('Home loan — BankSA')).toBeVisible();
		await expect(page.getByText('Base case').first()).toBeVisible();
	});

	test('switches to stress scenario', async ({ page }) => {
		await page.goto('/serviceability');
		await expect(page.getByText('Acme Pty Ltd salary')).toBeVisible();

		await page.getByRole('button', { name: /Stress \(\+3%\)/ }).click();
		await expect(page.getByText('Stressed repayments')).toBeVisible();
	});
});
