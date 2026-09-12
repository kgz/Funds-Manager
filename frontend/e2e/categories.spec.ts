import { expect, test } from './test';
import { installCategoriesMocks } from './fixtures/categories-mocks';

test.describe('Categories', () => {
	test.beforeEach(async ({ page }) => {
		await installCategoriesMocks(page);
	});

	test('loads category tree and uncategorized banner', async ({ page }) => {
		await page.goto('/categories');

		await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible();
		await expect(page.getByText('Groceries')).toBeVisible();
		await expect(page.getByText('Transport')).toBeVisible();
		await expect(page.getByText('Salary')).toBeVisible();
		await expect(page.getByText('Uncategorized transactions.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Review on Transactions' })).toBeVisible();
	});

	test('opens new category dialog', async ({ page }) => {
		await page.goto('/categories');
		await page.getByRole('button', { name: 'New category' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'New category' })).toBeVisible();
	});

	test('filters categories by search', async ({ page }) => {
		await page.goto('/categories');
		await expect(page.getByText('Groceries')).toBeVisible();

		await page.getByPlaceholder('Search categories…').fill('Transport');

		await expect(page.getByText('Transport')).toBeVisible();
		await expect(page.getByText('Groceries')).toHaveCount(0);
	});
});
