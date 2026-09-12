import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installStatementsMocks } from '../fixtures/statements-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/statements');

test.describe('Statements docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installStatementsMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list with imported statements and missing period alert', async ({ page }) => {
		await page.goto('/statements');
		await expect(page.getByRole('heading', { name: 'Statements', level: 1 })).toBeVisible();
		await expect(page.getByText('Missing periods detected.')).toBeVisible();
		await expect(page.getByRole('cell', { name: 'CBA Offset' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Upload PDF' })).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});
	});
});
