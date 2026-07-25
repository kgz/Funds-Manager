import { NavLink, Outlet } from 'react-router';
import { PageShell } from '@/components/layout/PageShell';
import { pageSubtitleClass, pageTitleClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';

function tabClass(isActive: boolean): string {
	return cn(
		'relative h-10 border-0 bg-transparent px-3.5 text-[13px] font-medium tracking-[0.01em] transition-colors',
		isActive
			? 'font-semibold text-paper-fg after:absolute after:-bottom-px after:left-3.5 after:right-3.5 after:h-0.5 after:rounded-t after:bg-paper-fg'
			: 'text-paper-muted hover:text-paper-fg'
	);
}

export function LenderExpensesLayout() {
	return (
		<PageShell variant="table">
			<header className="sticky top-0 z-30 shrink-0 bg-paper-surface">
				<div className="px-8 py-5">
					<h1 className={pageTitleClass}>Living expenses</h1>
					<p className={pageSubtitleClass}>
						HEM-style monthly averages and category mapping for broker declarations
					</p>
				</div>
				<nav
					className="flex gap-0 border-b border-paper-border px-8"
					role="tablist"
					aria-label="Living expenses views"
				>
					<NavLink
						to="/lender-expenses"
						end
						className={({ isActive }) => tabClass(isActive)}
						role="tab"
					>
						Monthly summary
					</NavLink>
					<NavLink
						to="/lender-expenses/mappings"
						className={({ isActive }) => tabClass(isActive)}
						role="tab"
					>
						Category mapping
					</NavLink>
				</nav>
			</header>

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				<Outlet />
			</div>
		</PageShell>
	);
}
