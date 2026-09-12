import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installServiceabilityMocks } from '../fixtures/serviceability-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/serviceability');

test.describe('Serviceability docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installServiceabilityMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture base case and stress scenario', async ({ page }) => {
		await page.goto('/serviceability');
		await expect(page.getByRole('heading', { name: 'Serviceability', level: 1 })).toBeVisible();
		await expect(page.getByText('Acme Pty Ltd salary')).toBeVisible();
		await expect(page.getByText('Home loan — BankSA')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'overview.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: /Stress \(\+3%\)/ }).click();
		await expect(page.getByText('Stressed repayments')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'stress.png'),
			fullPage: false,
		});
	});
});
