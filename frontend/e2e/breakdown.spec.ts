import { expect, test } from './test';
import { installBreakdownMocks } from './fixtures/breakdown-mocks';

test.describe('Breakdown', () => {
	test.beforeEach(async ({ page }) => {
		await installBreakdownMocks(page);
	});

	test('loads breakdown table from mocked API', async ({ page }) => {
		await page.goto('/breakdown');

		await expect(page.getByRole('heading', { name: 'Breakdown', level: 1 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'By category' })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByText('Travel')).toBeVisible();
		await expect(page.getByText('Salary')).toBeVisible();
	});

	test('expands a category row to show merchant groups', async ({ page }) => {
		await page.goto('/breakdown');

		await page.getByRole('row', { name: /Groceries/ }).click();

		await expect(page.getByText('WOOLWORTHS 1234 SYDNEY')).toBeVisible();
		await expect(page.getByText('COLES 5678 SYDNEY')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Move' }).first()).toBeVisible();
	});
});
