import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { CommandPalette } from '@/components/sidebar/CommandPalette';
import {
	ALL_NAV_ITEMS,
	NAV_GROUPS,
	type CommandActionId,
	type NavItemConfig,
} from '@/config/navigation';
import { useActionableCounts } from '@/hooks/useActionableItemCount';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Search, WalletMinimal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';

const COLLAPSED_GROUPS_STORAGE_KEY = 'funds-sidebar-collapsed-groups';

type NavItemLinkProps = NavItemConfig & {
	actionableCount?: number;
	subtleBadge?: boolean;
};

function readCollapsedGroups(): Record<string, boolean> {
	if (typeof window === 'undefined') {
		return {};
	}
	try {
		const raw = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return {};
		}
		return Object.fromEntries(
			Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
		);
	} catch {
		return {};
	}
}

function NavItemLink({ to, label, icon: Icon, actionableCount, subtleBadge }: NavItemLinkProps) {
	const showBadge = actionableCount !== undefined && actionableCount > 0;
	const attentionTitle =
		actionableCount === 1
			? '1 item needs your attention'
			: `${actionableCount} items need your attention`;

	return (
		<li>
			<NavLink
				to={to}
				end={to === '/'}
				title={showBadge ? `${label} — ${attentionTitle}` : label}
				aria-label={showBadge ? `${label}, ${attentionTitle}` : label}
				className={({ isActive }) =>
					cn(
						'flex min-h-8 items-center gap-2 overflow-hidden rounded-paper px-2.5 py-1.5 text-[13px] tracking-[0.01em] transition duration-200 lg:min-h-[34px]',
						!isActive && 'font-normal text-paper-muted hover:bg-paper hover:text-paper-fg',
						isActive && 'bg-secondary-default/10 font-medium text-secondary-default'
					)
				}
			>
				<span className="relative inline-flex shrink-0">
					<Icon size="1rem" className="inline-block" aria-hidden />
					{showBadge ? (
						<span className="absolute -right-1.5 -top-1.5 lg:hidden">
							<ActionableBadge count={actionableCount} compact />
						</span>
					) : null}
				</span>
				<span className="hidden min-w-0 flex-1 truncate lg:inline">{label}</span>
				{showBadge ? (
					<span className="ml-auto hidden shrink-0 lg:inline">
						<ActionableBadge count={actionableCount} compact={subtleBadge} />
					</span>
				) : null}
			</NavLink>
		</li>
	);
}

function NavGroupBlock({
	title,
	items,
	collapsed,
	onToggle,
}: {
	groupId: string;
	title: string;
	items: NavItemLinkProps[];
	collapsed: boolean;
	onToggle: () => void;
}) {
	return (
		<section className="border-b border-paper-border pb-0.5">
			<button
				type="button"
				className="flex min-h-[34px] w-full items-center px-2.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-paper-fg lg:text-[11px]"
				aria-expanded={!collapsed}
				onClick={onToggle}
			>
				<span>{title}</span>
				<ChevronDown
					size={14}
					className={cn(
						'ml-auto text-paper-muted transition-transform duration-200',
						collapsed && '-rotate-90'
					)}
					aria-hidden
				/>
			</button>
			<div
				className={cn(
					'grid transition-[grid-template-rows,opacity] duration-200',
					collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
				)}
			>
				<div className="min-h-0 overflow-hidden">
					<ul className="flex flex-col gap-px px-1 lg:px-0">
						{items.map((item) => (
							<NavItemLink key={item.to} {...item} subtleBadge />
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

export function Sidebar() {
	const navigate = useNavigate();
	const { transfers, plannedMatches } = useActionableCounts();
	const [commandOpen, setCommandOpen] = useState(false);
	const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
		readCollapsedGroups()
	);

	const actionableCounts = useMemo(
		() => ({ transfers, plannedMatches }),
		[transfers, plannedMatches]
	);

	const resolveActionableCount = useCallback(
		(item: NavItemConfig): number | undefined => {
			if (item.actionableKey === 'transfers' && transfers > 0) {
				return transfers;
			}
			if (item.actionableKey === 'plannedMatches' && plannedMatches > 0) {
				return plannedMatches;
			}
			return undefined;
		},
		[plannedMatches, transfers]
	);

	const groupBlocks = useMemo(
		() =>
			NAV_GROUPS.map((group) => ({
				...group,
				items: group.items.map((item) => ({
					...item,
					actionableCount: resolveActionableCount(item),
				})),
			})),
		[resolveActionableCount]
	);

	const toggleGroup = (groupId: string) => {
		setCollapsedGroups((current) => {
			const next = { ...current, [groupId]: !current[groupId] };
			window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(next));
			return next;
		});
	};

	const runCommandAction = useCallback(
		(actionId: CommandActionId) => {
			switch (actionId) {
				case 'upload-statement':
					navigate('/statements?upload=1');
					break;
				case 'add-transaction':
					navigate('/transactions');
					break;
				case 'create-snapshot':
					navigate('/report-snapshots');
					break;
				case 'plan-spending':
					navigate('/planned?add=1');
					break;
			}
		},
		[navigate]
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setCommandOpen(true);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	const commandShortcutLabel =
		typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
			? '⌘K'
			: 'Ctrl+K';

	return (
		<>
			<div className="fixed left-0 top-0 z-40 flex h-full w-16 flex-col border-r border-paper-border bg-paper-surface text-paper-fg transition-all duration-500 lg:w-[250px]">
				<div className="flex h-16 shrink-0 items-center gap-2.5 px-3 lg:px-4">
					<div className="grid h-7 w-7 place-items-center rounded-[7px] bg-paper-fg font-sans text-[13px] font-semibold tracking-[-0.02em] text-paper-surface">
						F
					</div>
					<h1 className="hidden font-sans text-[15px] font-semibold uppercase tracking-[0.08em] lg:block">
						Funds
					</h1>
					<span className="sr-only">
						<WalletMinimal aria-hidden />
					</span>
				</div>

				<button
					type="button"
					className="mx-2 mb-2.5 hidden min-h-[42px] items-center gap-2 rounded-paper border border-paper-border bg-paper-surface px-2.5 text-left text-paper-fg shadow-[0_1px_2px_oklch(18%_0.012_250_/_0.04)] hover:border-secondary-default/35 hover:shadow-[0_2px_8px_oklch(18%_0.012_250_/_0.06)] lg:flex"
					onClick={() => setCommandOpen(true)}
					data-od-id="command-action-launcher"
				>
					<Search size={16} className="shrink-0 text-paper-muted" aria-hidden />
					<span className="min-w-0 flex-1 truncate text-[13px]">Find or do anything</span>
					<kbd className="shrink-0 rounded border border-paper-border bg-paper px-1.5 py-0.5 font-mono text-[10px] text-paper-muted">
						{commandShortcutLabel}
					</kbd>
				</button>

				<button
					type="button"
					className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-paper border border-paper-border text-paper-muted hover:bg-paper hover:text-paper-fg lg:hidden"
					aria-label="Find or do anything"
					onClick={() => setCommandOpen(true)}
				>
					<Search size={18} aria-hidden />
				</button>

				<nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-6 lg:px-3" aria-label="Main">
					<div className="hidden flex-col gap-0.5 lg:flex">
						{groupBlocks.map((group) => (
							<NavGroupBlock
								key={group.id}
								groupId={group.id}
								title={group.title}
								items={group.items}
								collapsed={collapsedGroups[group.id] === true}
								onToggle={() => toggleGroup(group.id)}
							/>
						))}
					</div>

					<div className="flex flex-col gap-0.5 lg:hidden">
						{ALL_NAV_ITEMS.map((item) => (
							<NavItemLink
								key={item.to}
								{...item}
								actionableCount={resolveActionableCount(item)}
							/>
						))}
					</div>
				</nav>

				<div className="hidden shrink-0 border-t border-paper-border px-4 py-3 text-[11px] leading-relaxed text-paper-muted lg:block">
					Browse all 16 · act without leaving
					<br />
					Self-hosted · AUD
				</div>
			</div>

			<CommandPalette
				open={commandOpen}
				onClose={() => setCommandOpen(false)}
				onRunAction={runCommandAction}
				actionableCounts={actionableCounts}
			/>
		</>
	);
}
