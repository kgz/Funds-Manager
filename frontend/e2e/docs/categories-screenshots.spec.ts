import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installCategoriesMocks } from '../fixtures/categories-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/categories');

test.describe('Categories docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installCategoriesMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture tree and new category dialog', async ({ page }) => {
		await page.goto('/categories');
		await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByText('Uncategorized transactions.')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'New category' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'New category' })).toBeVisible();

		await dialog.screenshot({
			path: path.join(outDir, 'add.png'),
		});
	});
});
