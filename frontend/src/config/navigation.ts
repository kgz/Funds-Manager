import type { LucideIcon } from 'lucide-react';
import {
	Banknote,
	Building2,
	CalendarRange,
	Camera,
	ChartPie,
	CopyCheck,
	FileArchive,
	HandCoins,
	Landmark,
	LayoutList,
	LineChart,
	ListChecks,
	Plus,
	Receipt,
	Repeat,
	Scale,
	Settings,
	Upload,
} from 'lucide-react';

export type NavItemConfig = {
	to: string;
	label: string;
	icon: LucideIcon;
	actionableKey?: 'transfers' | 'plannedMatches';
};

export type NavGroupConfig = {
	id: string;
	title: string;
	items: NavItemConfig[];
};

export const NAV_GROUPS: NavGroupConfig[] = [
	{
		id: 'overview',
		title: 'Overview',
		items: [
			{ to: '/', label: 'Dashboard', icon: ChartPie },
			{ to: '/breakdown', label: 'Breakdown', icon: LayoutList },
			{ to: '/predictions', label: 'Future predictions', icon: LineChart },
		],
	},
	{
		id: 'cash-flow',
		title: 'Cash flow',
		items: [
			{ to: '/transactions', label: 'Transactions', icon: CopyCheck, actionableKey: 'transfers' },
			{ to: '/income', label: 'Income', icon: Banknote },
			{ to: '/lender-expenses', label: 'Living expenses', icon: ListChecks },
			{ to: '/serviceability', label: 'Serviceability', icon: Scale },
			{ to: '/report-snapshots', label: 'Report snapshots', icon: Camera },
			{ to: '/recurring', label: 'Repeat payments', icon: Repeat },
			{ to: '/planned', label: 'Planned spending', icon: CalendarRange, actionableKey: 'plannedMatches' },
		],
	},
	{
		id: 'net-worth',
		title: 'Net worth',
		items: [
			{ to: '/accounts', label: 'Accounts', icon: Landmark },
			{ to: '/assets', label: 'Assets', icon: Building2 },
			{ to: '/liabilities', label: 'Liabilities', icon: HandCoins },
		],
	},
	{
		id: 'data-setup',
		title: 'Data & setup',
		items: [
			{ to: '/statements', label: 'Statements', icon: FileArchive },
			{ to: '/categories', label: 'Categories', icon: Receipt },
			{ to: '/settings', label: 'Settings', icon: Settings },
		],
	},
];

export type CommandActionId =
	| 'upload-statement'
	| 'add-transaction'
	| 'create-snapshot'
	| 'plan-spending';

export type CommandActionConfig = {
	id: CommandActionId;
	label: string;
	detail: string;
	icon: LucideIcon;
};

export const COMMAND_ACTIONS: CommandActionConfig[] = [
	{
		id: 'upload-statement',
		label: 'Upload a statement',
		detail: 'Import without leaving the current page',
		icon: Upload,
	},
	{
		id: 'add-transaction',
		label: 'Add a transaction',
		detail: 'Open transactions to review and categorise',
		icon: Plus,
	},
	{
		id: 'create-snapshot',
		label: 'Create report snapshot',
		detail: 'Save the current reporting period',
		icon: Camera,
	},
	{
		id: 'plan-spending',
		label: 'Plan spending',
		detail: 'Add a future expense',
		icon: CalendarRange,
	},
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
	group.items.map((item) => ({ ...item, group: group.title }))
);

export function findNavItemByPath(path: string): NavItemConfig | undefined {
	return ALL_NAV_ITEMS.find((item) => item.to === path);
}
