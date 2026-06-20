import { cn } from "@/lib/utils/cn";
import { ChartPie, CalendarRange, CopyCheck, FileArchive, Landmark, LayoutList, LineChart, Receipt, Repeat, WalletMinimal } from "lucide-react";
import { NavLink } from "react-router-dom";
type SidebarProps = {
	setTheme: React.Dispatch<React.SetStateAction<string>>;
	theme: string;
};

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
	return (
		<li>
			<NavLink
				to={to}
				className={({ isActive }) =>
					cn(
						!isActive && "opacity-50 bg-transparent hover:opacity-70",
						"block px-6 text-sm transition duration-200 overflow-hidden",
						// "block py-2 px-6 text-lg text-gray-300 hover:bg-gray-700 hover:text-white ",
						isActive && 'border-l-2 border-secondary-default bg-white/10 pl-[1.375rem] text-secondary-default opacity-100',
						"py-4 lg:py-2",
						// on xs hide text
				)
				}
				area-label={children}
				aria-current={children ? "page" : undefined}
			>
				{children}
			</NavLink>
		</li>
	);
}

// @ts-expect-error
export const Sidebar = ({ setTheme, theme }: SidebarProps) => {




	return (



		<div className="fixed top-0 left-0 h-full w-16 border-r border-white/10 bg-gray-950/80 text-white/90 backdrop-blur-md transition-all duration-500 lg:w-64">
			<div className="flex items-center justify-between h-16 px-4 ">
				<div className="flex items-center gap-2">
					<WalletMinimal /> <h1 className="text-xl font-bold hidden lg:block">FUNDS</h1>
				</div>
				
			</div>

			<nav className="mt-8 ">
				<div className="items-center justify-between px-4 hidden lg:flex">
					{/* //add geenral; header */}
					<h2 className="ml-2 text-sm font-semibold text-white/50 mb-2">General</h2>

				</div>
				<ul>
						<Link to="/">
							<ChartPie size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Dashboard</span>
						</Link>
			
						<Link to="/transactions">
							<CopyCheck size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Transactions</span>
						</Link>
						<Link to="/recurring">
							<Repeat size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Repeat payments</span>
						</Link>
						<Link to="/planned">
							<CalendarRange size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Planned spending</span>
						</Link>
						<Link to="/predictions">
							<LineChart size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Future predictions</span>
						</Link>
						<Link to="/breakdown">
							<LayoutList size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Breakdown</span>
						</Link>
						<Link to="/statements">
							<FileArchive size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Statements</span>
						</Link>
						<Link to="/categories">
							<Receipt size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Categories</span>
						</Link>
						<Link to="/accounts">
							<Landmark size="1rem" className="inline-block mr-2" />
							<span className="hidden lg:inline">Accounts</span>
						</Link>

				</ul>
			</nav>
		</div>
	);
};

