import { expect, test } from './test';
import { installPredictionsMocks } from './fixtures/predictions-mocks';

test.describe('Predictions', () => {
	test.beforeEach(async ({ page }) => {
		await installPredictionsMocks(page);
	});

	test('loads chart, scenarios, and goals from mocked API', async ({ page }) => {
		await page.goto('/predictions');

		await expect(
			page.getByRole('heading', { name: 'Future predictions', level: 1 })
		).toBeVisible();
		await expect(page.getByText('Projected balance')).toBeVisible();
		await expect(page.getByRole('paragraph').filter({ hasText: 'Rent increase' })).toBeVisible();
		await expect(page.getByRole('paragraph').filter({ hasText: 'Emergency fund' })).toBeVisible();
	});

	test('opens add scenario dialog', async ({ page }) => {
		await page.goto('/predictions');
		await page.getByRole('button', { name: 'Add scenario' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Add scenario' })).toBeVisible();
		await expect(dialog.getByLabel('Name')).toBeVisible();
		await expect(dialog.getByText('Adjustment lines')).toBeVisible();
		await expect(dialog.getByLabel('Add from planned spending')).toBeVisible();
	});
});
