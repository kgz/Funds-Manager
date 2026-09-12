import { expect, test } from './test';
import { installReportSnapshotsMocks } from './fixtures/report-snapshots-mocks';

test.describe('Report snapshots', () => {
	test.beforeEach(async ({ page }) => {
		await installReportSnapshotsMocks(page);
	});

	test('loads saved snapshots list from mocked API', async ({ page }) => {
		await page.goto('/report-snapshots');

		await expect(page.getByRole('heading', { name: 'Report snapshots', level: 1 })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save snapshot' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'June refinance pack' })).toBeVisible();
	});

	test('opens frozen snapshot detail', async ({ page }) => {
		await page.goto('/report-snapshots');
		await expect(page.getByRole('link', { name: 'June refinance pack' })).toBeVisible();

		await page.getByRole('link', { name: 'June refinance pack' }).click();
		await expect(page).toHaveURL(/\/report-snapshots\/1$/);
		await expect(page.getByRole('heading', { name: /June refinance pack/ })).toBeVisible();
		await expect(page.getByText('Serviceability breakdown')).toBeVisible();
		await expect(page.getByText('Coverage summary')).toBeVisible();
	});
});
