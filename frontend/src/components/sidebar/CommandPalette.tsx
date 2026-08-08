import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { cn } from '@/lib/utils/cn';
import {
	ALL_NAV_ITEMS,
	COMMAND_ACTIONS,
	type CommandActionId,
	type NavItemConfig,
} from '@/config/navigation';
import { Search, X } from 'lucide-react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router';

type CommandPaletteProps = {
	open: boolean;
	onClose: () => void;
	onRunAction: (actionId: CommandActionId) => void;
	actionableCounts: {
		transfers: number;
		plannedMatches: number;
	};
};

type ResultRow =
	| { kind: 'action'; id: CommandActionId }
	| { kind: 'destination'; to: string };

function itemBadgeCount(
	item: NavItemConfig,
	counts: CommandPaletteProps['actionableCounts']
): number | undefined {
	if (item.actionableKey === 'transfers' && counts.transfers > 0) {
		return counts.transfers;
	}
	if (item.actionableKey === 'plannedMatches' && counts.plannedMatches > 0) {
		return counts.plannedMatches;
	}
	return undefined;
}

export function CommandPalette({
	open,
	onClose,
	onRunAction,
	actionableCounts,
}: CommandPaletteProps) {
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);

	const normalizedQuery = query.trim().toLowerCase();

	const filteredActions = useMemo(
		() =>
			COMMAND_ACTIONS.filter((action) =>
				`${action.label} ${action.detail}`.toLowerCase().includes(normalizedQuery)
			),
		[normalizedQuery]
	);

	const filteredDestinations = useMemo(
		() =>
			ALL_NAV_ITEMS.filter((item) =>
				`${item.label} ${item.group}`.toLowerCase().includes(normalizedQuery)
			),
		[normalizedQuery]
	);

	const rows = useMemo<ResultRow[]>(() => {
		const actionRows = filteredActions.map(
			(action): ResultRow => ({ kind: 'action', id: action.id })
		);
		const destinationRows = filteredDestinations.map(
			(item): ResultRow => ({ kind: 'destination', to: item.to })
		);
		return [...actionRows, ...destinationRows];
	}, [filteredActions, filteredDestinations]);

	const reset = useCallback(() => {
		setQuery('');
		setSelectedIndex(0);
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}
		reset();
		const frame = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [open, reset]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [normalizedQuery]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [open, onClose]);

	const activateRow = (row: ResultRow) => {
		if (row.kind === 'action') {
			onRunAction(row.id);
			onClose();
			return;
		}
		navigate(row.to);
		onClose();
	};

	const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setSelectedIndex((index) => Math.min(index + 1, Math.max(rows.length - 1, 0)));
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setSelectedIndex((index) => Math.max(index - 1, 0));
			return;
		}
		if (event.key === 'Enter' && rows[selectedIndex]) {
			event.preventDefault();
			activateRow(rows[selectedIndex]);
		}
	};

	if (!open) {
		return null;
	}

	const isMac =
		typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

	return (
		<div
			className="fixed inset-0 z-[80] grid place-items-start bg-paper-fg/35 px-3.5 pt-[10vh]"
			role="presentation"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="w-full max-w-[620px] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface shadow-[0_24px_70px_oklch(18%_0.012_250_/_0.24)]"
				role="dialog"
				aria-modal="true"
				aria-label="Find or do anything"
			>
				<div className="flex min-h-14 items-center gap-2.5 border-b border-paper-border px-3 pl-4">
					<Search size={18} className="shrink-0 text-paper-muted" aria-hidden />
					<input
						ref={inputRef}
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={onInputKeyDown}
						placeholder="Find a page or run an action…"
						aria-label="Find a page or run an action"
						className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base font-medium tracking-[-0.01em] text-paper-fg outline-none placeholder:font-normal placeholder:text-paper-muted"
						autoComplete="off"
						spellCheck={false}
					/>
					<kbd className="hidden rounded border border-paper-border bg-paper px-1.5 py-0.5 font-mono text-[10px] text-paper-muted sm:inline">
						Esc
					</kbd>
					<button
						type="button"
						className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-paper border border-paper-border bg-paper-surface text-paper-muted hover:bg-paper"
						aria-label="Close command palette"
						onClick={onClose}
					>
						<X size={16} aria-hidden />
					</button>
				</div>

				<div className="max-h-[52vh] overflow-y-auto p-2">
					{rows.length === 0 ? (
						<p className="px-6 py-6 text-center text-sm text-paper-muted">
							No matching action or destination.
						</p>
					) : null}

					{filteredActions.length > 0 ? (
						<div>
							<p className="mx-2 mb-1.5 mt-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-paper-muted">
								Actions · stay on this page
							</p>
							<ul>
								{filteredActions.map((action, index) => {
									const Icon = action.icon;
									const rowIndex = index;
									const selected = selectedIndex === rowIndex;
									return (
										<li key={action.id}>
											<button
												type="button"
												className={cn(
													'flex min-h-[54px] w-full items-center gap-2.5 rounded-paper px-2.5 py-1.5 text-left',
													selected
														? 'bg-secondary-default/10 text-secondary-default'
														: 'text-paper-fg hover:bg-secondary-default/10 hover:text-secondary-default'
												)}
												onMouseEnter={() => setSelectedIndex(rowIndex)}
												onClick={() => activateRow({ kind: 'action', id: action.id })}
											>
												<Icon size={16} className="shrink-0" aria-hidden />
												<span className="grid min-w-0 flex-1 gap-0.5">
													<span className="text-[13px] font-medium">{action.label}</span>
													<span className="text-[11px] text-paper-muted">{action.detail}</span>
												</span>
												<span className="ml-auto inline-flex rounded border border-paper-border px-1.5 py-0.5 font-mono text-[10px] text-paper-muted">
													Run
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</div>
					) : null}

					{filteredDestinations.length > 0 ? (
						<div>
							<p className="mx-2 mb-1.5 mt-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-paper-muted">
								Destinations
							</p>
							<ul>
								{filteredDestinations.map((item, index) => {
									const Icon = item.icon;
									const rowIndex = filteredActions.length + index;
									const selected = selectedIndex === rowIndex;
									const badge = itemBadgeCount(item, actionableCounts);
									return (
										<li key={item.to}>
											<button
												type="button"
												className={cn(
													'flex min-h-[42px] w-full items-center gap-2.5 rounded-paper px-2.5 py-1.5 text-left text-[13px]',
													selected
														? 'bg-secondary-default/10 text-secondary-default'
														: 'text-paper-fg hover:bg-secondary-default/10 hover:text-secondary-default'
												)}
												onMouseEnter={() => setSelectedIndex(rowIndex)}
												onClick={() =>
													activateRow({ kind: 'destination', to: item.to })
												}
											>
												<Icon size={16} className="shrink-0" aria-hidden />
												<span className="min-w-0 flex-1 truncate">{item.label}</span>
												<span className="text-[11px] text-paper-muted">{item.group}</span>
												{badge !== undefined ? (
													<ActionableBadge count={badge} compact />
												) : null}
											</button>
										</li>
									);
								})}
							</ul>
						</div>
					) : null}
				</div>
			</div>
			<span className="sr-only">{isMac ? 'Command K opens this palette' : 'Control K opens this palette'}</span>
		</div>
	);
}
