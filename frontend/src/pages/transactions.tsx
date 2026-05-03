// src/pages/transactions.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
    getAllTransactions,
    type Transaction,
} from '../store/thunks/transactions.get.all'; // Adjust path if needed
import { Table, type TColumn } from "@/components/table"; // Import the Table component
import { cn } from "@/lib/utils/cn"; // Import the cn utility
import { DateTime } from "luxon"; // Import Luxon for date formatting
import { AlertTriangle, Loader2, Search, X } from 'lucide-react'; // Import necessary icons
import { createCategory } from '@/store/thunks/category.create.single';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getMappings } from '@/store/thunks/mapping.get.all';
import { useDebounce } from '@/hooks/useDebounce'; // Import the debounce hook
import { patchTransactionCategory } from '@/store/thunks/transaction.patch.category';
import { recategorizeUncategorizedTransactions } from '@/store/thunks/transaction.recategorize.uncategorized';

// Helper function for currency formatting (assuming amounts/balances are in cents)
// You might want to move this to a shared utility file
const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

function readThunkRejectMessage(err: unknown): string {
    if (typeof err === 'string') {
        return err;
    }
    if (!err || typeof err !== 'object') {
        return 'Failed to create category';
    }
    const payload = Reflect.get(err, 'payload');
    if (typeof payload === 'string') {
        return payload;
    }
    const message = Reflect.get(err, 'message');
    if (typeof message === 'string') {
        return message;
    }
    return 'Failed to create category';
}

// Type for transaction with potential category ID
type ProcessedTransaction = Transaction & {
    matchedCategoryId?: number | null; // Use a distinct name to avoid conflict with potential future 'category_id' from backend
};


// Component Definition
const TransactionsPage = () => {
    const dispatch = useAppDispatch();

    // State for the "uncategorized only" filter
    const [showUncategorizedOnly, setShowUncategorizedOnly] = useState<boolean>(() => {
        // Initialize state from localStorage or default to false
        return localStorage.getItem('showUncategorizedOnly') === 'true';
    });
    // State for the search term
    const [searchTerm, setSearchTerm] = useState<string>('');
    // Debounced search term for filtering
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay
    // Select data from the Redux store
    const { transactions, transactionsLoading, transactionsError } = useAppSelector(
        (state) => state.TransactionsReducer
    );

    const transactionList = useMemo<Transaction[]>(() => {
        return Array.isArray(transactions) ? transactions : [];
    }, [transactions]);

    const transactionsAutoFetchCommittedRef = useRef(false);

    // Fetch transactions on mount if needed
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
    }, [dispatch, transactionList.length, transactionsLoading, transactionsError]);
    
	const { categories, categoriesLoading, categoriesError } = useAppSelector(state => state.CategoryReducer);

    const categoryList = useMemo<Category[]>(() => {
        return Array.isArray(categories) ? categories : [];
    }, [categories]);

    const activeCategories = useMemo(
        () =>
            categoryList
                .filter((c) => !c.deleted_at)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name)),
        [categoryList]
    );

    const [busyCategoryTxId, setBusyCategoryTxId] = useState<number | null>(null);
    const [bulkRecategorizeRunning, setBulkRecategorizeRunning] = useState(false);
    const [inlineNewCategoryOpen, setInlineNewCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [createCategoryInlineError, setCreateCategoryInlineError] = useState<string | null>(null);

    const handleInlineCreateCategory = useCallback(async () => {
        const name = newCategoryName.trim();
        if (name.length === 0) {
            setCreateCategoryInlineError('Name is required');
            return;
        }
        setCreateCategoryInlineError(null);
        setCreatingCategory(true);
        try {
            await dispatch(createCategory({ name })).unwrap();
            setNewCategoryName('');
            setInlineNewCategoryOpen(false);
            void dispatch(getAllCategories());
        } catch (err: unknown) {
            setCreateCategoryInlineError(readThunkRejectMessage(err));
        } finally {
            setCreatingCategory(false);
        }
    }, [dispatch, newCategoryName]);

    const handleCategoryChange = useCallback(
        async (transactionId: number, selectValue: string) => {
            const categoryId =
                selectValue === '' ? null : Number.parseInt(selectValue, 10);
            if (categoryId !== null && !Number.isFinite(categoryId)) {
                return;
            }
            setBusyCategoryTxId(transactionId);
            try {
                await dispatch(
                    patchTransactionCategory({ transactionId, categoryId })
                ).unwrap();
            } catch {
                void dispatch(getAllTransactions({ force: true }));
            } finally {
                setBusyCategoryTxId(null);
            }
        },
        [dispatch]
    );

    const handleRecategorizeUncategorized = useCallback(async () => {
        setBulkRecategorizeRunning(true);
        try {
            await dispatch(recategorizeUncategorizedTransactions()).unwrap();
        } catch {
            void dispatch(getAllTransactions({ force: true }));
        } finally {
            setBulkRecategorizeRunning(false);
        }
    }, [dispatch]);

    const categoriesAutoFetchCommittedRef = useRef(false);
    
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
	}, [dispatch, categoryList.length, categoriesLoading, categoriesError]);
    
    // Effect to save filter state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('showUncategorizedOnly', String(showUncategorizedOnly));
    }, [showUncategorizedOnly]);
	

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
            key: "category_id",
            label: "Category",
            sortable: false,
            render: (v, row) => {
                const current =
                    v === null || v === undefined ? '' : String(v);
                const activeIds = new Set(
                    activeCategories.map((cat) => cat.id)
                );
                const missingActiveOption =
                    current !== '' && !activeIds.has(current);
                const namedCategory = categoryList.find(
                    (cat) => String(cat.id) === current
                );
                return (
                    <select
                        value={current}
                        disabled={busyCategoryTxId === row.id}
                        onChange={(e) => {
                            void handleCategoryChange(row.id, e.target.value);
                        }}
                        className="max-w-[14rem] text-xs bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white"
                    >
                        <option value="">Uncategorized</option>
                        {missingActiveOption ? (
                            <option value={current}>
                                {namedCategory
                                    ? `${namedCategory.name}${namedCategory.deleted_at ? ' (deleted)' : ''}`
                                    : `Category #${current}`}
                            </option>
                        ) : null}
                        {activeCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                );
            },
            cellClassName: "text-center",
            headerClassName: "text-center",
        },
        // Add more columns if needed (e.g., Actions)
    ];

    // Filter transactions based on the state
    const filteredTransactions = useMemo(() => {
        let results: Transaction[] = transactionList;

        // Apply "uncategorized only" filter first
        if (showUncategorizedOnly) {
            results = results.filter(
                (tx) => tx.category_id === null || tx.category_id === undefined
            );
        }

        // Apply search term filter
        const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase();
        if (lowerCaseSearchTerm) {
            results = results.filter(tx =>
                tx.description.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        return results.slice().sort((a, b) => {
            const ma = DateTime.fromISO(a.transaction_date);
            const mb = DateTime.fromISO(b.transaction_date);
            const aMs = ma.isValid ? ma.toMillis() : Number.NEGATIVE_INFINITY;
            const bMs = mb.isValid ? mb.toMillis() : Number.NEGATIVE_INFINITY;
            if (bMs !== aMs) {
                return bMs - aMs;
            }
            return b.id - a.id;
        });
    }, [transactionList, showUncategorizedOnly, debouncedSearchTerm]); // Add debouncedSearchTerm to dependencies

    // --- Render Logic ---

    // Display full-page loader if initially loading transactions OR mappings
    const initialLoading = (transactionsLoading && transactionList.length === 0) &&  !transactionsError;
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
            {/* Header with Filter */}
            <div className="p-4 border-b border-secondary-default/20 flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-xl font-semibold text-white">Transactions</h1>
                {/* Search Bar */}
                <div className="relative flex-grow max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search descriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-8 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded focus:ring-secondary-default focus:border-secondary-default text-white placeholder-gray-400"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        disabled={bulkRecategorizeRunning}
                        onClick={() => void handleRecategorizeUncategorized()}
                        className="text-sm px-3 py-1.5 rounded bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50"
                    >
                        {bulkRecategorizeRunning ? 'Recategorizing…' : 'Recategorize uncategorized'}
                    </button>
                    {!inlineNewCategoryOpen ? (
                        <button
                            type="button"
                            onClick={() => {
                                setInlineNewCategoryOpen(true);
                                setCreateCategoryInlineError(null);
                            }}
                            className="text-sm px-3 py-1.5 rounded bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
                        >
                            New category
                        </button>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleInlineCreateCategory();
                                    }
                                    if (e.key === 'Escape') {
                                        setInlineNewCategoryOpen(false);
                                        setNewCategoryName('');
                                        setCreateCategoryInlineError(null);
                                    }
                                }}
                                placeholder="Category name"
                                disabled={creatingCategory}
                                autoFocus
                                className="w-44 text-sm px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                            />
                            <button
                                type="button"
                                disabled={creatingCategory}
                                onClick={() => void handleInlineCreateCategory()}
                                className="text-sm px-3 py-1.5 rounded bg-secondary-default text-white disabled:opacity-50"
                            >
                                {creatingCategory ? 'Adding…' : 'Add'}
                            </button>
                            <button
                                type="button"
                                disabled={creatingCategory}
                                onClick={() => {
                                    setInlineNewCategoryOpen(false);
                                    setNewCategoryName('');
                                    setCreateCategoryInlineError(null);
                                }}
                                className="text-sm px-2 py-1.5 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            {createCategoryInlineError ? (
                                <span className="text-xs text-red-400 w-full sm:w-auto">
                                    {createCategoryInlineError}
                                </span>
                            ) : null}
                        </div>
                    )}
                    <input
                        type="checkbox"
                        id="uncategorizedFilter"
                        checked={showUncategorizedOnly}
                        onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-secondary-default bg-gray-800 border-gray-600 rounded focus:ring-secondary-default"
                    />
                    <label htmlFor="uncategorizedFilter" className="text-sm text-white/80 cursor-pointer">Show uncategorized only</label>
                </div>
            </div>

            {/* Table container */}
            <div className="flex-grow overflow-hidden"> {/* Allows table to scroll */}
                <Table<ProcessedTransaction> // Use ProcessedTransaction type
                    columns={columns}
                    data={filteredTransactions} // Pass the filtered data
                    header={{ sticky: true }}
                    loading={transactionsLoading} // Show table's internal loading indicator during refetches
                    // Optional: Add row clicking or other features if needed
                    // onRowClick={(row) => console.log("Clicked row:", row)}
                    // rowClassName="cursor-pointer hover:bg-white/5"
                    // Provide a message when data is empty
                    // emptyStateMessage={!transactionsLoading ? "No transactions found." : "Loading..."}
                    emptyStateMessage={!transactionsLoading ? (filteredTransactions.length === 0 ? "No matching transactions found." : "No transactions found.") : "Loading..."}                />
            </div>
        </div>
    );
};

export default TransactionsPage;
