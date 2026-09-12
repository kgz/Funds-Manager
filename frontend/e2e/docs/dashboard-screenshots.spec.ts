import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installDashboardMocks } from '../fixtures/dashboard-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/dashboard');

test.describe('Dashboard docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installDashboardMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture overview and spending drilldown', async ({ page }) => {
		await page.goto('/');
		await expect(
			page.getByRole('heading', { name: 'Spending & Income Overview', level: 1 })
		).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByText('Current Balance')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByText('Groceries', { exact: true }).first().click();
		await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible();
		await expect(page.getByText('WOOLWORTHS 1234 SYDNEY')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'spending-drilldown.png'),
			fullPage: false,
		});
	});
});
