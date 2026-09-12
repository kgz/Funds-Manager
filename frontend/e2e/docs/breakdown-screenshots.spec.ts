import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installBreakdownMocks } from '../fixtures/breakdown-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/breakdown');

test.describe('Breakdown docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installBreakdownMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture table and expanded category', async ({ page }) => {
		await page.goto('/breakdown');
		await expect(page.getByRole('heading', { name: 'Breakdown', level: 1 })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'By category' })).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('row', { name: /Groceries/ }).click();
		await expect(page.getByText('WOOLWORTHS 1234 SYDNEY')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Move' }).first()).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'expanded.png'),
			fullPage: false,
		});
	});
});
