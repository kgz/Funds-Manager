import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ErrorState } from '@/components/layout/ErrorState';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	SavedConnections,
	settingsBtnClass,
	settingsBtnPrimaryClass,
} from '@/components/settings/SavedConnections';
import {
	glassCardClass,
	inputDarkClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import {
	connectStorage,
	createSavedConnection,
	deleteSavedConnection,
	fetchMigrationsStatus,
	fetchSavedConnections,
	fetchStorageSettings,
	runMigrations,
	testStorageConnection,
	type MigrationStatusItem,
	type PostgresConnectionInput,
	type SavedConnection,
	type StorageSettings,
} from '@/types/settings';

type BannerKind = 'ok' | 'info' | 'warn';

type StorageBanner = {
	kind: BannerKind;
	title: string;
	detail?: string;
};

const pillBaseClass =
	'inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-medium uppercase tracking-[0.04em]';

const pillOkClass = cn(
	pillBaseClass,
	'border-[color-mix(in_oklch,var(--success)_35%,var(--border))] bg-[color-mix(in_oklch,var(--success)_10%,var(--surface))] text-[color-mix(in_oklch,var(--success)_55%,var(--fg))]'
);

const pillWarnClass = cn(
	pillBaseClass,
	'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] text-[oklch(42%_0.12_75)]'
);

const pillMutedClass = cn(
	pillBaseClass,
	'border-paper-border bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] text-paper-muted'
);

const settingsInputClass = cn(inputDarkClass, 'h-8 w-full px-2.5');

function postgresInput(
	host: string,
	port: string,
	database: string,
	user: string,
	password: string
): PostgresConnectionInput {
	return {
		host: host.trim(),
		port: port.trim(),
		database: database.trim(),
		user: user.trim(),
		password,
	};
}

function connectionToForm(connection: SavedConnection) {
	return {
		host: connection.host,
		port: connection.port !== null ? String(connection.port) : '',
		database: connection.database,
		user: connection.user,
		hasPassword: connection.has_password,
	};
}

function maskedConnectionUrl(
	host: string,
	port: string,
	database: string,
	user: string,
	hasPassword: boolean
): string {
	const portValue = port.trim() || '5432';
	const password = hasPassword ? '••••••••' : '(none)';
	return `postgresql://${user}:${password}@${host}:${portValue}/${database}`;
}

function postgresEndpointLabel(
	host: string | null,
	port: number | null,
	database: string | null
): string {
	if (host === null || database === null) {
		return 'PostgreSQL (not configured)';
	}
	const portValue = port !== null ? port : 5432;
	return `PostgreSQL @ ${host}:${portValue}/${database}`;
}

function SettingsBanner({ banner }: { banner: StorageBanner | null }) {
	if (banner === null) {
		return null;
	}
	const toneClass =
		banner.kind === 'ok'
			? 'border-[color-mix(in_oklch,var(--success)_35%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[color-mix(in_oklch,var(--success)_55%,var(--fg))]'
			: banner.kind === 'info'
				? 'border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_7%,var(--surface))] text-[color-mix(in_oklch,var(--accent)_55%,var(--fg))]'
				: 'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_9%,var(--surface))] text-[oklch(42%_0.12_75)]';

	return (
		<div
			className={cn(
				'flex items-start gap-2.5 rounded-paper border px-3.5 py-2.5 text-[13px] leading-snug',
				toneClass
			)}
			role="status"
			aria-live="polite"
		>
			<Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
			<div>
				<strong className="font-semibold">{banner.title}</strong>
				{banner.detail !== undefined ? (
					<p className="mt-0.5 text-[color-mix(in_oklch,currentColor_78%,var(--muted))]">
						{banner.detail}
					</p>
				) : null}
			</div>
		</div>
	);
}

function LoadingButton({
	loading,
	label,
	loadingLabel,
	variant = 'default',
	disabled,
	onClick,
}: {
	loading: boolean;
	label: string;
	loadingLabel: string;
	variant?: 'default' | 'primary';
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled || loading}
			onClick={onClick}
			className={cn(
				variant === 'primary' ? settingsBtnPrimaryClass : settingsBtnClass,
				loading && 'pointer-events-none opacity-85'
			)}
		>
			{loading ? (
				<Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" aria-hidden />
			) : null}
			<span>{loading ? loadingLabel : label}</span>
		</button>
	);
}

export function Settings() {
	const [settings, setSettings] = useState<StorageSettings | null>(null);
	const [connections, setConnections] = useState<SavedConnection[]>([]);
	const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pgHost, setPgHost] = useState('');
	const [pgPort, setPgPort] = useState('');
	const [pgDatabase, setPgDatabase] = useState('');
	const [pgUser, setPgUser] = useState('');
	const [pgPassword, setPgPassword] = useState('');
	const [hasSavedPassword, setHasSavedPassword] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [testing, setTesting] = useState(false);
	const [connecting, setConnecting] = useState(false);
	const [storageBanner, setStorageBanner] = useState<StorageBanner | null>(null);
	const [migrations, setMigrations] = useState<MigrationStatusItem[]>([]);
	const [pendingMigrationCount, setPendingMigrationCount] = useState(0);
	const [migrationsLoading, setMigrationsLoading] = useState(true);
	const [migrationsError, setMigrationsError] = useState<string | null>(null);
	const [runningMigrations, setRunningMigrations] = useState(false);
	const [migrationBanner, setMigrationBanner] = useState<StorageBanner | null>(null);

	const selectedConnection = useMemo(
		() => connections.find((connection) => connection.id === selectedConnectionId) ?? null,
		[connections, selectedConnectionId]
	);

	const loadConnections = useCallback(async () => {
		const items = await fetchSavedConnections();
		setConnections(items);
		const active = items.find((connection) => connection.active) ?? items[0] ?? null;
		setSelectedConnectionId((current) => current ?? active?.id ?? null);
		return items;
	}, []);

	const applyFormFromSettings = useCallback((data: StorageSettings) => {
		setPgHost(data.pg_host ?? '');
		setPgPort(data.pg_port !== null ? String(data.pg_port) : '');
		setPgDatabase(data.pg_database ?? '');
		setPgUser(data.pg_user ?? '');
		setPgPassword('');
		setHasSavedPassword(data.pg_has_password);
	}, []);

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
			const [data, connectionItems] = await Promise.all([
				fetchStorageSettings(),
				fetchSavedConnections(),
			]);
			setSettings(data);
			setConnections(connectionItems);
			const active =
				connectionItems.find((connection) => connection.active) ??
				connectionItems[0] ??
				null;
			setSelectedConnectionId(active?.id ?? null);
			if (active !== null) {
				const form = connectionToForm(active);
				setPgHost(form.host);
				setPgPort(form.port);
				setPgDatabase(form.database);
				setPgUser(form.user);
				setPgPassword('');
				setHasSavedPassword(form.hasPassword);
			} else {
				applyFormFromSettings(data);
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load settings');
			setSettings(null);
		} finally {
			setLoading(false);
		}
	}, [applyFormFromSettings]);

	useEffect(() => {
		void load();
		void loadMigrations();
	}, [load, loadMigrations]);

	const formInput = () =>
		postgresInput(pgHost, pgPort, pgDatabase, pgUser, pgPassword);

	const handleSelectConnection = (connection: SavedConnection) => {
		const form = connectionToForm(connection);
		setSelectedConnectionId(connection.id);
		setPgHost(form.host);
		setPgPort(form.port);
		setPgDatabase(form.database);
		setPgUser(form.user);
		setPgPassword('');
		setHasSavedPassword(form.hasPassword);
		setStorageBanner({
			kind: 'info',
			title: `Loaded “${connection.name}”`,
			detail: 'Review the fields below, then save & connect to switch to it.',
		});
	};

	const handleCreateConnection = async (name: string) => {
		setStorageBanner(null);
		try {
			const created = await createSavedConnection(name, formInput());
			await loadConnections();
			setSelectedConnectionId(created.id);
			setHasSavedPassword(created.has_password);
			setPgPassword('');
			setStorageBanner({
				kind: 'ok',
				title: `Saved as “${created.name}”`,
				detail: 'You can switch back to it anytime from Saved connections.',
			});
		} catch (err: unknown) {
			setStorageBanner({
				kind: 'warn',
				title: 'Could not save connection',
				detail: err instanceof Error ? err.message : 'Save failed',
			});
		}
	};

	const handleDeleteConnection = async (id: string) => {
		setStorageBanner(null);
		try {
			await deleteSavedConnection(id);
			const items = await loadConnections();
			if (selectedConnectionId === id) {
				const next = items.find((connection) => connection.active) ?? items[0] ?? null;
				if (next !== null) {
					handleSelectConnection(next);
				} else {
					setSelectedConnectionId(null);
					if (settings !== null) {
						applyFormFromSettings(settings);
					}
				}
			}
		} catch (err: unknown) {
			setStorageBanner({
				kind: 'warn',
				title: 'Could not remove connection',
				detail: err instanceof Error ? err.message : 'Delete failed',
			});
		}
	};

	const handleTest = async () => {
		setTesting(true);
		setStorageBanner(null);
		try {
			const result = await testStorageConnection(
				formInput(),
				selectedConnectionId ?? undefined
			);
			setStorageBanner({
				kind: result.ok ? 'ok' : 'warn',
				title: result.ok ? 'Test connection succeeded' : 'Test connection failed',
				detail: result.message,
			});
		} catch (err: unknown) {
			setStorageBanner({
				kind: 'warn',
				title: 'Test connection failed',
				detail: err instanceof Error ? err.message : 'Connection test failed',
			});
		} finally {
			setTesting(false);
		}
	};

	const handleConnect = async () => {
		setConnecting(true);
		setStorageBanner(null);
		try {
			const result = await connectStorage(
				formInput(),
				selectedConnectionId ?? undefined
			);
			if (result.ok) {
				await load();
				await loadMigrations();
				const connectionName = selectedConnection?.name ?? 'database';
				setStorageBanner({
					kind: 'ok',
					title: 'Saved & connected',
					detail: `“${connectionName}” is now active — no restart needed.`,
				});
			} else {
				setStorageBanner({
					kind: 'warn',
					title: 'Could not connect',
					detail: result.message,
				});
			}
		} catch (err: unknown) {
			setStorageBanner({
				kind: 'warn',
				title: 'Could not connect',
				detail: err instanceof Error ? err.message : 'Connect failed',
			});
		} finally {
			setConnecting(false);
		}
	};

	const handleRunMigrations = async () => {
		setRunningMigrations(true);
		setMigrationBanner(null);
		try {
			const result = await runMigrations();
			setMigrationBanner({
				kind: result.ok ? 'ok' : 'warn',
				title: result.ok ? result.message : 'Migration run failed',
				detail: result.ok
					? result.applied_count > 0
						? 'Schema is now up to date.'
						: undefined
					: result.message,
			});
			await loadMigrations();
		} catch (err: unknown) {
			setMigrationBanner({
				kind: 'warn',
				title: 'Migration run failed',
				detail: err instanceof Error ? err.message : 'Failed to run migrations',
			});
		} finally {
			setRunningMigrations(false);
		}
	};

	if (loading && settings === null && error === null) {
		return <PageLoadingState label="Loading settings…" />;
	}

	if (error !== null && settings === null) {
		return (
			<ErrorState title="Error loading settings" message={error} onRetry={() => void load()} />
		);
	}

	if (settings === null) {
		return null;
	}

	const activeSourceLabel =
		settings.database_url_source === 'environment' ? (
			<>
				Environment variable (<span className="font-mono">DATABASE_URL</span>) — overrides
				config file
			</>
		) : (
			<>
				Config file (<span className="font-mono">{settings.config_file_path}</span>) — no
				environment override
			</>
		);

	const configuredEndpoint = postgresEndpointLabel(
		settings.pg_host,
		settings.pg_port,
		settings.pg_database
	);

	const runtimeUrl =
		settings.runtime_database_url ??
		maskedConnectionUrl(pgHost, pgPort, pgDatabase, pgUser, hasSavedPassword);

	const runtimeEndpoint = postgresEndpointLabel(
		settings.pg_host,
		settings.pg_port,
		settings.pg_database
	);

	return (
		<PageShell variant="table">
			<header className={pageHeaderClass}>
				<div className="min-w-0">
					<h1 className={pageTitleClass}>Settings</h1>
					<p className={pageSubtitleClass}>Storage and app configuration.</p>
				</div>
			</header>

			<div className={pageBodyClass}>
				<div className="flex flex-col gap-6">
					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Data storage</h2>
							<p className={panelHintClass}>Where your financial data lives</p>
						</div>

						<p className="px-4 pt-4 text-[13px] leading-relaxed text-paper-muted">
							Choose where your financial data lives. PostgreSQL is the active,
							production-ready backend today — connect to your own server over Docker, a
							homelab box, or a managed cloud instance. A local, single-file SQLite
							database is coming soon{' '}
							<span className="font-mono underline decoration-paper-border">#165</span>.
						</p>

						<div
							className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2"
							role="radiogroup"
							aria-label="Storage mode"
						>
							<label className="flex cursor-pointer items-start gap-3 rounded-paper border border-[color-mix(in_oklch,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_5%,var(--surface))] p-3.5">
								<span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-secondary-default">
									<span className="h-2 w-2 rounded-full bg-secondary-default" />
								</span>
								<span>
									<span className="text-[13px] font-medium text-paper-fg">
										External PostgreSQL
									</span>
									<span className="mt-0.5 block text-xs leading-snug text-paper-muted">
										Connect to your own server — Docker, homelab, or cloud.
									</span>
								</span>
							</label>

							<label className="flex cursor-not-allowed items-start gap-3 rounded-paper border border-paper-border bg-paper-surface p-3.5 opacity-55">
								<span className="relative mt-0.5 h-4 w-4 shrink-0 rounded-full border border-paper-border bg-paper-surface" />
								<span>
									<span className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-paper-fg">
										Local on this computer
										<span className={pillMutedClass}>Coming soon · #165</span>
									</span>
									<span className="mt-0.5 block text-xs leading-snug text-paper-muted">
										A single SQLite file stored in your user folder — no server,
										nothing to configure.
									</span>
								</span>
							</label>
						</div>

						<form
							className="flex flex-col gap-3.5 border-t border-paper-border p-4"
							onSubmit={(event) => {
								event.preventDefault();
								void handleConnect();
							}}
						>
							<SavedConnections
								connections={connections}
								selectedId={selectedConnectionId}
								onSelect={handleSelectConnection}
								onCreate={(name) => void handleCreateConnection(name)}
								onDelete={(id) => void handleDeleteConnection(id)}
								disabled={connecting}
							/>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
								<label className="flex flex-col gap-1.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
										Host
									</span>
									<input
										className={settingsInputClass}
										value={pgHost}
										onChange={(event) => setPgHost(event.target.value)}
										spellCheck={false}
										autoComplete="off"
									/>
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
										Port
									</span>
									<input
										className={settingsInputClass}
										value={pgPort}
										onChange={(event) => setPgPort(event.target.value)}
										inputMode="numeric"
										spellCheck={false}
										autoComplete="off"
									/>
								</label>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<label className="flex flex-col gap-1.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
										Database name
									</span>
									<input
										className={settingsInputClass}
										value={pgDatabase}
										onChange={(event) => setPgDatabase(event.target.value)}
										spellCheck={false}
										autoComplete="off"
									/>
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
										Username
									</span>
									<input
										className={settingsInputClass}
										value={pgUser}
										onChange={(event) => setPgUser(event.target.value)}
										spellCheck={false}
										autoComplete="off"
									/>
								</label>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
										Password
									</span>
									<div className="flex h-8 overflow-hidden rounded-paper border border-paper-border bg-paper-surface focus-within:border-[color-mix(in_oklch,var(--accent)_50%,var(--border))] focus-within:ring-[3px] focus-within:ring-[color-mix(in_oklch,var(--accent)_12%,transparent)]">
										<input
											className="h-full flex-1 border-0 bg-transparent px-2.5 text-[13px] text-paper-fg outline-none"
											type={showPassword ? 'text' : 'password'}
											value={pgPassword}
											onChange={(event) => setPgPassword(event.target.value)}
											placeholder={
												hasSavedPassword
													? 'Leave blank to keep saved password'
													: 'Enter password'
											}
											spellCheck={false}
											autoComplete="off"
										/>
										<button
											type="button"
											className="grid w-8 shrink-0 place-items-center border-l border-paper-border text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,transparent)] hover:text-paper-fg"
											aria-label={showPassword ? 'Hide password' : 'Show password'}
											aria-pressed={showPassword}
											onClick={() => setShowPassword((value) => !value)}
										>
											{showPassword ? (
												<EyeOff className="h-3.5 w-3.5" />
											) : (
												<Eye className="h-3.5 w-3.5" />
											)}
										</button>
									</div>
									<p className="text-[11.5px] text-paper-muted">
										{hasSavedPassword
											? 'A password is already saved for this connection. Leave blank to keep it.'
											: 'No password saved for this connection yet.'}
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-2 rounded-paper border border-paper-border bg-paper px-3.5 py-3">
								<div className="flex flex-wrap items-baseline justify-between gap-3 text-xs">
									<span className="font-medium text-paper-muted">Active source</span>
									<span className="min-w-0 text-right text-paper-fg">
										{activeSourceLabel}
									</span>
								</div>
								<div className="flex flex-wrap items-baseline justify-between gap-3 text-xs">
									<span className="font-medium text-paper-muted">
										Currently connected
									</span>
									<span className="min-w-0 break-all text-right font-mono text-paper-fg">
										{runtimeUrl}
									</span>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<LoadingButton
									variant="primary"
									loading={connecting}
									label="Save & connect"
									loadingLabel="Connecting…"
									onClick={() => void handleConnect()}
								/>
								<LoadingButton
									loading={testing}
									label="Test connection"
									loadingLabel="Testing…"
									onClick={() => void handleTest()}
								/>
							</div>

							<SettingsBanner banner={storageBanner} />
						</form>
					</section>

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Database migrations</h2>
							<p className={panelHintClass}>Apply schema updates without the CLI</p>
						</div>

						<div className="flex items-center gap-2.5 px-4 py-3 text-[13px]">
							{pendingMigrationCount === 0 ? (
								<span className={pillOkClass}>All applied</span>
							) : (
								<span className={pillWarnClass}>
									{pendingMigrationCount} pending
								</span>
							)}
							<p className="m-0 text-paper-muted">
								{pendingMigrationCount === 0
									? 'All migrations are applied — schema is up to date.'
									: `${pendingMigrationCount} migration${pendingMigrationCount === 1 ? '' : 's'} pending — review and apply below.`}
							</p>
						</div>

						{migrationsLoading ? (
							<p className="px-4 pb-4 text-sm text-paper-muted">Loading migrations…</p>
						) : null}
						{migrationsError !== null ? (
							<p className="px-4 pb-4 text-sm text-[color:var(--danger)]">
								{migrationsError}
							</p>
						) : null}

						{!migrationsLoading && migrationsError === null ? (
							<div className="mx-4 max-h-80 overflow-y-auto rounded-paper border border-paper-border">
								{migrations.map((migration) => (
									<div
										key={migration.name}
										className={cn(
											'flex items-center justify-between gap-3 border-b border-paper-border px-3.5 py-3 last:border-b-0',
											migration.applied &&
												'bg-[color-mix(in_oklch,var(--success)_3%,var(--surface))]'
										)}
									>
										<div className="min-w-0">
											<p className="text-[13px] text-paper-fg">
												{migration.description || migration.name}
											</p>
											<p className="font-mono text-[11px] text-paper-muted">
												{migration.name}
											</p>
										</div>
										<span
											className={
												migration.applied ? pillOkClass : pillWarnClass
											}
										>
											{migration.applied ? 'Applied' : 'Pending'}
										</span>
									</div>
								))}
							</div>
						) : null}

						<div className="px-4 py-3.5">
							<LoadingButton
								variant="primary"
								loading={runningMigrations}
								label="Run pending migrations"
								loadingLabel="Running…"
								disabled={pendingMigrationCount === 0}
								onClick={() => void handleRunMigrations()}
							/>
						</div>

						<div className="px-4 pb-4">
							<SettingsBanner banner={migrationBanner} />
						</div>
					</section>

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Diagnostics</h2>
							<p className={panelHintClass}>
								Runtime details for support and debugging
							</p>
						</div>
						<div className="px-4 py-2">
							<div className="grid grid-cols-1 gap-0.5 border-b border-paper-border py-2 text-[13px] md:grid-cols-[150px_1fr]">
								<span className="text-xs text-paper-muted">Config file</span>
								<span className="break-all font-mono text-paper-fg">
									{settings.config_file_path}
								</span>
							</div>
							<div className="grid grid-cols-1 gap-0.5 border-b border-paper-border py-2 text-[13px] md:grid-cols-[150px_1fr]">
								<span className="text-xs text-paper-muted">Configured mode</span>
								<span className="flex flex-wrap items-center gap-2 text-paper-fg">
									{configuredEndpoint}
									<span className={pillMutedClass}>config file</span>
								</span>
							</div>
							<div className="grid grid-cols-1 gap-0.5 py-2 text-[13px] md:grid-cols-[150px_1fr]">
								<span className="text-xs text-paper-muted">Runtime mode</span>
								<span className="flex flex-wrap items-center gap-2 text-paper-fg">
									{runtimeEndpoint}
									{settings.database_url_source === 'environment' ? (
										<span className={pillOkClass}>DATABASE_URL override</span>
									) : (
										<span className={pillOkClass}>Connected now</span>
									)}
								</span>
							</div>
						</div>
					</section>
				</div>
			</div>
		</PageShell>
	);
}
