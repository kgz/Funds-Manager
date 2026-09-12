import { expect, test } from '../test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installReportSnapshotsMocks } from '../fixtures/report-snapshots-mocks';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../docs-site/public/screenshots/report-snapshots');

test.describe('Report snapshots docs screenshots', () => {
	test.beforeEach(async ({ page }) => {
		await installReportSnapshotsMocks(page);
		await page.setViewportSize({ width: 1280, height: 900 });
	});

	test('capture list and frozen detail', async ({ page }) => {
		await page.goto('/report-snapshots');
		await expect(page.getByRole('heading', { name: 'Report snapshots', level: 1 })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save snapshot' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'June refinance pack' })).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'list.png'),
			fullPage: false,
		});

		await page.getByRole('link', { name: 'June refinance pack' }).click();
		await expect(page.getByRole('heading', { name: /June refinance pack/ })).toBeVisible();
		await expect(page.getByText('Serviceability breakdown')).toBeVisible();
		await expect(page.getByText('Coverage summary')).toBeVisible();

		await page.screenshot({
			path: path.join(outDir, 'detail.png'),
			fullPage: false,
		});
	});
});
