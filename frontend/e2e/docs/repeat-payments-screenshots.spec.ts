import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installRepeatPaymentsMocks } from '../fixtures/repeat-payments-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/repeat-payments');

test.describe('Repeat payments docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installRepeatPaymentsMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture by-pattern and by-category views', async ({ page }) => {
		await page.goto('/recurring');
		await expect(page.getByRole('heading', { name: 'Repeat payments', level: 1 })).toBeVisible();
		await expect(page.getByText('NETFLIX.COM AU')).toBeVisible();
		await expect(page.getByText('ACME PTY LTD PAYROLL')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'by-pattern.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'By category' }).click();
		await expect(page.getByText('Grouped by category')).toBeVisible();
		await expect(page.getByText('Subscriptions')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'by-category.png'),
			fullPage: false,
		});
	});
});
