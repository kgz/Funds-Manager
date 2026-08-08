import { Database, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { inputDarkClass } from '@/components/layout/tokens';
import type { SavedConnection } from '@/types/settings';

const pillOkClass =
	'inline-flex h-[17px] items-center rounded-full border border-[color-mix(in_oklch,var(--success)_35%,var(--border))] bg-[color-mix(in_oklch,var(--success)_10%,var(--surface))] px-1.5 text-[9px] font-medium uppercase tracking-[0.03em] text-[color-mix(in_oklch,var(--success)_55%,var(--fg))]';

const settingsBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const settingsBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const settingsBtnSmallPrimaryClass =
	'inline-flex h-[26px] cursor-pointer items-center justify-center rounded-paper border border-paper-fg bg-paper-fg px-2.5 text-xs font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const settingsBtnGhostClass =
	'inline-flex h-[26px] cursor-pointer items-center justify-center rounded-paper border border-transparent bg-transparent px-2.5 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

type SavedConnectionsProps = {
	connections: SavedConnection[];
	selectedId: string | null;
	onSelect: (connection: SavedConnection) => void;
	onCreate: (name: string) => void;
	onDelete: (id: string) => void;
	disabled?: boolean;
};

export function SavedConnections({
	connections,
	selectedId,
	onSelect,
	onCreate,
	onDelete,
	disabled = false,
}: SavedConnectionsProps) {
	const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
	const [addingConnection, setAddingConnection] = useState(false);
	const [newName, setNewName] = useState('');
	const confirmTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (confirmTimerRef.current !== null) {
				window.clearTimeout(confirmTimerRef.current);
			}
		};
	}, []);

	const clearConfirmTimer = () => {
		if (confirmTimerRef.current !== null) {
			window.clearTimeout(confirmTimerRef.current);
			confirmTimerRef.current = null;
		}
	};

	const handleRemove = (id: string) => {
		if (pendingRemoveId !== id) {
			setPendingRemoveId(id);
			clearConfirmTimer();
			confirmTimerRef.current = window.setTimeout(() => {
				setPendingRemoveId(null);
				confirmTimerRef.current = null;
			}, 3000);
			return;
		}
		clearConfirmTimer();
		setPendingRemoveId(null);
		onDelete(id);
	};

	const handleSaveNew = () => {
		const trimmed = newName.trim();
		onCreate(trimmed.length > 0 ? trimmed : 'Untitled connection');
		setNewName('');
		setAddingConnection(false);
		setPendingRemoveId(null);
	};

	return (
		<div className="flex flex-col gap-2.5 border-b border-paper-border pb-3.5">
			<div className="flex flex-wrap items-baseline gap-2.5">
				<span className="text-[11px] font-medium uppercase tracking-[0.05em] text-paper-muted">
					Saved connections
				</span>
				<span className="text-[11.5px] text-paper-muted">
					Pick a profile to load it below, or save the current settings as a new one.
				</span>
			</div>

			<div className="flex flex-wrap gap-2">
				{connections.map((connection) => {
					const isActive = connection.id === selectedId;
					const meta = `${connection.host}:${connection.port ?? 5432} · ${connection.database}`;
					const confirming = pendingRemoveId === connection.id;

					if (isActive) {
						return (
							<div
								key={connection.id}
								className="flex min-w-[200px] items-center gap-2.5 rounded-paper border border-[color-mix(in_oklch,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_6%,var(--surface))] px-2.5 py-2"
							>
								<Database
									className="h-4 w-4 shrink-0 text-secondary-default"
									aria-hidden
								/>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-paper-fg">
										{connection.name}
										<span className={pillOkClass}>Active</span>
									</span>
									<span className="truncate font-mono text-[11px] text-paper-muted">
										{meta}
									</span>
								</span>
							</div>
						);
					}

					return (
						<button
							key={connection.id}
							type="button"
							disabled={disabled}
							onClick={() => {
								setPendingRemoveId(null);
								setAddingConnection(false);
								onSelect(connection);
							}}
							className="relative flex min-w-[200px] cursor-pointer items-center gap-2.5 rounded-paper border border-paper-border bg-paper-surface px-2.5 py-2 text-left transition-colors hover:border-[color-mix(in_oklch,var(--accent)_30%,var(--border))] disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Database className="h-4 w-4 shrink-0 text-paper-muted" aria-hidden />
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate text-[12.5px] font-medium text-paper-fg">
									{connection.name}
								</span>
								<span className="truncate font-mono text-[11px] text-paper-muted">
									{meta}
								</span>
							</span>
							<span
								role="button"
								tabIndex={0}
								onClick={(event) => {
									event.stopPropagation();
									handleRemove(connection.id);
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										event.stopPropagation();
										handleRemove(connection.id);
									}
								}}
								className={cn(
									'grid shrink-0 place-items-center rounded-[5px] text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] hover:text-[color:var(--danger)]',
									confirming
										? 'h-auto px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.02em] text-[color:var(--danger)]'
										: 'h-[22px] w-[22px] -mr-1'
								)}
								title={confirming ? 'Click again to remove' : 'Remove connection'}
							>
								{confirming ? 'Confirm?' : <Trash2 className="h-3.5 w-3.5" />}
							</span>
						</button>
					);
				})}

				{addingConnection ? (
					<div className="flex min-w-[240px] flex-col gap-2 rounded-paper border border-[color-mix(in_oklch,var(--accent)_40%,var(--border))] bg-paper-surface px-2.5 py-2">
						<input
							className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
							value={newName}
							onChange={(event) => setNewName(event.target.value)}
							placeholder="Connection name"
							autoFocus
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									handleSaveNew();
								}
								if (event.key === 'Escape') {
									event.preventDefault();
									setAddingConnection(false);
									setNewName('');
								}
							}}
						/>
						<div className="flex justify-end gap-1.5">
							<button
								type="button"
								className={settingsBtnGhostClass}
								onClick={() => {
									setAddingConnection(false);
									setNewName('');
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								className={settingsBtnSmallPrimaryClass}
								disabled={disabled}
								onClick={handleSaveNew}
							>
								Save
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setPendingRemoveId(null);
							setAddingConnection(true);
						}}
						className="flex min-w-[200px] cursor-pointer items-center gap-2.5 rounded-paper border border-dashed border-paper-border bg-paper-surface px-2.5 py-2 text-paper-muted transition-colors hover:border-[color-mix(in_oklch,var(--fg)_25%,var(--border))] hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Plus className="h-3.5 w-3.5" aria-hidden />
						<span className="text-[12.5px] font-medium">Save current as…</span>
					</button>
				)}
			</div>
		</div>
	);
}

export { settingsBtnClass, settingsBtnPrimaryClass };
