import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installLiabilitiesMocks } from '../fixtures/liabilities-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/liabilities');

test.describe('Liabilities docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installLiabilitiesMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list, add dialog, and edit dialog', async ({ page }) => {
		await page.goto('/liabilities');
		await expect(page.getByRole('heading', { name: 'Liabilities', level: 1 })).toBeVisible();
		await expect(page.getByText('Home loan — BankSA')).toBeVisible();
		await expect(page.getByText('Car loan — Toyota Finance')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Add liability' }).click();
		const addDialog = page.getByRole('dialog');
		await expect(addDialog.getByRole('heading', { name: 'Add liability' })).toBeVisible();
		await expect(addDialog.getByLabel('Name')).toBeVisible();

		await addDialog.screenshot({
			path: path.join(outDir, 'add.png'),
		});

		await addDialog.getByRole('button', { name: 'Close' }).click();
		await expect(addDialog).toBeHidden();

		await page.getByRole('button', { name: 'Edit Home loan — BankSA' }).click();
		const editDialog = page.getByRole('dialog');
		await expect(editDialog.getByRole('heading', { name: 'Edit liability' })).toBeVisible();
		await expect(editDialog.getByRole('heading', { name: 'Balance history' })).toBeVisible();
		await expect(editDialog.getByText('Statement')).toBeVisible();

		await editDialog.screenshot({
			path: path.join(outDir, 'edit.png'),
		});
	});
});
