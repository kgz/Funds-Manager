import { expect, test } from './test';
import { installSettingsMocks } from './fixtures/settings-mocks';

test.describe('Settings', () => {
	test.beforeEach(async ({ page }) => {
		await installSettingsMocks(page);
	});

	test('loads data storage with saved connection', async ({ page }) => {
		await page.goto('/settings');

		await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Data storage' })).toBeVisible();
		await expect(page.getByText('Homelab PostgreSQL')).toBeVisible();
		await expect(page.getByRole('radiogroup', { name: 'Storage mode' })).toBeVisible();
		await expect(page.getByText('External PostgreSQL')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save & connect' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Test connection' })).toBeVisible();
	});

	test('shows migrations all applied', async ({ page }) => {
		await page.goto('/settings');

		await page.getByRole('heading', { name: 'Database migrations' }).scrollIntoViewIfNeeded();
		await expect(page.getByText('All applied')).toBeVisible();
		await expect(page.getByText('All migrations are applied — schema is up to date.')).toBeVisible();
		await expect(page.getByText('0001_initial')).toBeVisible();
		await expect(page.getByText('0002_categories')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Run pending migrations' })).toBeDisabled();
	});

	test('fills postgres connection fields from saved settings', async ({ page }) => {
		await page.goto('/settings');

		await expect(page.getByRole('textbox', { name: 'Host' })).toHaveValue('192.168.1.10');
		await expect(page.getByRole('textbox', { name: 'Port' })).toHaveValue('5432');
		await expect(page.getByRole('textbox', { name: 'Database name' })).toHaveValue(
			'funds_manager'
		);
		await expect(page.getByRole('textbox', { name: 'Username' })).toHaveValue('funds');
	});
});
