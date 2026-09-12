import { defineConfig, devices } from '@playwright/test';

const e2eCoverage = process.env.E2E_COVERAGE === '1';
const port = e2eCoverage ? 3197 : 3000;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: [
		{
			command: 'pnpm dev',
			url: baseURL,
			reuseExistingServer: !e2eCoverage && !process.env.CI,
			timeout: 120_000,
			env: {
				E2E_COVERAGE: e2eCoverage ? '1' : '',
				VITE_DEV_HTTP: process.env.VITE_DEV_HTTP ?? 'true',
				VITE_PORT: String(port),
			},
		},
	],
});
