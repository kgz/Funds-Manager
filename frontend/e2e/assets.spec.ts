import { expect, test } from './test';
import { installAssetsMocks } from './fixtures/assets-mocks';

test.describe('Assets', () => {
	test.beforeEach(async ({ page }) => {
		await installAssetsMocks(page);
	});

	test('loads assets list from mocked API', async ({ page }) => {
		await page.goto('/assets');

		await expect(page.getByRole('heading', { name: 'Assets', level: 1 })).toBeVisible();
		await expect(page.getByText('Family home — Unley Park')).toBeVisible();
		await expect(page.getByText('AustralianSuper')).toBeVisible();
		await expect(page.getByText('Bank valuation')).toBeVisible();
	});

	test('opens add asset dialog', async ({ page }) => {
		await page.goto('/assets');
		await page.getByRole('button', { name: 'Add asset' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add asset' })).toBeVisible();
		await expect(dialog.getByLabel('Name')).toBeVisible();
		await expect(dialog.getByLabel('Type')).toBeVisible();
		await expect(dialog.getByLabel('Current value ($)')).toBeVisible();
	});

	test('opens edit dialog with valuation history', async ({ page }) => {
		await page.goto('/assets');
		await page.getByRole('button', { name: 'Edit Family home — Unley Park' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit asset' })).toBeVisible();
		await expect(dialog.getByRole('heading', { name: 'Valuation history' })).toBeVisible();
		await expect(dialog.getByText('Bank valuation')).toBeVisible();
		await expect(dialog.getByText('Agent appraisal')).toBeVisible();
	});
});
