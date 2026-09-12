import type { Page, Route } from '@playwright/test';

const STORAGE_SETTINGS = {
	configured_storage_mode: 'postgres',
	runtime_storage_mode: 'postgres',
	database_url: 'postgresql://funds:***@192.168.1.10:5432/funds_manager',
	runtime_database_url: 'postgresql://funds:••••••••@192.168.1.10:5432/funds_manager',
	database_url_source: 'config',
	pg_host: '192.168.1.10',
	pg_port: 5432,
	pg_database: 'funds_manager',
	pg_user: 'funds',
	pg_has_password: true,
	sqlite_path: '/home/user/.funds-manager/data.db',
	config_file_path: '/home/user/.config/funds-manager/config.toml',
	local_storage_available: false,
	requires_restart: false,
};

const SAVED_CONNECTIONS = {
	items: [
		{
			id: 'conn-homelab',
			name: 'Homelab PostgreSQL',
			host: '192.168.1.10',
			port: 5432,
			database: 'funds_manager',
			user: 'funds',
			has_password: true,
			active: true,
		},
	],
};

const MIGRATIONS_STATUS = {
	items: [
		{
			name: '0001_initial',
			description: 'Initial schema',
			applied: true,
		},
		{
			name: '0002_categories',
			description: 'Category tree and colours',
			applied: true,
		},
		{
			name: '0003_statements',
			description: 'Statement import tables',
			applied: true,
		},
	],
	pending_count: 0,
	target_database: 'funds_manager',
	using_live_pool: true,
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

export async function installSettingsMocks(page: Page): Promise<void> {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const path = url.pathname;

		if (path === '/api/planning/match-suggestions/count' && method === 'GET') {
			return json(route, { count: 0 });
		}
		if (path === '/api/planning/match-suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/transfers/suggestions' && method === 'GET') {
			return json(route, []);
		}
		if (path === '/api/settings/storage' && method === 'GET') {
			return json(route, STORAGE_SETTINGS);
		}
		if (path === '/api/settings/connections' && method === 'GET') {
			return json(route, SAVED_CONNECTIONS);
		}
		if (path === '/api/settings/migrations/status' && method === 'POST') {
			return json(route, MIGRATIONS_STATUS);
		}

		return json(route, {});
	});
}
