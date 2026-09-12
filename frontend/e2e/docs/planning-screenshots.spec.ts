import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPlanningMocks } from '../fixtures/planning-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/planning');

test.describe('Planning docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installPlanningMocks(page);
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test('capture list and add-plan dialogs', async ({ page }) => {
		await page.goto('/planning');
		await expect(page.getByRole('heading', { name: 'Planning', level: 1 })).toBeVisible();
		await expect(page.getByText('Bali holiday')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('button', { name: 'Add plan' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add plan' })).toBeVisible();
		await expect(dialog.getByRole('radio', { name: /Cashflow/ })).toHaveAttribute(
			'aria-checked',
			'true'
		);

		await dialog.screenshot({
			path: path.join(outDir, 'add-cashflow.png'),
		});

		await dialog.getByRole('radio', { name: /Loan redraw/ }).click();
		await expect(dialog.getByPlaceholder('50000.00')).toBeVisible();

		await dialog.screenshot({
			path: path.join(outDir, 'add-redraw.png'),
		});
	});
});
