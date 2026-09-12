import { expect, test } from './test';
import { installStatementsMocks } from './fixtures/statements-mocks';

test.describe('Statements', () => {
	test.beforeEach(async ({ page }) => {
		await installStatementsMocks(page);
	});

	test('loads imported statements and missing period alert', async ({ page }) => {
		await page.goto('/statements');

		await expect(page.getByRole('heading', { name: 'Statements', level: 1 })).toBeVisible();
		await expect(page.getByText('Missing periods detected.')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Imported statements' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'CBA Offset' }).first()).toBeVisible();
		await expect(page.getByText('Parsed').first()).toBeVisible();
		await expect(page.getByText('Missing').first()).toBeVisible();
		await expect(page.getByRole('button', { name: 'Upload PDF' })).toBeVisible();
	});

	test('shows drop zone for PDF upload', async ({ page }) => {
		await page.goto('/statements');

		await expect(
			page.getByRole('button', { name: 'Drop PDF statements here or click to browse' })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Drop bank statement PDFs' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Browse files' })).toBeVisible();
	});
});
