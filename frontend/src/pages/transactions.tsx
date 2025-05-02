// src/pages/transactions.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { getAllTransactions, type Transaction } from '../store/thunks/transactions.get.all'; // Adjust path if needed
import { Table, type TColumn } from "@/components/table"; // Import the Table component
import { cn } from "@/lib/utils/cn"; // Import the cn utility
import { DateTime } from "luxon"; // Import Luxon for date formatting
import { AlertTriangle, Loader2, TrendingDown, TrendingUp } from 'lucide-react'; // Import necessary icons
import { getAllCategories } from '@/store/thunks/category.get.all';
import { getMappings } from '@/store/thunks/mapping.get.all';

// Helper function for currency formatting (assuming amounts/balances are in cents)
// You might want to move this to a shared utility file
const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

// Type for transaction with potential category ID
type ProcessedTransaction = Transaction & {
    matchedCategoryId?: number | null; // Use a distinct name to avoid conflict with potential future 'category_id' from backend
};


// Component Definition
const TransactionsPage: React.FC = () => {
    const dispatch = useAppDispatch();

    // Select data from the Redux store
    const { transactions, transactionsLoading, transactionsError } = useAppSelector(
        (state) => state.TransactionsReducer
    );


    // Fetch transactions on mount if needed
    useEffect(() => {
        // Only fetch if the transactions array is empty and not currently loading.
        // Consider if you need more sophisticated refetching logic.
        if (transactions.length === 0 && !transactionsLoading) {
            dispatch(getAllTransactions());
        }
    }, [dispatch]); // Dependencies

	const {categories} = useAppSelector(state=>state.CategoryReducer)

	useEffect(()=>{
		void dispatch(getMappings()).then(()=>{
			void dispatch(getAllCategories())
		})
	}, [])

	

    // Define columns for the Transaction Table
    const columns: TColumn<ProcessedTransaction>[] = [
        {
            key: "transaction_date",
            label: "Date",
            sortable: true,
            render: (v) => DateTime.fromISO(v).isValid ? DateTime.fromISO(v).toFormat("DD T") : "Invalid Date", // Format: 25 14:30
            sortFunction: (a, b) => DateTime.fromISO(a).toMillis() - DateTime.fromISO(b).toMillis(),
            cellClassName: "text-xs text-gray-400 whitespace-nowrap", // Example styling
        },
        {
            key: "description",
            label: "Description",
            sortable: true,
            render: (v) => v,
            cellClassName: "max-w-xs truncate", // Prevent overly long descriptions
        },
        {
            key: "amount",
            label: "Amount",
            sortable: true,
            render: (v) => {
                const isPositive = v >= 0;
                // Optional: Add icons like in statements profit/loss
                return (
                    <span className={cn(
                        "flex items-center gap-1 font-mono",
                        isPositive ? "text-green-400" : "text-red-400"
                    )}>
                        {/* Optionally add icons based on amount sign */}
                        {/* {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} */}
                        {formatCurrency(v)}
                    </span>
                );
            },
            sortFunction: (a, b) => a - b, // Simple numeric sort
            cellClassName: "text-right",
            headerClassName: "text-right",
        },
        {
            key: "balance",
            label: "Balance",
            sortable: true,
            render: (v) => <span className="font-mono">{formatCurrency(v)}</span>,
            sortFunction: (a, b) => a - b,
            cellClassName: "text-right",
            headerClassName: "text-right",
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (v) => <span className="capitalize text-xs px-2 py-0.5 bg-gray-700 rounded">{v}</span>, // Example status badge
            cellClassName: "text-center",
            headerClassName: "text-center",
        },
		{
            key: "category_id", // Use the key from ProcessedTransaction
            label: "Category ID",
            sortable: false, // Sorting might be complex, disable for now
            render: (v) => {

				if (!v) return '';
                // Just print the category ID for now, or 'N/A' if null/undefined
                const category = categories.find((x)=>  Number(x.id) === Number(v));
				return (<div className='' style={{background: category?.colour}}>

					{category?.name}
				</div>) 

            },
            cellClassName: "text-center",
            headerClassName: "text-center",
        },
        // Add more columns if needed (e.g., Actions)
    ];

    // --- Render Logic ---

    // Display full-page loader if initially loading transactions OR mappings
    const initialLoading = (transactionsLoading && transactions.length === 0) &&  !transactionsError;
    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-full">
                <Loader2 className="w-12 h-12 animate-spin text-secondary-default" />
            </div>
        );
    }

    // Display error message prominently if an error occurred (show transaction or mapping error)
    const displayError = transactionsError;
    if (displayError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-full text-red-400 p-4">
                 <AlertTriangle size={48} className="mb-4" />
                 <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
                 <p className="text-center">{displayError}</p>
                 {/* Optionally add a retry button */}
                 {/* <button onClick={() => dispatch(getAllTransactions())} className="mt-4 ...">Retry</button> */}
            </div>
        );
    }

    // Main content with Table
    return (
        <div className="flex flex-col h-screen w-full">
            {/* Optional: Add a header or title area if needed */}
            {/* <div className="p-4 border-b border-secondary-default/20">
                <h1 className="text-xl font-semibold">Transactions</h1>
            </div> */}

            {/* Table container */}
            <div className="flex-grow overflow-hidden"> {/* Allows table to scroll */}
                <Table<ProcessedTransaction> // Use ProcessedTransaction type
                    columns={columns}
                    data={transactions} // Pass the processed data
                    header={{ sticky: true }}
                    loading={transactionsLoading} // Show table's internal loading indicator during refetches
                    // Optional: Add row clicking or other features if needed
                    // onRowClick={(row) => console.log("Clicked row:", row)}
                    // rowClassName="cursor-pointer hover:bg-white/5"
                    // Provide a message when data is empty
                    // emptyStateMessage={!transactionsLoading ? "No transactions found." : "Loading..."}
                />
            </div>
        </div>
    );
};

export default TransactionsPage;
