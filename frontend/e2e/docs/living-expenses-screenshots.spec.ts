import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installLivingExpensesMocks } from '../fixtures/living-expenses-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/living-expenses');

test.describe('Living expenses docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installLivingExpensesMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture monthly summary with expanded bucket', async ({ page }) => {
		await page.goto('/lender-expenses');
		await expect(page.getByRole('heading', { name: 'Living expenses', level: 1 })).toBeVisible();
		await expect(page.getByText('Living expenses / month')).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Monthly summary' })).toBeVisible();

		await page.getByRole('button', { name: 'Collapse Housing' }).click();
		await page.getByRole('button', { name: 'Expand Housing' }).click();
		await expect(page.getByText('Housing / Utilities')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'summary.png'),
			fullPage: false,
		});
	});

	test('capture category mapping tab', async ({ page }) => {
		await page.goto('/lender-expenses/mappings');
		await expect(page.getByRole('heading', { name: 'Living expenses', level: 1 })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Category mapping' })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'mappings.png'),
			fullPage: false,
		});
	});
});
