import { expect, test } from './test';
import { installLiabilitiesMocks } from './fixtures/liabilities-mocks';

test.describe('Liabilities', () => {
	test.beforeEach(async ({ page }) => {
		await installLiabilitiesMocks(page);
	});

	test('loads liabilities list from mocked API', async ({ page }) => {
		await page.goto('/liabilities');

		await expect(page.getByRole('heading', { name: 'Liabilities', level: 1 })).toBeVisible();
		await expect(page.getByText('Home loan — BankSA')).toBeVisible();
		await expect(page.getByText('Car loan — Toyota Finance')).toBeVisible();
	});

	test('opens add liability dialog', async ({ page }) => {
		await page.goto('/liabilities');
		await page.getByRole('button', { name: 'Add liability' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add liability' })).toBeVisible();
		await expect(dialog.getByLabel('Name')).toBeVisible();
	});

	test('opens edit dialog with balance history', async ({ page }) => {
		await page.goto('/liabilities');
		await page.getByRole('button', { name: 'Edit Home loan — BankSA' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit liability' })).toBeVisible();
		await expect(dialog.getByRole('heading', { name: 'Balance history' })).toBeVisible();
		await expect(dialog.getByText('Statement')).toBeVisible();
		await expect(dialog.getByText('Loan portal')).toBeVisible();
	});
});
