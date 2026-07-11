import axios from 'axios';

export type StorageMode = 'postgres' | 'local';

export type DatabaseUrlSource = 'config' | 'environment';

export type StorageSettings = {
	configured_storage_mode: StorageMode;
	runtime_storage_mode: StorageMode;
	database_url: string | null;
	runtime_database_url: string | null;
	database_url_source: DatabaseUrlSource;
	pg_host: string | null;
	pg_port: number | null;
	pg_database: string | null;
	pg_user: string | null;
	pg_has_password: boolean;
	sqlite_path: string;
	config_file_path: string;
	local_storage_available: boolean;
	requires_restart: boolean;
};

export type PostgresConnectionInput = {
	host: string;
	port: string;
	database: string;
	user: string;
	password: string;
};

export type StorageSettingsUpdate = {
	storage_mode?: StorageMode;
	postgres?: PostgresConnectionInput;
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

export type StorageConnectResult = {
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

function readOptionalString(raw: unknown, camel: string, snake: string): string | null {
	const value = Reflect.get(raw as object, camel) ?? Reflect.get(raw as object, snake);
	return value === null || value === undefined ? null : readString(value);
}

function readOptionalNumber(raw: unknown, camel: string, snake: string): number | null {
	const value = Reflect.get(raw as object, camel) ?? Reflect.get(raw as object, snake);
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
	const runtimeDatabaseUrlRaw =
		Reflect.get(raw, 'runtimeDatabaseUrl') ??
			Reflect.get(raw, 'runtime_database_url');
	const runtimeDatabaseUrl =
		runtimeDatabaseUrlRaw === null || runtimeDatabaseUrlRaw === undefined
			? null
			: readString(runtimeDatabaseUrlRaw);
	const pgHost = readOptionalString(raw, 'pgHost', 'pg_host');
	const pgPort = readOptionalNumber(raw, 'pgPort', 'pg_port');
	const pgDatabase = readOptionalString(raw, 'pgDatabase', 'pg_database');
	const pgUser = readOptionalString(raw, 'pgUser', 'pg_user');
	const pgHasPassword =
		readBoolean(Reflect.get(raw, 'pgHasPassword') ?? Reflect.get(raw, 'pg_has_password')) ??
		false;

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
		runtime_database_url: runtimeDatabaseUrl,
		database_url_source: databaseUrlSource,
		pg_host: pgHost,
		pg_port: pgPort,
		pg_database: pgDatabase,
		pg_user: pgUser,
		pg_has_password: pgHasPassword,
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

function normalizeStorageConnectResult(raw: unknown): StorageConnectResult | null {
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

function postgresPayload(input: PostgresConnectionInput): Record<string, string> {
	return {
		pgHost: input.host,
		pgPort: input.port,
		pgDatabase: input.database,
		pgUser: input.user,
		pgPassword: input.password,
	};
}

export async function updateStorageSettings(
	payload: StorageSettingsUpdate
): Promise<StorageSettingsUpdateResult> {
	const body: Record<string, unknown> = {};
	if (payload.storage_mode !== undefined) {
		body.storageMode = payload.storage_mode;
	}
	if (payload.postgres !== undefined) {
		Object.assign(body, postgresPayload(payload.postgres));
	}
	if (payload.sqlite_path !== undefined) {
		body.sqlitePath = payload.sqlite_path;
	}
	const response = await axios.put('/api/settings/storage', body);
	const result = normalizeStorageUpdateResult(response.data);
	if (result === null) {
		throw new Error('Invalid storage settings update response');
	}
	return result;
}

export async function testStorageConnection(
	input?: PostgresConnectionInput
): Promise<StorageTestResult> {
	const response = await axios.post(
		'/api/settings/storage/test',
		input ? postgresPayload(input) : {}
	);
	const result = normalizeStorageTestResult(response.data);
	if (result === null) {
		throw new Error('Invalid storage test response');
	}
	return result;
}

export async function connectStorage(
	input?: PostgresConnectionInput
): Promise<StorageConnectResult> {
	const response = await axios.post(
		'/api/settings/storage/connect',
		input ? postgresPayload(input) : {}
	);
	const result = normalizeStorageConnectResult(response.data);
	if (result === null) {
		throw new Error('Invalid storage connect response');
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
