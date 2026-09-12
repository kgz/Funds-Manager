import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAccountsMocks } from '../fixtures/accounts-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/accounts');

test.describe('Accounts docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installAccountsMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list and edit dialog', async ({ page }) => {
		await page.goto('/accounts');
		await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
		await expect(page.getByText('Everyday')).toBeVisible();
		await expect(page.getByText('Offset')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Edit Everyday' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit account' })).toBeVisible();
		await expect(dialog.getByText('062-000 12345678')).toBeVisible();

		await dialog.screenshot({
			path: path.join(outDir, 'edit.png'),
		});
	});
});
