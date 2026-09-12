import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIncomeMocks } from '../fixtures/income-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/income');

test.describe('Income docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installIncomeMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture summary and edit stream dialog', async ({ page }) => {
		await page.goto('/income');
		await expect(page.getByRole('heading', { name: 'Income', level: 1 })).toBeVisible();
		await expect(page.getByText('Acme salary')).toBeVisible();
		await expect(page.getByText('Consulting')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Edit' }).first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit stream' })).toBeVisible();
		await expect(dialog.getByPlaceholder('Contract or payslip amount')).toBeVisible();

		await dialog.screenshot({
			path: path.join(outDir, 'edit-stream.png'),
		});
	});
});
