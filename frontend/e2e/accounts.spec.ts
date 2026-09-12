import { expect, test } from './test';
import { installAccountsMocks } from './fixtures/accounts-mocks';

test.describe('Accounts', () => {
	test.beforeEach(async ({ page }) => {
		await installAccountsMocks(page);
	});

	test('loads accounts list from mocked API', async ({ page }) => {
		await page.goto('/accounts');

		await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
		await expect(page.getByText('Everyday')).toBeVisible();
		await expect(page.getByText('Offset')).toBeVisible();
		await expect(page.getByText('062-000 12345678')).toBeVisible();
	});

	test('edits an account via mocked PUT', async ({ page }) => {
		await page.goto('/accounts');
		await page.getByRole('button', { name: 'Edit Everyday' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit account' })).toBeVisible();
		await expect(dialog.getByText('062-000 12345678')).toBeVisible();

		await dialog.getByLabel('Bank').fill('CommBank');
		await dialog.getByLabel('Display name').fill('Everyday spending');

		const updateResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/accounts/1') &&
				response.request().method() === 'PUT' &&
				response.status() === 200
		);
		await dialog.getByRole('button', { name: 'Save changes' }).click();
		await updateResponse;

		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole('cell', { name: 'Everyday spending', exact: true })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'CommBank', exact: true })).toBeVisible();
		await expect(page.getByRole('status')).toContainText('Everyday spending');
	});
});
