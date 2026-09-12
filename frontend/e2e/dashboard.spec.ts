import { expect, test } from './test';
import { installDashboardMocks } from './fixtures/dashboard-mocks';

test.describe('Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await installDashboardMocks(page);
	});

	test('loads overview from mocked API', async ({ page }) => {
		await page.goto('/');

		await expect(
			page.getByRole('heading', { name: 'Spending & Income Overview', level: 1 })
		).toBeVisible();
		await expect(page.getByText('Current Balance')).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByText('Travel')).toBeVisible();
		await expect(page.getByText('Salary')).toBeVisible();
	});

	test('drills into a spending category', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Groceries')).toBeVisible();
		await page.getByText('Groceries', { exact: true }).first().click();

		await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible();
		await expect(page.getByText('WOOLWORTHS 1234 SYDNEY')).toBeVisible();
		await expect(page.getByText('COLES 5678 SYDNEY')).toBeVisible();
	});
});
