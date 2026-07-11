import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Settings as SettingsIcon } from 'lucide-react';
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
	fetchStorageSettings,
	testStorageConnection,
	updateStorageSettings,
	type StorageMode,
	type StorageSettings,
} from '@/types/settings';

export function Settings() {
	const [settings, setSettings] = useState<StorageSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [storageMode, setStorageMode] = useState<StorageMode>('postgres');
	const [databaseUrl, setDatabaseUrl] = useState('');
	const [databaseUrlPlaceholder, setDatabaseUrlPlaceholder] = useState('');
	const [sqlitePath, setSqlitePath] = useState('');
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [testMessage, setTestMessage] = useState<string | null>(null);
	const [testOk, setTestOk] = useState<boolean | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchStorageSettings();
			setSettings(data);
			setStorageMode(data.configured_storage_mode);
			setDatabaseUrl('');
			setDatabaseUrlPlaceholder(data.database_url ?? '');
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
	}, [load]);

	const handleSave = async (event: FormEvent) => {
		event.preventDefault();
		setSaving(true);
		setStatusMessage(null);
		setTestMessage(null);
		setTestOk(null);
		try {
			const payload =
				storageMode === 'postgres'
					? {
							storage_mode: storageMode,
							...(databaseUrl.trim().length > 0
								? { database_url: databaseUrl.trim() }
								: {}),
						}
					: {
							storage_mode: storageMode,
							sqlite_path: sqlitePath.trim(),
						};
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
			const url =
				storageMode === 'postgres' && databaseUrl.trim().length > 0
					? databaseUrl.trim()
					: undefined;
			const result = await testStorageConnection(url);
			setTestOk(result.ok);
			setTestMessage(result.message);
		} catch (err: unknown) {
			setTestOk(false);
			setTestMessage(err instanceof Error ? err.message : 'Connection test failed');
		} finally {
			setTesting(false);
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
							<label className="block space-y-1 text-sm text-white/80">
								<span>Database URL</span>
								<input
									className={inputDarkClass}
									value={databaseUrl}
									onChange={(event) => setDatabaseUrl(event.target.value)}
									placeholder={
										databaseUrlPlaceholder.length > 0
											? databaseUrlPlaceholder
											: 'postgres://user:password@127.0.0.1:5434/funds'
									}
									spellCheck={false}
								/>
								<span className="block text-xs text-white/50">
									Active source: {settings.database_url_source}. Leave blank to keep
									the current URL; enter a new URL to replace it.
								</span>
							</label>
						) : (
							<label className="block space-y-1 text-sm text-white/80">
								<span>Local database file</span>
								<input
									className={inputDarkClass}
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
								<button
									type="button"
									className={buttonOutlineClass}
									disabled={testing}
									onClick={() => void handleTest()}
								>
									{testing ? 'Testing…' : 'Test connection'}
								</button>
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
