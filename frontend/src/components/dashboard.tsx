import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllCategories, type Category } from "@/store/thunks/category.get.all";
// import { getMappings } from "@/store/thunks/mapping.get.all"; // Only import if used directly here
import { getAllTransactions, type Transaction } from "@/store/thunks/transactions.get.all";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryPieChart, type PieChartDataItem } from '@/graphs/pie'; // Import the new component and type
import { MonthlyBarGraph } from "@/graphs/bar";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, FileArchive, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getMappings } from "@/store/thunks/mapping.get.all";

// --- Helper Functions (Consider moving to a utils file) ---

// Helper function for currency formatting with commas and optional decimals
const formatCurrencyWithCommas = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '$--'; // Handle null/undefined balance
    const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};

function spendingGroupKeyForTransaction(
	tx: Transaction,
	categoryList: Category[],
	groupByParentCategory: boolean
): string {
	const categoryForGrouping = categoryList.find(
		(cat) => String(cat.id) === String(tx.category_id)
	);

	if (groupByParentCategory && categoryForGrouping?.parent_category_id) {
		const parentCategory = categoryList.find(
			(cat) =>
				String(cat.id) === String(categoryForGrouping.parent_category_id)
		);
		if (parentCategory) {
			return String(parentCategory.id);
		}
		return 'unknown';
	}

	return String(tx.category_id ?? 'unknown');
}

function DashboardSkeleton() {
	return (
		<div className="p-4 md:p-6 space-y-8 animate-pulse">
			<div className="flex flex-wrap justify-between items-center gap-4">
				<div className="h-8 w-56 rounded-md bg-white/10" />
				<div className="h-9 w-44 rounded-md bg-white/10" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
				<div className="h-[360px] rounded-xl border border-white/10 bg-white/5" />
				<div className="lg:col-span-2 h-[400px] rounded-xl border border-white/10 bg-white/5" />
				<div className="lg:col-span-2 h-[340px] rounded-xl border border-white/10 bg-white/5" />
			</div>
		</div>
	);
}

function DashboardEmptyState() {
	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
			<div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
				<FileArchive className="mx-auto h-12 w-12 text-white/40" />
				<h2 className="mt-4 text-lg font-semibold text-white">No transactions yet</h2>
				<p className="mt-2 text-sm text-white/60">
					Upload a bank statement PDF to see spending, income, and balance charts here.
				</p>
				<Link
					to="/statements"
					className="mt-6 inline-flex rounded-md border border-secondary-default bg-secondary-default/20 px-4 py-2 text-sm font-medium text-white hover:bg-secondary-default/30"
				>
					Upload statements
				</Link>
			</div>
		</div>
	);
}

function DashboardErrorState({ message }: { message: string }) {
	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
			<div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/40 p-8 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-red-400" />
				<h2 className="mt-4 text-lg font-semibold text-white">Could not load dashboard</h2>
				<p className="mt-2 text-sm text-white/70">{message}</p>
			</div>
		</div>
	);
}

function GroupByParentToggle({
	enabled,
	onChange,
}: {
	enabled: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<div
			className="inline-flex rounded-md border border-white/20 p-0.5"
			role="group"
			aria-label="Category grouping"
		>
			<button
				type="button"
				className={`rounded px-3 py-1.5 text-sm transition-colors ${
					!enabled
						? 'border-secondary-default bg-secondary-default/20 text-white'
						: 'text-white/70 hover:text-white'
				}`}
				aria-pressed={!enabled}
				onClick={() => onChange(false)}
			>
				By category
			</button>
			<button
				type="button"
				className={`rounded px-3 py-1.5 text-sm transition-colors ${
					enabled
						? 'border-secondary-default bg-secondary-default/20 text-white'
						: 'text-white/70 hover:text-white'
				}`}
				aria-pressed={enabled}
				onClick={() => onChange(true)}
			>
				By parent
			</button>
		</div>
	);
}

export const Dashboard = () => {

	 const dispatch = useAppDispatch();
	
		// Select data from the Redux store
		const { transactions, transactionsLoading, transactionsError } = useAppSelector(
			(state) => state.TransactionsReducer
		);
	
		const { categories, categoriesLoading, categoriesError } = useAppSelector(state => state.CategoryReducer);

		const transactionList = useMemo<Transaction[]>(() => {
			return Array.isArray(transactions) ? transactions : [];
		}, [transactions]);

		const categoryList = useMemo<Category[]>(() => {
			return Array.isArray(categories) ? categories : [];
		}, [categories]);

		// State to control grouping
		const [groupByParentCategory, setGroupByParentCategory] = useState<boolean>(() => {
			// Initialize state from localStorage or default to false
			return localStorage.getItem('groupByParentCategory') === 'true';
		});

		const [spendingBreakdownGroupKey, setSpendingBreakdownGroupKey] = useState<string | null>(null);
		const [breakdownGroupByName, setBreakdownGroupByName] = useState(false);

		const categoriesAutoFetchCommittedRef = useRef(false);
		const transactionsAutoFetchCommittedRef = useRef(false);
	
		useEffect(() => {
			void dispatch(getMappings());
		}, [dispatch]);

		useEffect(() => {
			if (categoryList.length > 0) {
				return;
			}
			if (categoriesError !== null) {
				return;
			}
			if (categoriesLoading) {
				return;
			}
			if (categoriesAutoFetchCommittedRef.current) {
				return;
			}
			categoriesAutoFetchCommittedRef.current = true;
			void dispatch(getAllCategories());
		}, [
			dispatch,
			categoryList.length,
			categoriesLoading,
			categoriesError,
		]);

		useEffect(() => {
			if (transactionList.length > 0) {
				return;
			}
			if (transactionsError !== null) {
				return;
			}
			if (transactionsLoading) {
				return;
			}
			if (transactionsAutoFetchCommittedRef.current) {
				return;
			}
			transactionsAutoFetchCommittedRef.current = true;
			void dispatch(getAllTransactions());
		}, [
			dispatch,
			transactionList.length,
			transactionsLoading,
			transactionsError,
		]);

		// Effect to save grouping state to localStorage whenever it changes
		useEffect(() => {
			localStorage.setItem('groupByParentCategory', String(groupByParentCategory));
		}, [groupByParentCategory]);

		useEffect(() => {
			if (spendingBreakdownGroupKey === null) {
				setBreakdownGroupByName(false);
			}
		}, [spendingBreakdownGroupKey]);

	// --- Data Processing for Charts ---
	const { spendingByCategory, incomeByCategory } = useMemo(() => {

		const spending: Record<string, PieChartDataItem> = {};
		const income: Record<string, PieChartDataItem> = {};
		transactionList.forEach((tx) => {
			let groupCategoryId: string | number | null = tx.category_id ?? 'unknown';
			const categoryForGrouping: Category | undefined | null = categoryList.find(cat => String(cat.id) === String(tx.category_id));
			let categoryName: string;

			if (groupByParentCategory && categoryForGrouping?.parent_category_id) {
				// Find the parent category
				const parentCategory = categoryList.find(cat => String(cat.id) === String(categoryForGrouping?.parent_category_id));
				if (parentCategory) {
					groupCategoryId = parentCategory.id;
					categoryName = parentCategory.name;
				} else { // Parent not found, treat as unknown or keep original? Let's treat as unknown for now.
					groupCategoryId = 'unknown';
					categoryName = 'Unknown';
				}
			} else {
				categoryName = categoryForGrouping?.name ?? 'Unknown';
			}
			const amount = tx.amount / 100; // Convert cents to dollars
			const category = categoryList.find(x=>Number(x.id) === groupCategoryId);
			// Assign color consistently
			// Consider a more robust fallback mechanism if needed (like the previous FALLBACK_COLORS array)
			const color =
				category?.colour ??
				(groupCategoryId === 'unknown' ? '#6c757d' : '#8884d8'); // Grey for unknown, default purple otherwise

			const key = spendingGroupKeyForTransaction(tx, categoryList, groupByParentCategory);

			if (amount < 0) {
				const absAmount = Math.abs(amount);
				if (!spending[key]) {
					spending[key] = {
						name: categoryName,
						value: 0,
						color: color,
						categoryId: groupCategoryId === 'unknown' ? null : groupCategoryId,
						percent: 0,
						groupKey: key,
					};
				}
				spending[key].value += absAmount;
			} else if (amount > 0) {
				if (!income[key]) {
					income[key] = {
						name: categoryName,
						value: 0,
						color: color,
						categoryId: groupCategoryId === 'unknown' ? null : groupCategoryId,
						percent: 0,
						groupKey: key,
					};
				}
				income[key].value += amount;
			}
		});

		// Calculate total spending for percentage calculation
		const totalSpending = Object.values(spending).reduce((sum, item) => sum + item.value, 0);
		// Calculate total income for percentage calculation
		const totalIncome = Object.values(income).reduce((sum, item) => sum + item.value, 0);

		// Convert to array format for Recharts, rounding values
		const spendingData: PieChartDataItem[] = Object.values(spending)
			.map((item) => {
				const value = parseFloat(item.value.toFixed(2));
				const percent =
					totalSpending > 0
						? parseFloat(((item.value / totalSpending) * 100).toFixed(1))
						: 0;
				return { ...item, value, percent };
			})
			.sort((a, b) => b.value - a.value);

		const incomeData: PieChartDataItem[] = Object.values(income).map(item => {
			const value = parseFloat(item.value.toFixed(2));
			const percent = totalIncome > 0 ? parseFloat(((item.value / totalIncome) * 100).toFixed(1)) : 0;
			return { ...item, value, percent }; // Add percent property
		});

		return { spendingByCategory: spendingData, incomeByCategory: incomeData };

	}, [transactionList, categoryList, groupByParentCategory]); // Add groupByParentCategory dependency

	const spendingBreakdownTitle = useMemo(() => {
		if (spendingBreakdownGroupKey === null) {
			return '';
		}
		const row = spendingByCategory.find((d) => d.groupKey === spendingBreakdownGroupKey);
		return row?.name ?? 'Category';
	}, [spendingByCategory, spendingBreakdownGroupKey]);

	const spendingBreakdownRows = useMemo(() => {
		if (spendingBreakdownGroupKey === null) {
			return [];
		}
		return transactionList
			.filter((tx) => tx.amount < 0)
			.filter(
				(tx) =>
					spendingGroupKeyForTransaction(tx, categoryList, groupByParentCategory) ===
					spendingBreakdownGroupKey
			)
			.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
	}, [
		transactionList,
		categoryList,
		groupByParentCategory,
		spendingBreakdownGroupKey,
	]);

	const spendingBreakdownTotal = useMemo(() => {
		const sum =
			spendingBreakdownRows.reduce((s, tx) => s + Math.abs(tx.amount), 0) / 100;
		return parseFloat(sum.toFixed(2));
	}, [spendingBreakdownRows]);

	type SpendingBreakdownNameRow = {
		name: string;
		totalDollars: number;
		count: number;
	};

	const spendingBreakdownGroupedByName = useMemo((): SpendingBreakdownNameRow[] => {
		const map = new Map<string, Transaction[]>();
		for (const tx of spendingBreakdownRows) {
			const name = tx.description.trim().length > 0 ? tx.description.trim() : '(no description)';
			const arr = map.get(name) ?? [];
			arr.push(tx);
			map.set(name, arr);
		}
		const rows: SpendingBreakdownNameRow[] = [];
		for (const [name, txs] of map) {
			const totalDollars = parseFloat(
				(txs.reduce((s, t) => s + Math.abs(t.amount), 0) / 100).toFixed(2)
			);
			rows.push({ name, totalDollars, count: txs.length });
		}
		rows.sort((a, b) => b.totalDollars - a.totalDollars);
		return rows;
	}, [spendingBreakdownRows]);

	const monthlySummary = useMemo(() => {
		const summary: Record<
			string,
			{ spending: number; receiving: number; label: string }
		> = {};

		transactionList.forEach((tx) => {
			const date = new Date(tx.transaction_date);
			const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			const label = date.toLocaleString("en-US", {
				year: "numeric",
				month: "short",
			});
			const amount = tx.amount / 100;

			if (!summary[sortKey]) {
				summary[sortKey] = { spending: 0, receiving: 0, label };
			}

			if (amount < 0) {
				summary[sortKey].spending += Math.abs(amount);
			} else {
				summary[sortKey].receiving += amount;
			}
		});

		return Object.entries(summary)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, values]) => ({
				month: values.label,
				spending: values.spending,
				receiving: values.receiving,
			}));
	}, [transactionList]);

	const runningTotalData = useMemo(()=>{
		const sorted = [...transactionList].sort(
			(a, b) =>
				new Date(a.transaction_date).getTime() -
				new Date(b.transaction_date).getTime()
		);
		const data = sorted.map((x)=>{
			return {
				date: new Date(x.transaction_date).toLocaleDateString("en-AU"),
				val: x.balance/100 // Using the balance property directly
			}
		})

		return data


	}, [transactionList])

	const isLoading = transactionsLoading || categoriesLoading;
	const loadError = transactionsError ?? categoriesError;

	if (isLoading && transactionList.length === 0) {
		return <DashboardSkeleton />;
	}

	if (loadError !== null) {
		return <DashboardErrorState message={loadError} />;
	}

	if (transactionList.length === 0) {
		return <DashboardEmptyState />;
	}

    return (
      <div className="p-4 md:p-6 space-y-8">
		{spendingBreakdownGroupKey !== null ? (
			<>
				<div
					role="presentation"
					className="fixed inset-0 z-40 bg-black/50"
					onClick={() => {
						setSpendingBreakdownGroupKey(null);
					}}
				/>
				<aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-gray-950 shadow-2xl">
					<div className="flex shrink-0 flex-col gap-3 border-b border-white/10 p-4">
						<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-white/50">
								Spending breakdown
							</p>
							<h2 className="text-lg font-semibold text-white">{spendingBreakdownTitle}</h2>
							<p className="mt-1 text-sm text-white/70">
								Total{' '}
								<span className="font-medium tabular-nums text-red-400">
									{formatCurrencyWithCommas(-spendingBreakdownTotal)}
								</span>
								{' · '}
								{spendingBreakdownRows.length}{' '}
								{spendingBreakdownRows.length === 1 ? 'transaction' : 'transactions'}
							</p>
						</div>
						<button
							type="button"
							className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
							aria-label="Close"
							onClick={() => {
								setSpendingBreakdownGroupKey(null);
							}}
						>
							<X className="h-5 w-5" />
						</button>
						</div>
						<button
							type="button"
							className={`self-start rounded-md border px-3 py-1.5 text-sm ${
								breakdownGroupByName
									? 'border-secondary-default bg-secondary-default/20 text-white'
									: 'border-white/20 text-white/85 hover:bg-white/10'
							}`}
							aria-pressed={breakdownGroupByName}
							onClick={(e) => {
								e.stopPropagation();
								setBreakdownGroupByName((v) => !v);
							}}
						>
							Group by name
						</button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						{spendingBreakdownRows.length === 0 ? (
							<p className="text-center text-sm text-white/50">No spending transactions in this group.</p>
						) : breakdownGroupByName ? (
							<ul className="space-y-2">
								{spendingBreakdownGroupedByName.map((row) => (
									<li
										key={row.name}
										className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
									>
										<div className="flex justify-between gap-2 text-white">
											<span className="font-medium tabular-nums text-red-400">
												{formatCurrencyWithCommas(-row.totalDollars)}
											</span>
											<span className="shrink-0 text-white/50">
												{row.count}×
											</span>
										</div>
										<p className="mt-1 break-words text-white/80">{row.name}</p>
									</li>
								))}
							</ul>
						) : (
							<ul className="space-y-2">
								{spendingBreakdownRows.map((tx) => {
									const dollars = tx.amount / 100;
									const when = tx.transaction_date.slice(0, 10);
									const amountClass =
										dollars < 0 ? 'text-red-400' : 'text-emerald-300/90';
									return (
										<li
											key={tx.id}
											className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
										>
											<div className="flex justify-between gap-2 text-white">
												<span className={`font-medium tabular-nums ${amountClass}`}>
													{formatCurrencyWithCommas(dollars)}
												</span>
												<span className="shrink-0 text-white/50">{when}</span>
											</div>
											<p className="mt-1 break-words text-white/80">{tx.description}</p>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</aside>
			</>
		) : null}
		<div className="flex flex-wrap justify-between items-center gap-4 mb-6">
			<h2 className="text-2xl font-semibold text-white">Spending & Income Overview</h2>
			<GroupByParentToggle
				enabled={groupByParentCategory}
				onChange={setGroupByParentCategory}
			/>
		</div>

		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
			{/* Spending Pie Chart */}
			<CategoryPieChart
				data={spendingByCategory}
				title="Spending by Category"
				subtitle="Click a slice to see transactions"
				onSliceClick={(item) => {
					setSpendingBreakdownGroupKey(item.groupKey);
				}}
			/>

			{/* Income Pie Chart */}
				<CategoryPieChart data={incomeByCategory} title="Income by Category" />
			{/* Monthly Bar Graph - Spanning 2 columns on large screens */}
			<div className="lg:col-span-2">
				<MonthlyBarGraph data={monthlySummary} title="Monthly Profit / Loss"/>
			</div>
			<div className="lg:col-span-2">
			<h2 className="text-lg font-semibold mb-2 text-center text-white/90">Balance Over Time</h2>

			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={runningTotalData}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="date" />
					<YAxis dataKey="val" tickFormatter={formatCurrencyWithCommas} />
					<Tooltip formatter={(value: number) => formatCurrencyWithCommas(value)} />
					<Legend wrapperStyle={{ paddingTop: '20px' }}/>
					<Line type="monotone" dataKey="val" name="Balance" stroke="#82ca9d" dot={false} />
					<ReferenceLine
						y={
							runningTotalData.length === 0
								? 0
								: runningTotalData.reduce((sum, d) => sum + d.val, 0) /
									runningTotalData.length
						}
						stroke="#ffc658" // Yellow for Average
						// strokeDasharray="3 3"
						label={{ value: "Avg", position: "right", fill: "#ffc658" }}
						name="Average Balance" // Add name for Legend
					/>
					<ReferenceLine
						y={
							runningTotalData.length === 0
								? 0
								: Math.min(...runningTotalData.map((d) => d.val))
						}
						stroke="#f87171" // Red for Min
						// strokeDasharray="3 3"
						label={{ value: "Min", position: "right", fill: "#f87171" }}
						name="Min Balance" // Add name for Legend
					/>
					<ReferenceLine
						y={
							runningTotalData.length === 0
								? 0
								: Math.max(...runningTotalData.map((d) => d.val))
						}
						stroke="#4ade80" // Green for Max
						// strokeDasharray="3 3"
						label={{ value: "Max", position: "right", fill: "#4ade80" }}
						name="Max Balance" // Add name for Legend
					/>
					{/* <Brush
						dataKey="date"
						height={30}
						stroke="#82ca9d"
						onChange={(newRange) => {
							if (newRange && newRange.hasOwnProperty("startIndex") && newRange.hasOwnProperty("endIndex")) {
								setSelectedRange([newRange.startIndex ?? 0, newRange.endIndex ?? 0]);
							}
						}}
					/> */}
				</LineChart>
			</ResponsiveContainer>
			</div>
		</div>
      </div>
    );
  };
  