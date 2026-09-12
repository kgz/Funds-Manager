import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPredictionsMocks } from '../fixtures/predictions-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/predictions');

test.describe('Predictions docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installPredictionsMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture chart and add scenario dialog', async ({ page }) => {
		await page.goto('/predictions');
		await expect(page.getByRole('heading', { name: 'Future predictions', level: 1 })).toBeVisible();
		await expect(page.getByText('Projected balance')).toBeVisible();
		await expect(page.getByRole('paragraph').filter({ hasText: 'Rent increase' })).toBeVisible();
		await expect(page.getByRole('paragraph').filter({ hasText: 'Emergency fund' })).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Add scenario' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add scenario' })).toBeVisible();
		await expect(dialog.getByText('Adjustment lines')).toBeVisible();

		await dialog.screenshot({
			path: path.join(outDir, 'add-scenario.png'),
		});
	});
});
