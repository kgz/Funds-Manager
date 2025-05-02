import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllCategories, type Category } from "@/store/thunks/category.get.all";
import { getMappings } from "@/store/thunks/mapping.get.all";
import { getAllTransactions } from "@/store/thunks/transactions.get.all";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { CategoryPieChart, type PieChartDataItem } from '@/graphs/pie'; // Import the new component and type
import { MonthlyBarGraph } from "@/graphs/bar";

// --- Helper Functions (Consider moving to a utils file) ---

// Helper function for currency formatting (assuming amounts are in cents)
const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};


export const Dashboard = () => {

	 const dispatch = useAppDispatch();
	
		// Select data from the Redux store
		const { transactions, transactionsLoading, transactionsError } = useAppSelector(
			(state) => state.TransactionsReducer
		);
	
		const { categories, categoriesLoading } = useAppSelector(state => state.CategoryReducer);
	
		useEffect(()=>{
			// Fetch only if needed
				void dispatch(getAllCategories());
				void dispatch(getMappings());
			
			
				void dispatch(getAllTransactions());
			
			// Mappings might be needed implicitly by category_mapping, ensure they are loaded somewhere appropriate
			// void dispatch(getMappings()); // Consider if this is the best place

		}, [dispatch]); // Dependencies
	
	// --- Data Processing for Charts ---
	const { spendingByCategory, incomeByCategory } = useMemo(() => {
		// Note: Color assignment logic is simplified here, assuming category.colour exists.
		// If fallback colors are needed, that logic should be handled here or passed to the chart.

		const spending: Record<string, PieChartDataItem> = {};
		const income: Record<string, PieChartDataItem> = {};

		transactions.forEach((tx) => {
			const categoryId = tx.category_id ?? 'unknown'; // Group null/undefined as 'unknown'
			const category = categories.find(cat => String(cat.id) === String(categoryId));
			const categoryName = category?.name ?? 'Unknown';
			const amount = tx.amount / 100; // Convert cents to dollars

			// Assign color consistently
			// Consider a more robust fallback mechanism if needed (like the previous FALLBACK_COLORS array)
			const color = category?.colour ?? (categoryId === 'unknown' ? '#6c757d' : '#8884d8'); // Grey for unknown, default purple otherwise

			if (amount < 0) {
				const absAmount = Math.abs(amount);
				if (!spending[String(categoryId)]) {
					spending[String(categoryId)] = { name: categoryName, value: 0, color: color, categoryId: categoryId === 'unknown' ? null : categoryId, percent: 0 }; // Initialize percent
				}
				spending[String(categoryId)].value += absAmount;
			} else if (amount > 0) {
				if (!income[String(categoryId)]) {
					income[String(categoryId)] = { name: categoryName, value: 0, color: color, categoryId: categoryId === 'unknown' ? null : categoryId, percent: 0 }; // Initialize percent
				}
				income[String(categoryId)].value += amount;
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

	}, [transactions, categories]);

	const monthlySummary = useMemo(() => {
		const summary: { [month: string]: { spending: number; receiving: number } } = {};

		transactions.forEach(tx => {
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
	}, [transactions]);

	// --- Loading and Error States ---
	const isLoading = transactionsLoading || categoriesLoading;
	const error = transactionsError; // Combine errors if needed

	if (isLoading && transactions.length === 0) {
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
        <h2 className="text-2xl font-semibold text-white mb-6">Spending & Income Overview</h2>

		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
			{/* Spending Pie Chart */}
				<CategoryPieChart data={spendingByCategory} title="Spending by Category" />

			{/* Income Pie Chart */}
				<CategoryPieChart data={incomeByCategory} title="Income by Category" />
			{/* Monthly Bar Graph - Spanning 2 columns on large screens */}
			<div className="lg:col-span-2">
				<MonthlyBarGraph data={monthlySummary} title="Monthly Profit / Loss"/>
			</div>
		</div>
      </div>
    );
  };
  
  