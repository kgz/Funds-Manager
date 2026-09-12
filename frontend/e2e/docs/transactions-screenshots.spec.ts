import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installTransactionsMocks } from '../fixtures/transactions-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/transactions');

test.describe('Transactions docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installTransactionsMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list and bulk actions', async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
		await expect(page.getByText('WOOLWORTHS 1234')).toBeVisible();
		await expect(page.getByText('ACME CORP PAYROLL')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('checkbox', { name: 'Select transaction 1001' }).click();
		await page.getByRole('checkbox', { name: 'Select transaction 1003' }).click();
		await expect(page.getByText('2 transactions selected')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'bulk-actions.png'),
			fullPage: false,
		});
	});

	test('capture transfer suggestion callout', async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByText('Transfer match found')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'transfer-suggestion.png'),
			fullPage: false,
		});
	});
});
