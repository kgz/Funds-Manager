import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAssetsMocks } from '../fixtures/assets-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/assets');

test.describe('Assets docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installAssetsMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list, add dialog, and edit dialog', async ({ page }) => {
		await page.goto('/assets');
		await expect(page.getByRole('heading', { name: 'Assets', level: 1 })).toBeVisible();
		await expect(page.getByText('Family home — Unley Park')).toBeVisible();
		await expect(page.getByText('AustralianSuper')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Add asset' }).click();
		const addDialog = page.getByRole('dialog');
		await expect(addDialog.getByRole('heading', { name: 'Add asset' })).toBeVisible();
		await expect(addDialog.getByLabel('Name')).toBeVisible();

		await addDialog.screenshot({
			path: path.join(outDir, 'add.png'),
		});

		await addDialog.getByRole('button', { name: 'Close' }).click();
		await expect(addDialog).toBeHidden();

		await page.getByRole('button', { name: 'Edit Family home — Unley Park' }).click();
		const editDialog = page.getByRole('dialog');
		await expect(editDialog.getByRole('heading', { name: 'Edit asset' })).toBeVisible();
		await expect(editDialog.getByRole('heading', { name: 'Valuation history' })).toBeVisible();
		await expect(editDialog.getByText('Bank valuation')).toBeVisible();

		await editDialog.screenshot({
			path: path.join(outDir, 'edit.png'),
		});
	});
});
