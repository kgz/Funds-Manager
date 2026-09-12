import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSettingsMocks } from '../fixtures/settings-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/settings');

test.describe('Settings docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installSettingsMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture storage and migrations sections', async ({ page }) => {
		await page.goto('/settings');
		await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Data storage' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save & connect' })).toBeVisible();
		await expect(page.getByText('Homelab PostgreSQL')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'storage.png'),
			fullPage: false,
		});

		await page.getByRole('heading', { name: 'Database migrations' }).scrollIntoViewIfNeeded();
		await expect(page.getByText('All applied')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'migrations.png'),
			fullPage: false,
		});
	});
});
