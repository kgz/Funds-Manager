import { expect, test } from '@playwright/test';

test.describe('Net worth chart', () => {
	test('renders chart series on dashboard', async ({ page }) => {
		const netWorthResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/analytics/net-worth') && response.status() === 200
		);

		await page.goto('/');

		const response = await netWorthResponse;
		const payload: unknown = await response.json();
		expect(Array.isArray(payload)).toBe(true);
		expect((payload as unknown[]).length).toBeGreaterThan(0);

		const chart = page.getByTestId('net-worth-chart');
		await expect(chart).toBeVisible();

		const curves = chart.locator(
			'.recharts-line-curve, .recharts-area-curve, .recharts-curve'
		);
		await expect(curves.first()).toBeVisible({ timeout: 15_000 });
		await expect(curves).not.toHaveCount(0);
	});
});
