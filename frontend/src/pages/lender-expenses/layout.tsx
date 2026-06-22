import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { cn } from '@/lib/utils/cn';

function tabLinkClass(isActive: boolean): string {
	return cn(
		'rounded px-3 py-1.5 text-sm transition-colors',
		isActive
			? 'bg-secondary-default/20 text-white shadow-sm'
			: 'text-white/70 hover:bg-white/5 hover:text-white'
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
				className="mb-6 inline-flex rounded-md border border-white/20 p-0.5"
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
