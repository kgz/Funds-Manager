import { cn } from '@/lib/utils/cn';
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
		],
	},
	{
		title: 'Cash flow',
		items: [
			{ to: '/transactions', label: 'Transactions', icon: CopyCheck },
			{ to: '/income', label: 'Income', icon: Banknote },
			{ to: '/recurring', label: 'Repeat payments', icon: Repeat },
			{ to: '/planned', label: 'Planned spending', icon: CalendarRange },
			{ to: '/predictions', label: 'Future predictions', icon: LineChart },
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

function NavItemLink({ to, label, icon: Icon }: NavItem) {
	return (
		<li>
			<NavLink
				to={to}
				end={to === '/'}
				title={label}
				aria-label={label}
				className={({ isActive }) =>
					cn(
						'block overflow-hidden px-6 py-4 text-sm transition duration-200 lg:py-2',
						!isActive && 'bg-transparent opacity-50 hover:opacity-70',
						isActive &&
							'border-l-2 border-secondary-default bg-white/10 pl-[1.375rem] text-secondary-default opacity-100'
					)
				}
			>
				<Icon size="1rem" className="mr-2 inline-block shrink-0" aria-hidden />
				<span className="hidden lg:inline">{label}</span>
			</NavLink>
		</li>
	);
}

function NavSectionBlock({ title, items, isFirst }: NavSection & { isFirst: boolean }) {
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
	return (
		<div className="fixed left-0 top-0 h-full w-16 border-r border-white/10 bg-gray-950/80 text-white/90 backdrop-blur-md transition-all duration-500 lg:w-64">
			<div className="flex h-16 items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<WalletMinimal aria-hidden />
					<h1 className="hidden text-xl font-bold lg:block">FUNDS</h1>
				</div>
			</div>

			<nav className="mt-4 overflow-y-auto pb-6 lg:mt-6" aria-label="Main">
				{navSections.map((section, index) => (
					<NavSectionBlock key={section.title} {...section} isFirst={index === 0} />
				))}
			</nav>
		</div>
	);
}
