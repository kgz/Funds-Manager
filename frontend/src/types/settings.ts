import axios from 'axios';

export type StorageMode = 'postgres' | 'local';

export type DatabaseUrlSource = 'config' | 'environment';

export type StorageSettings = {
	configured_storage_mode: StorageMode;
	runtime_storage_mode: StorageMode;
	database_url: string | null;
	database_url_source: DatabaseUrlSource;
	sqlite_path: string;
	config_file_path: string;
	local_storage_available: boolean;
	requires_restart: boolean;
};

export type StorageSettingsUpdate = {
	storage_mode?: StorageMode;
	database_url?: string;
	sqlite_path?: string;
};

export type StorageSettingsUpdateResult = {
	ok: boolean;
	message: string;
	requires_restart: boolean;
};

export type StorageTestResult = {
	ok: boolean;
	message: string;
};

export type MigrationStatusItem = {
	name: string;
	description: string;
	applied: boolean;
};

export type MigrationsStatus = {
	items: MigrationStatusItem[];
	pending_count: number;
};

export type MigrationsRunResult = {
	ok: boolean;
	applied_count: number;
	message: string;
};

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown): boolean | null {
	return typeof value === 'boolean' ? value : null;
}

function isStorageMode(value: string): value is StorageMode {
	return value === 'postgres' || value === 'local';
}

function isDatabaseUrlSource(value: string): value is DatabaseUrlSource {
	return value === 'config' || value === 'environment';
}

function normalizeStorageSettings(raw: unknown): StorageSettings | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const configuredMode = readString(
		Reflect.get(raw, 'configuredStorageMode') ??
			Reflect.get(raw, 'configured_storage_mode')
	);
	const runtimeMode = readString(
		Reflect.get(raw, 'runtimeStorageMode') ?? Reflect.get(raw, 'runtime_storage_mode')
	);
	const databaseUrlSource = readString(
		Reflect.get(raw, 'databaseUrlSource') ?? Reflect.get(raw, 'database_url_source')
	);
	const sqlitePath = readString(
		Reflect.get(raw, 'sqlitePath') ?? Reflect.get(raw, 'sqlite_path')
	);
	const configFilePath = readString(
		Reflect.get(raw, 'configFilePath') ?? Reflect.get(raw, 'config_file_path')
	);
	const localStorageAvailable = readBoolean(
		Reflect.get(raw, 'localStorageAvailable') ??
			Reflect.get(raw, 'local_storage_available')
	);
	const requiresRestart = readBoolean(
		Reflect.get(raw, 'requiresRestart') ?? Reflect.get(raw, 'requires_restart')
	);
	const databaseUrlRaw =
		Reflect.get(raw, 'databaseUrl') ?? Reflect.get(raw, 'database_url');
	const databaseUrl =
		databaseUrlRaw === null || databaseUrlRaw === undefined
			? null
			: readString(databaseUrlRaw);

	if (
		configuredMode === null ||
		runtimeMode === null ||
		databaseUrlSource === null ||
		sqlitePath === null ||
		configFilePath === null ||
		localStorageAvailable === null ||
		requiresRestart === null ||
		!isStorageMode(configuredMode) ||
		!isStorageMode(runtimeMode) ||
		!isDatabaseUrlSource(databaseUrlSource)
	) {
		return null;
	}

	return {
		configured_storage_mode: configuredMode,
		runtime_storage_mode: runtimeMode,
		database_url: databaseUrl,
		database_url_source: databaseUrlSource,
		sqlite_path: sqlitePath,
		config_file_path: configFilePath,
		local_storage_available: localStorageAvailable,
		requires_restart: requiresRestart,
	};
}

function normalizeStorageUpdateResult(raw: unknown): StorageSettingsUpdateResult | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const ok = readBoolean(Reflect.get(raw, 'ok'));
	const message = readString(Reflect.get(raw, 'message'));
	const requiresRestart = readBoolean(
		Reflect.get(raw, 'requiresRestart') ?? Reflect.get(raw, 'requires_restart')
	);
	if (ok === null || message === null || requiresRestart === null) {
		return null;
	}
	return { ok, message, requires_restart: requiresRestart };
}

function normalizeStorageTestResult(raw: unknown): StorageTestResult | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const ok = readBoolean(Reflect.get(raw, 'ok'));
	const message = readString(Reflect.get(raw, 'message'));
	if (ok === null || message === null) {
		return null;
	}
	return { ok, message };
}

function normalizeMigrationItem(raw: unknown): MigrationStatusItem | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const name = readString(Reflect.get(raw, 'name'));
	const description = readString(Reflect.get(raw, 'description'));
	const applied = readBoolean(Reflect.get(raw, 'applied'));
	if (name === null || description === null || applied === null) {
		return null;
	}
	return { name, description, applied };
}

function normalizeMigrationsStatus(raw: unknown): MigrationsStatus | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const itemsRaw = Reflect.get(raw, 'items');
	const pendingCount = readPendingCount(raw);
	if (!Array.isArray(itemsRaw) || pendingCount === null) {
		return null;
	}
	const items: MigrationStatusItem[] = [];
	for (const item of itemsRaw) {
		const normalized = normalizeMigrationItem(item);
		if (normalized === null) {
			return null;
		}
		items.push(normalized);
	}
	return { items, pending_count: pendingCount };
}

function readPendingCount(raw: unknown): number | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const value = Reflect.get(raw, 'pendingCount') ?? Reflect.get(raw, 'pending_count');
	return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function normalizeMigrationsRunResult(raw: unknown): MigrationsRunResult | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const ok = readBoolean(Reflect.get(raw, 'ok'));
	const message = readString(Reflect.get(raw, 'message'));
	const appliedCountRaw =
		Reflect.get(raw, 'appliedCount') ?? Reflect.get(raw, 'applied_count');
	const appliedCount =
		typeof appliedCountRaw === 'number' && Number.isInteger(appliedCountRaw)
			? appliedCountRaw
			: null;
	if (ok === null || message === null || appliedCount === null) {
		return null;
	}
	return { ok, applied_count: appliedCount, message };
}

export async function fetchStorageSettings(): Promise<StorageSettings> {
	const response = await axios.get('/api/settings/storage');
	const settings = normalizeStorageSettings(response.data);
	if (settings === null) {
		throw new Error('Invalid storage settings response');
	}
	return settings;
}

export async function updateStorageSettings(
	payload: StorageSettingsUpdate
): Promise<StorageSettingsUpdateResult> {
	const response = await axios.put('/api/settings/storage', payload);
	const result = normalizeStorageUpdateResult(response.data);
	if (result === null) {
		throw new Error('Invalid storage settings update response');
	}
	return result;
}

export async function testStorageConnection(
	databaseUrl?: string
): Promise<StorageTestResult> {
	const response = await axios.post('/api/settings/storage/test', {
		database_url: databaseUrl,
	});
	const result = normalizeStorageTestResult(response.data);
	if (result === null) {
		throw new Error('Invalid storage test response');
	}
	return result;
}

export async function fetchMigrationsStatus(): Promise<MigrationsStatus> {
	const response = await axios.get('/api/settings/migrations');
	const status = normalizeMigrationsStatus(response.data);
	if (status === null) {
		throw new Error('Invalid migrations status response');
	}
	return status;
}

export async function runMigrations(): Promise<MigrationsRunResult> {
	const response = await axios.post('/api/settings/migrations/run');
	const result = normalizeMigrationsRunResult(response.data);
	if (result === null) {
		throw new Error('Invalid migrations run response');
	}
	return result;
}
