import { cn } from '@/lib/utils/cn';
import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { useActionableCounts } from '@/hooks/useActionableItemCount';
import {
	Banknote,
	Building2,
	CalendarRange,
	ChartPie,
	Camera,
	CopyCheck,
	FileArchive,
	HandCoins,
	Landmark,
	LayoutList,
	LineChart,
	ListChecks,
	LucideIcon,
	Receipt,
	Repeat,
	Scale,
	Settings,
	WalletMinimal,
} from 'lucide-react';
import { NavLink } from 'react-router';

type NavItem = {
	to: string;
	label: string;
	icon: LucideIcon;
	actionableCount?: number;
};

type NavSection = {
	title: string;
	items: NavItem[];
};

const navSections: NavSection[] = [
	{
		title: 'Overview',
		items: [
			{ to: '/', label: 'Dashboard', icon: ChartPie },
			{ to: '/breakdown', label: 'Breakdown', icon: LayoutList },
			{ to: '/predictions', label: 'Future predictions', icon: LineChart },
		],
	},
	{
		title: 'Cash flow',
		items: [
			{ to: '/transactions', label: 'Transactions', icon: CopyCheck },
			{ to: '/income', label: 'Income', icon: Banknote },
			{ to: '/lender-expenses', label: 'Living expenses', icon: ListChecks },
			{ to: '/serviceability', label: 'Serviceability', icon: Scale },
			{ to: '/report-snapshots', label: 'Report snapshots', icon: Camera },
			{ to: '/recurring', label: 'Repeat payments', icon: Repeat },
			{ to: '/planned', label: 'Planned spending', icon: CalendarRange },
		],
	},
	{
		title: 'Net worth',
		items: [
			{ to: '/accounts', label: 'Accounts', icon: Landmark },
			{ to: '/assets', label: 'Assets', icon: Building2 },
			{ to: '/liabilities', label: 'Liabilities', icon: HandCoins },
		],
	},
	{
		title: 'Data & setup',
		items: [
			{ to: '/statements', label: 'Statements', icon: FileArchive },
			{ to: '/categories', label: 'Categories', icon: Receipt },
			{ to: '/settings', label: 'Settings', icon: Settings },
		],
	},
];

function NavItemLink({ to, label, icon: Icon, actionableCount }: NavItem) {
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
						'flex items-center gap-2 overflow-hidden rounded-paper px-3 py-3 text-sm transition duration-200 lg:px-2.5 lg:py-1.5',
						!isActive && 'text-paper-muted hover:bg-paper hover:text-paper-fg',
						isActive &&
							'bg-secondary-default/10 font-medium text-secondary-default'
					)
				}
			>
				<span className="relative inline-flex shrink-0">
					<Icon size="1rem" className="inline-block" aria-hidden />
					{showBadge ? (
						<span className="absolute -right-1.5 -top-1.5 lg:hidden">
							<ActionableBadge />
						</span>
					) : null}
				</span>
				<span className="hidden min-w-0 flex-1 truncate lg:inline">{label}</span>
				{showBadge ? (
					<span className="hidden shrink-0 lg:inline">
						<ActionableBadge />
					</span>
				) : null}
			</NavLink>
		</li>
	);
}

function NavSectionBlock({
	title,
	items,
	isFirst,
}: NavSection & { isFirst: boolean }) {
	return (
		<div
			className={cn(
				!isFirst && 'mt-3 border-t border-paper-border pt-3 lg:mt-4'
			)}
		>
			<h2 className="mb-1.5 hidden px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-paper-muted lg:block">
				{title}
			</h2>
			<ul className="flex flex-col gap-0.5 px-1 lg:px-0">
				{items.map((item) => (
					<NavItemLink key={item.to} {...item} />
				))}
			</ul>
		</div>
	);
}

export function Sidebar() {
	const { transfers, plannedMatches } = useActionableCounts();

	const sections = navSections.map((section) => ({
		...section,
		items: section.items.map((item) => {
			if (item.to === '/transactions') {
				return {
					...item,
					actionableCount: transfers,
				};
			}
			if (item.to === '/planned') {
				return {
					...item,
					actionableCount: plannedMatches,
				};
			}
			return item;
		}),
	}));

	return (
		<div className="fixed left-0 top-0 flex h-full w-16 flex-col border-r border-paper-border bg-paper-surface text-paper-fg transition-all duration-500 lg:w-64">
			<div className="flex h-16 shrink-0 items-center gap-2.5 px-3 lg:px-4">
				<div className="grid h-7 w-7 place-items-center rounded-[7px] bg-paper-fg text-[13px] font-semibold tracking-tight text-paper-surface">
					F
				</div>
				<h1 className="hidden text-[15px] font-semibold uppercase tracking-[0.08em] lg:block">
					Funds
				</h1>
				<span className="sr-only">
					<WalletMinimal aria-hidden />
				</span>
			</div>

			<nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 pb-6 lg:mt-3 lg:px-3" aria-label="Main">
				{sections.map((section, index) => (
					<NavSectionBlock key={section.title} {...section} isFirst={index === 0} />
				))}
			</nav>

			<div className="hidden shrink-0 border-t border-paper-border px-4 py-3 text-[11px] text-paper-muted lg:block">
				Self-hosted · AUD
			</div>
		</div>
	);
}
