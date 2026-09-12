import { expect, test } from './test';
import { installLivingExpensesMocks } from './fixtures/living-expenses-mocks';

test.describe('Living expenses', () => {
	test.beforeEach(async ({ page }) => {
		await installLivingExpensesMocks(page);
	});

	test('loads monthly summary and expands housing breakdown', async ({ page }) => {
		await page.goto('/lender-expenses');

		await expect(page.getByRole('heading', { name: 'Living expenses', level: 1 })).toBeVisible();
		await expect(page.getByText('Living expenses / month')).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Monthly summary' })).toBeVisible();

		await page.getByRole('button', { name: 'Collapse Housing' }).click();
		await page.getByRole('button', { name: 'Expand Housing' }).click();
		await expect(page.getByText('Housing / Utilities')).toBeVisible();
	});

	test('updates category mapping via mocked PUT', async ({ page }) => {
		await page.goto('/lender-expenses/mappings');

		await expect(page.getByRole('heading', { name: 'Living expenses', level: 1 })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Category mapping' })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();

		const putResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/lender-expenses/mappings') &&
				response.request().method() === 'PUT' &&
				response.status() === 200
		);
		await page.getByLabel('Lender bucket for Groceries').selectOption('transport');
		const response = await putResponse;

		const raw: unknown = JSON.parse(response.request().postData() ?? '{}');
		expect(raw).toEqual(
			expect.objectContaining({
				category_id: 1,
				bucket_key: 'transport',
			})
		);
	});
});
