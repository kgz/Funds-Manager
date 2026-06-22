import { cn } from '@/lib/utils/cn';
import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { useActionableItemCount } from '@/hooks/useActionableItemCount';
import {
	Banknote,
	Building2,
	CalendarRange,
	ChartPie,
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
	WalletMinimal,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

type SidebarProps = {
	setTheme: React.Dispatch<React.SetStateAction<string>>;
	theme: string;
};

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
						'flex items-center gap-2 overflow-hidden px-6 py-4 text-sm transition duration-200 lg:py-2',
						!isActive && 'bg-transparent opacity-50 hover:opacity-70',
						isActive &&
							'border-l-2 border-secondary-default bg-white/10 pl-[1.375rem] text-secondary-default opacity-100'
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
				!isFirst && 'mt-3 border-t border-white/5 pt-3 lg:mt-5 lg:border-0 lg:pt-0'
			)}
		>
			<h2 className="mb-2 hidden px-6 text-xs font-semibold uppercase tracking-wide text-white/40 lg:block">
				{title}
			</h2>
			<ul>
				{items.map((item) => (
					<NavItemLink key={item.to} {...item} />
				))}
			</ul>
		</div>
	);
}

export function Sidebar(_props: SidebarProps) {
	const actionableCount = useActionableItemCount();

	const sections = navSections.map((section) => ({
		...section,
		items: section.items.map((item) => {
			if (item.to !== '/transactions') {
				return item;
			}
			return {
				...item,
				actionableCount,
			};
		}),
	}));

	return (
		<div className="fixed left-0 top-0 h-full w-16 border-r border-white/10 bg-gray-950/80 text-white/90 backdrop-blur-md transition-all duration-500 lg:w-64">
			<div className="flex h-16 items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<WalletMinimal aria-hidden />
					<h1 className="hidden text-xl font-bold lg:block">FUNDS</h1>
				</div>
			</div>

			<nav className="mt-4 overflow-y-auto pb-6 lg:mt-6" aria-label="Main">
				{sections.map((section, index) => (
					<NavSectionBlock key={section.title} {...section} isFirst={index === 0} />
				))}
			</nav>
		</div>
	);
}
