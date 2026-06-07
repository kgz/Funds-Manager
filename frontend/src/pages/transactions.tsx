import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
    fetchTransactionsPage,
    type Transaction,
} from '../store/thunks/transactions.get.all';
import { Table, sortRows, type SortState, type TColumn } from "@/components/table";
import { cn } from "@/lib/utils/cn";
import { DateTime } from "luxon";
import { AlertTriangle, Loader2, Search, X } from 'lucide-react';
import { createCategory } from '@/store/thunks/category.create.single';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getMappings } from '@/store/thunks/mapping.get.all';
import { useDebounce } from '@/hooks/useDebounce';
import { patchTransactionCategory } from '@/store/thunks/transaction.patch.category';
import { recategorizeUncategorizedTransactions } from '@/store/thunks/transaction.recategorize.uncategorized';

const PER_PAGE = 50;

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

const TransactionsPage = () => {
    const dispatch = useAppDispatch();

    const [showUncategorizedOnly, setShowUncategorizedOnly] = useState<boolean>(() => {
        return localStorage.getItem('showUncategorizedOnly') === 'true';
    });
    const [searchTerm, setSearchTerm] = useState<string>('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const [page, setPage] = useState(1);
    const [items, setItems] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortState, setSortState] = useState<SortState<Transaction>>({
        key: 'transaction_date',
        direction: 'desc',
    });

    const fetchGenerationRef = useRef(0);

    const reloadPage = useCallback(async (targetPage: number) => {
        const generation = fetchGenerationRef.current + 1;
        fetchGenerationRef.current = generation;
        setLoading(true);
        setError(null);

        try {
            const result = await fetchTransactionsPage({
                page: targetPage,
                perPage: PER_PAGE,
                search: debouncedSearchTerm,
                uncategorizedOnly: showUncategorizedOnly,
            });

            if (fetchGenerationRef.current !== generation) {
                return;
            }

            setItems(result.items);
            setTotal(result.total);
            setTotalPages(result.total_pages);
            setPage(result.page);
        } catch (err: unknown) {
            if (fetchGenerationRef.current !== generation) {
                return;
            }
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to fetch transactions');
            }
            setItems([]);
            setTotal(0);
            setTotalPages(0);
        } finally {
            if (fetchGenerationRef.current === generation) {
                setLoading(false);
            }
        }
    }, [debouncedSearchTerm, showUncategorizedOnly]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, showUncategorizedOnly]);

    useEffect(() => {
        void reloadPage(page);
    }, [page, reloadPage]);

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
                void reloadPage(page);
            } finally {
                setBusyCategoryTxId(null);
            }
        },
        [dispatch, page, reloadPage]
    );

    const handleRecategorizeUncategorized = useCallback(async () => {
        setBulkRecategorizeRunning(true);
        try {
            await dispatch(recategorizeUncategorizedTransactions()).unwrap();
            void reloadPage(page);
        } catch {
            void reloadPage(page);
        } finally {
            setBulkRecategorizeRunning(false);
        }
    }, [dispatch, page, reloadPage]);

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

    useEffect(() => {
        localStorage.setItem('showUncategorizedOnly', String(showUncategorizedOnly));
    }, [showUncategorizedOnly]);

    const columns: TColumn<Transaction>[] = useMemo(() => [
        {
            key: "transaction_date",
            label: "Date",
            sortable: true,
            render: (v) => DateTime.fromISO(v).isValid ? DateTime.fromISO(v).toFormat("DD T") : "Invalid Date",
            sortFunction: (a, b) => DateTime.fromISO(a).toMillis() - DateTime.fromISO(b).toMillis(),
            cellClassName: "text-xs text-gray-400 whitespace-nowrap",
        },
        {
            key: "description",
            label: "Description",
            sortable: true,
            render: (v) => v,
            sortFunction: (a, b) => a.localeCompare(b),
            cellClassName: "max-w-xs truncate",
        },
        {
            key: "amount",
            label: "Amount",
            sortable: true,
            render: (v) => {
                const isPositive = v >= 0;
                return (
                    <span className={cn(
                        "flex items-center gap-1 font-mono",
                        isPositive ? "text-green-400" : "text-red-400"
                    )}>
                        {formatCurrency(v)}
                    </span>
                );
            },
            sortFunction: (a, b) => a - b,
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
            render: (v) => <span className="capitalize text-xs px-2 py-0.5 bg-gray-700 rounded">{v}</span>,
            sortFunction: (a, b) => a.localeCompare(b),
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
    ], [activeCategories, busyCategoryTxId, categoryList, handleCategoryChange]);

    const sortedItems = useMemo(
        () => sortRows(items, columns, sortState),
        [items, columns, sortState]
    );

    const initialLoading = loading && items.length === 0 && error === null;
    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-full">
                <Loader2 className="w-12 h-12 animate-spin text-secondary-default" />
            </div>
        );
    }

    if (error && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-full text-red-400 p-4">
                <AlertTriangle size={48} className="mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
                <p className="text-center">{error}</p>
                <button
                    type="button"
                    onClick={() => void reloadPage(page)}
                    className="mt-4 text-sm px-3 py-1.5 rounded bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="p-4 border-b border-secondary-default/20 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-white">Transactions</h1>
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-secondary-default" aria-label="Loading" />
                    ) : null}
                    {!loading && total > 0 ? (
                        <span className="text-sm text-gray-400">{total.toLocaleString()} total</span>
                    ) : null}
                </div>
                <div className="relative flex-grow max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search descriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-8 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded focus:ring-secondary-default focus:border-secondary-default text-white placeholder-gray-400"
                    />
                    {searchTerm ? (
                        <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                            <X size={16} />
                        </button>
                    ) : null}
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

            {error ? (
                <div className="px-4 py-2 text-sm text-red-400 bg-red-950/40 border-b border-red-900/40">
                    {error}
                </div>
            ) : null}

            <div className="flex-grow overflow-hidden">
                <Table<Transaction>
                    columns={columns}
                    data={sortedItems}
                    header={{ sticky: true }}
                    loading={loading}
                    sortState={sortState}
                    onSortChange={(key, direction) => {
                        if (key === null) {
                            return;
                        }
                        setSortState({ key, direction });
                    }}
                    itemsPerPage={PER_PAGE}
                    serverPagination={{
                        page,
                        totalPages: Math.max(totalPages, 1),
                        totalItems: total,
                        canPrevious: page > 1,
                        canNext: page < totalPages,
                        onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                        onNext: () => setPage((p) => p + 1),
                    }}
                    emptyStateMessage={
                        loading
                            ? "Loading..."
                            : debouncedSearchTerm || showUncategorizedOnly
                                ? "No matching transactions found."
                                : "No transactions found."
                    }
                />
            </div>
        </div>
    );
};

export default TransactionsPage;
