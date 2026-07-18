import { NavLink, Outlet } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { cn } from '@/lib/utils/cn';

function tabLinkClass(isActive: boolean): string {
	return cn(
		'rounded px-3 py-1.5 text-sm transition-colors',
		isActive
			? 'bg-secondary-default/15 text-secondary-default shadow-sm'
			: 'text-paper-muted hover:bg-paper hover:text-paper-fg'
	);
}

export function LenderExpensesLayout() {
	return (
		<PageShell>
			<PageHeader
				title="Living expenses"
				subtitle="HEM-style monthly averages and category mapping for broker declarations."
			/>

			<nav
				className="mb-6 inline-flex rounded-md border border-paper-border p-0.5"
				aria-label="Living expenses sections"
			>
				<NavLink
					to="/lender-expenses"
					end
					className={({ isActive }) => tabLinkClass(isActive)}
				>
					Monthly summary
				</NavLink>
				<NavLink
					to="/lender-expenses/mappings"
					className={({ isActive }) => tabLinkClass(isActive)}
				>
					Category mapping
				</NavLink>
			</nav>

			<Outlet />
		</PageShell>
	);
}
