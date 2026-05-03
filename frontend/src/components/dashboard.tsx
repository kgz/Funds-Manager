import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllCategories, type Category } from "@/store/thunks/category.get.all";
// import { getMappings } from "@/store/thunks/mapping.get.all"; // Only import if used directly here
import { getAllTransactions, type Transaction } from "@/store/thunks/transactions.get.all";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryPieChart, type PieChartDataItem } from '@/graphs/pie'; // Import the new component and type
import { MonthlyBarGraph } from "@/graphs/bar";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { getMappings } from "@/store/thunks/mapping.get.all";

// --- Helper Functions (Consider moving to a utils file) ---

// Helper function for currency formatting with commas and optional decimals
const formatCurrencyWithCommas = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '$--'; // Handle null/undefined balance
    const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits: 2 })}`;
};


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

			const key = String(groupCategoryId); // Use the determined group ID as the key

			if (amount < 0) {
				const absAmount = Math.abs(amount);
				if (!spending[key]) {
					spending[key] = { name: categoryName, value: 0, color: color, categoryId: groupCategoryId === 'unknown' ? null : groupCategoryId, percent: 0 };
				}
				spending[key].value += absAmount;
			} else if (amount > 0) {
				if (!income[key]) {
					income[key] = { name: categoryName, value: 0, color: color, categoryId: groupCategoryId === 'unknown' ? null : groupCategoryId, percent: 0 };
				}
				income[key].value += amount;
			}
		});

		// Calculate total spending for percentage calculation
		const totalSpending = Object.values(spending).reduce((sum, item) => sum + item.value, 0);
		// Calculate total income for percentage calculation
		const totalIncome = Object.values(income).reduce((sum, item) => sum + item.value, 0);

		// Convert to array format for Recharts, rounding values
		const spendingData: PieChartDataItem[] = Object.values(spending).map(item => {
			const value = parseFloat(item.value.toFixed(2));
			const percent = totalSpending > 0 ? parseFloat(((item.value / totalSpending) * 100).toFixed(1)) : 0;
			return { ...item, value, percent };
		});

		const incomeData: PieChartDataItem[] = Object.values(income).map(item => {
			const value = parseFloat(item.value.toFixed(2));
			const percent = totalIncome > 0 ? parseFloat(((item.value / totalIncome) * 100).toFixed(1)) : 0;
			return { ...item, value, percent }; // Add percent property
		});

		return { spendingByCategory: spendingData, incomeByCategory: incomeData };

	}, [transactionList, categoryList, groupByParentCategory]); // Add groupByParentCategory dependency

	const monthlySummary = useMemo(() => {
		const summary: { [month: string]: { spending: number; receiving: number } } = {};

		transactionList.forEach(tx => {
			const date = new Date(tx.transaction_date);
			const month = date.toLocaleString("en-US", { year: "numeric", month: "short" });
			const amount = tx.amount / 100;

			if (!summary[month]) {
				summary[month] = { spending: 0, receiving: 0 };
			}

			if (amount < 0) {
				summary[month].spending += Math.abs(amount);
			} else {
				summary[month].receiving += amount;
			}
		});

		return Object.entries(summary).map(([month, values]) => ({
			month,
			...values,
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

	// --- Loading and Error States ---
	const isLoading = transactionsLoading || categoriesLoading;
	const error = transactionsError; // Combine errors if needed

	if (isLoading && transactionList.length === 0) {
		return (
			<div className="flex items-center justify-center h-64 w-full">
				<Loader2 className="w-12 h-12 animate-spin text-secondary-default" />
			</div>
		);
	}

	if (error) {
		return <div className="p-4 text-red-400">Error loading data: {error}</div>;
	}

    return (
      <div className="p-4 md:p-6 space-y-8">
		<div className="flex flex-wrap justify-between items-center gap-4 mb-6">
			<h2 className="text-2xl font-semibold text-white">Spending & Income Overview</h2>
			{/* Grouping Toggle */}
			<div className="flex items-center space-x-2">
				<input
					type="checkbox"
					id="groupByParent"
					checked={groupByParentCategory}
					onChange={(e) => setGroupByParentCategory(e.target.checked)}
					className="form-checkbox h-4 w-4 text-secondary-default bg-gray-800 border-gray-600 rounded focus:ring-secondary-default" />
				<label htmlFor="groupByParent" className="text-sm text-white/80 cursor-pointer">Group by Parent Category</label>
			</div>
		</div>

		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
			{/* Spending Pie Chart */}
				<CategoryPieChart data={spendingByCategory} title="Spending by Category" />

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
  