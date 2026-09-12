import { expect, test } from './test';
import { installTransactionsMocks } from './fixtures/transactions-mocks';

test.describe('Transactions', () => {
	test.beforeEach(async ({ page }) => {
		await installTransactionsMocks(page);
	});

	test('loads transactions and transfer suggestion from mocked API', async ({ page }) => {
		await page.goto('/transactions');

		await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
		await expect(page.getByText('WOOLWORTHS 1234')).toBeVisible();
		await expect(page.getByText('ACME CORP PAYROLL')).toBeVisible();
		await expect(page.getByText('Transfer match found')).toBeVisible();
	});

	test('selects rows and applies suggested category via mocked PATCH', async ({ page }) => {
		const listResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/transactions') &&
				response.request().method() === 'GET' &&
				response.status() === 200
		);
		await page.goto('/transactions');
		await listResponse;
		await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
		await expect(page.getByText('WOOLWORTHS 1234')).toBeVisible();

		await page.getByRole('checkbox', { name: 'Select transaction 1001' }).click();
		await expect(page.getByText('1 transaction selected')).toBeVisible();

		const applySuggested = page.locator('button:not([title])', { hasText: 'Apply Groceries' });
		await expect(applySuggested).toBeVisible();

		const patchResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/transactions/categories') &&
				response.request().method() === 'PATCH' &&
				response.status() === 200
		);
		await applySuggested.click();
		const response = await patchResponse;

		const raw: unknown = JSON.parse(response.request().postData() ?? '{}');
		expect(raw).toEqual(
			expect.objectContaining({
				transaction_ids: [1001],
				category_id: 1,
			})
		);
	});
});
