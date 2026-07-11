import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	buttonOutlineClass,
	buttonPrimaryClass,
	glassCardClass,
	inputDarkClass,
} from '@/components/layout/tokens';
import {
	connectStorage,
	fetchMigrationsStatus,
	fetchStorageSettings,
	runMigrations,
	testStorageConnection,
	updateStorageSettings,
	type MigrationStatusItem,
	type PostgresConnectionInput,
	type StorageMode,
	type StorageSettings,
} from '@/types/settings';

export function Settings() {
	const [settings, setSettings] = useState<StorageSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [storageMode, setStorageMode] = useState<StorageMode>('postgres');
	const [pgHost, setPgHost] = useState('');
	const [pgPort, setPgPort] = useState('');
	const [pgDatabase, setPgDatabase] = useState('');
	const [pgUser, setPgUser] = useState('');
	const [pgPassword, setPgPassword] = useState('');
	const [hasSavedPassword, setHasSavedPassword] = useState(false);
	const [sqlitePath, setSqlitePath] = useState('');
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [connecting, setConnecting] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [testMessage, setTestMessage] = useState<string | null>(null);
	const [testOk, setTestOk] = useState<boolean | null>(null);
	const [migrations, setMigrations] = useState<MigrationStatusItem[]>([]);
	const [pendingMigrationCount, setPendingMigrationCount] = useState(0);
	const [migrationsLoading, setMigrationsLoading] = useState(true);
	const [migrationsError, setMigrationsError] = useState<string | null>(null);
	const [runningMigrations, setRunningMigrations] = useState(false);
	const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
	const [migrationOk, setMigrationOk] = useState<boolean | null>(null);

	const loadMigrations = useCallback(async () => {
		setMigrationsLoading(true);
		setMigrationsError(null);
		try {
			const data = await fetchMigrationsStatus();
			setMigrations(data.items);
			setPendingMigrationCount(data.pending_count);
		} catch (err: unknown) {
			setMigrationsError(
				err instanceof Error ? err.message : 'Failed to load migrations'
			);
			setMigrations([]);
			setPendingMigrationCount(0);
		} finally {
			setMigrationsLoading(false);
		}
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchStorageSettings();
			setSettings(data);
			setStorageMode(data.configured_storage_mode);
			setPgHost(data.pg_host ?? '');
			setPgPort(data.pg_port !== null ? String(data.pg_port) : '');
			setPgDatabase(data.pg_database ?? '');
			setPgUser(data.pg_user ?? '');
			setPgPassword('');
			setHasSavedPassword(data.pg_has_password);
			setSqlitePath(data.sqlite_path);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load settings');
			setSettings(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
		void loadMigrations();
	}, [load, loadMigrations]);

	const handleRunMigrations = async () => {
		setRunningMigrations(true);
		setMigrationMessage(null);
		setMigrationOk(null);
		try {
			const result = await runMigrations();
			setMigrationOk(result.ok);
			setMigrationMessage(result.message);
			await loadMigrations();
		} catch (err: unknown) {
			setMigrationOk(false);
			setMigrationMessage(
				err instanceof Error ? err.message : 'Failed to run migrations'
			);
		} finally {
			setRunningMigrations(false);
		}
	};

	const postgresInput = (): PostgresConnectionInput => ({
		host: pgHost.trim(),
		port: pgPort.trim(),
		database: pgDatabase.trim(),
		user: pgUser.trim(),
		password: pgPassword,
	});

	const handleSave = async (event: FormEvent) => {
		event.preventDefault();
		setSaving(true);
		setStatusMessage(null);
		setTestMessage(null);
		setTestOk(null);
		try {
			const payload =
				storageMode === 'postgres'
					? { storage_mode: storageMode, postgres: postgresInput() }
					: { storage_mode: storageMode, sqlite_path: sqlitePath.trim() };
			const result = await updateStorageSettings(payload);
			setStatusMessage(result.message);
			await load();
		} catch (err: unknown) {
			setStatusMessage(err instanceof Error ? err.message : 'Failed to save settings');
		} finally {
			setSaving(false);
		}
	};

	const handleTest = async () => {
		setTesting(true);
		setTestMessage(null);
		setTestOk(null);
		try {
			const result = await testStorageConnection(
				storageMode === 'postgres' ? postgresInput() : undefined
			);
			setTestOk(result.ok);
			setTestMessage(result.message);
		} catch (err: unknown) {
			setTestOk(false);
			setTestMessage(err instanceof Error ? err.message : 'Connection test failed');
		} finally {
			setTesting(false);
		}
	};

	const handleConnect = async () => {
		setConnecting(true);
		setStatusMessage(null);
		setTestMessage(null);
		setTestOk(null);
		try {
			const result = await connectStorage(
				storageMode === 'postgres' ? postgresInput() : undefined
			);
			setStatusMessage(result.message);
			if (result.ok) {
				await load();
				await loadMigrations();
			}
		} catch (err: unknown) {
			setStatusMessage(err instanceof Error ? err.message : 'Failed to connect');
		} finally {
			setConnecting(false);
		}
	};

	return (
		<PageShell>
			<PageHeader
				title="Settings"
				subtitle="Storage and app configuration."
				icon={<SettingsIcon className="h-6 w-6 text-secondary-default" />}
			/>

			{loading ? <PageLoadingState label="Loading settings…" /> : null}
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{settings !== null && !loading ? (
				<div className="space-y-6">
					<form
						onSubmit={(event) => void handleSave(event)}
						className={`${glassCardClass} space-y-6 p-6`}
					>
						<div>
							<h2 className="text-sm font-semibold text-white">Data storage</h2>
							<p className="mt-1 text-sm text-white/60">
								Choose where your financial data lives. PostgreSQL is used today;
								local file storage will activate when the SQLite backend ships
								(#165).
							</p>
						</div>

						<fieldset className="space-y-3">
							<legend className="sr-only">Storage mode</legend>
							<label className="flex cursor-pointer items-start gap-3 rounded border border-white/10 bg-black/20 p-4">
								<input
									type="radio"
									name="storage_mode"
									value="postgres"
									checked={storageMode === 'postgres'}
									onChange={() => setStorageMode('postgres')}
									className="mt-1"
								/>
								<span>
									<span className="flex items-center gap-2 text-sm font-medium text-white">
										<Database size="1rem" aria-hidden />
										External PostgreSQL
									</span>
									<span className="mt-1 block text-sm text-white/60">
										Connect to your own Postgres server (Docker, homelab, cloud).
									</span>
								</span>
							</label>
							<label className="flex cursor-pointer items-start gap-3 rounded border border-white/10 bg-black/20 p-4">
								<input
									type="radio"
									name="storage_mode"
									value="local"
									checked={storageMode === 'local'}
									onChange={() => setStorageMode('local')}
									className="mt-1"
								/>
								<span>
									<span className="flex items-center gap-2 text-sm font-medium text-white">
										<HardDrive size="1rem" aria-hidden />
										Local on this computer
									</span>
									<span className="mt-1 block text-sm text-white/60">
										Single database file in your user folder (coming soon).
									</span>
								</span>
							</label>
						</fieldset>

						{storageMode === 'postgres' ? (
							<div className="space-y-4">
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<label className="flex flex-col gap-1 text-sm text-white/80 sm:col-span-2">
										<span>Host</span>
										<input
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											value={pgHost}
											onChange={(event) => setPgHost(event.target.value)}
											placeholder="127.0.0.1"
											spellCheck={false}
											autoComplete="off"
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm text-white/80">
										<span>Port</span>
										<input
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											value={pgPort}
											onChange={(event) => setPgPort(event.target.value)}
											placeholder="5432"
											inputMode="numeric"
											spellCheck={false}
											autoComplete="off"
										/>
									</label>
								</div>

								<label className="flex flex-col gap-1 text-sm text-white/80">
									<span>Database name</span>
									<input
										className={cn(inputDarkClass, 'w-full px-3 py-2')}
										value={pgDatabase}
										onChange={(event) => setPgDatabase(event.target.value)}
										placeholder="funds"
										spellCheck={false}
										autoComplete="off"
									/>
								</label>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<label className="flex flex-col gap-1 text-sm text-white/80">
										<span>Username</span>
										<input
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											value={pgUser}
											onChange={(event) => setPgUser(event.target.value)}
											placeholder="funds"
											spellCheck={false}
											autoComplete="off"
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm text-white/80">
										<span>Password</span>
										<input
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											type="password"
											value={pgPassword}
											onChange={(event) => setPgPassword(event.target.value)}
											placeholder={
												hasSavedPassword ? '•••••••• (unchanged)' : 'Password'
											}
											spellCheck={false}
											autoComplete="off"
										/>
									</label>
								</div>

								<div className="space-y-1">
									<span className="block text-xs text-white/50">
										Active source: {settings.database_url_source}.
										{hasSavedPassword
											? ' Leave the password blank to keep the saved one.'
											: ''}
									</span>
									{settings.runtime_database_url !== null ? (
										<span className="block text-xs text-white/50">
											Currently connected: {settings.runtime_database_url}
										</span>
									) : null}
								</div>
							</div>
						) : (
							<label className="flex flex-col gap-1 text-sm text-white/80">
								<span>Local database file</span>
								<input
									className={cn(inputDarkClass, 'w-full px-3 py-2')}
									value={sqlitePath}
									onChange={(event) => setSqlitePath(event.target.value)}
									spellCheck={false}
								/>
								{!settings.local_storage_available ? (
									<span className="block text-xs text-amber-300/90">
										Saved for the setup wizard — the app still uses PostgreSQL until
										the local backend is ready.
									</span>
								) : null}
							</label>
						)}

						<div className="flex flex-wrap gap-3">
							<button
								type="submit"
								className={buttonPrimaryClass}
								disabled={saving}
							>
								{saving ? 'Saving…' : 'Save storage settings'}
							</button>
							{storageMode === 'postgres' ? (
								<>
									<button
										type="button"
										className={buttonOutlineClass}
										disabled={testing}
										onClick={() => void handleTest()}
									>
										{testing ? 'Testing…' : 'Test connection'}
									</button>
									<button
										type="button"
										className={buttonOutlineClass}
										disabled={connecting}
										onClick={() => void handleConnect()}
									>
										{connecting ? 'Connecting…' : 'Connect'}
									</button>
								</>
							) : null}
						</div>

						{statusMessage !== null ? (
							<InlineAlert variant="info">{statusMessage}</InlineAlert>
						) : null}
						{testMessage !== null ? (
							<InlineAlert variant={testOk ? 'info' : 'error'}>
								{testMessage}
							</InlineAlert>
						) : null}
					</form>

					<div className={`${glassCardClass} space-y-4 p-6`}>
						<div>
							<h2 className="text-sm font-semibold text-white">Database migrations</h2>
							<p className="mt-1 text-sm text-white/60">
								Apply schema updates to the active database without using the CLI.
							</p>
						</div>

						{migrationsLoading ? (
							<p className="text-sm text-white/60">Loading migrations…</p>
						) : null}
						{migrationsError !== null ? (
							<InlineAlert variant="error">{migrationsError}</InlineAlert>
						) : null}

						{!migrationsLoading && migrationsError === null ? (
							<>
								<p className="text-sm text-white/70">
									{pendingMigrationCount === 0
										? 'All migrations are applied.'
										: `${pendingMigrationCount} migration(s) pending.`}
								</p>
								<ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
									{migrations.map((migration) => (
										<li
											key={migration.name}
											className="flex items-start justify-between gap-3 rounded border border-white/10 bg-black/20 px-3 py-2"
										>
											<span>
												<span className="block font-medium text-white">
													{migration.description || migration.name}
												</span>
												<span className="block text-xs text-white/50">
													{migration.name}
												</span>
											</span>
											<span
												className={
													migration.applied
														? 'shrink-0 text-xs text-emerald-300'
														: 'shrink-0 text-xs text-amber-300'
												}
											>
												{migration.applied ? 'Applied' : 'Pending'}
											</span>
										</li>
									))}
								</ul>
								<button
									type="button"
									className={buttonPrimaryClass}
									disabled={runningMigrations || pendingMigrationCount === 0}
									onClick={() => void handleRunMigrations()}
								>
									{runningMigrations ? 'Running…' : 'Run pending migrations'}
								</button>
							</>
						) : null}

						{migrationMessage !== null ? (
							<InlineAlert variant={migrationOk ? 'info' : 'error'}>
								{migrationMessage}
							</InlineAlert>
						) : null}
					</div>

					<div className={`${glassCardClass} space-y-2 p-6 text-sm text-white/70`}>
						<p>
							<span className="text-white/50">Config file:</span>{' '}
							<code className="text-white/90">{settings.config_file_path}</code>
						</p>
						<p>
							<span className="text-white/50">Configured mode:</span>{' '}
							{settings.configured_storage_mode}
						</p>
						<p>
							<span className="text-white/50">Runtime mode:</span>{' '}
							{settings.runtime_storage_mode}
						</p>
					</div>
				</div>
			) : null}
		</PageShell>
	);
}
