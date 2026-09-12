import { expect, test } from './test';
import { installIncomeMocks } from './fixtures/income-mocks';

test.describe('Income', () => {
	test.beforeEach(async ({ page }) => {
		await installIncomeMocks(page);
	});

	test('loads income streams from mocked API', async ({ page }) => {
		await page.goto('/income');

		await expect(page.getByRole('heading', { name: 'Income', level: 1 })).toBeVisible();
		await expect(page.getByText('Acme salary')).toBeVisible();
		await expect(page.getByText('Consulting')).toBeVisible();
	});

	test('edits a stream and saves via mocked PUT', async ({ page }) => {
		await page.goto('/income');
		await expect(page.getByText('Acme salary')).toBeVisible();

		await page.getByRole('button', { name: 'Edit' }).first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit stream' })).toBeVisible();

		await dialog.locator('label').filter({ hasText: 'Label' }).locator('input').fill('Acme salary (updated)');
		await dialog.getByPlaceholder('Contract or payslip amount').fill('12500');

		const putResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/income-streams/profiles') &&
				response.request().method() === 'PUT' &&
				response.status() === 200
		);
		await dialog.getByRole('button', { name: 'Save' }).click();
		const response = await putResponse;

		const raw: unknown = JSON.parse(response.request().postData() ?? '{}');
		expect(raw).toEqual(
			expect.objectContaining({
				stream_key: 'acme-payroll',
				display_label: 'Acme salary (updated)',
				gross_monthly_dollars: 12500,
			})
		);
		await expect(dialog).toHaveCount(0);
	});
});
