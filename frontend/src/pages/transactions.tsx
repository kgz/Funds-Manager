import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
    bulkPatchTransactionCategories,
    fetchTransactionsPage,
    type Transaction,
} from '../types/transaction';
import { Table, sortRows, type SortState, type TColumn } from "@/components/table";
import { cn } from "@/lib/utils/cn";
import { DateTime } from "luxon";
import { AlertTriangle, Loader2, Search, X } from 'lucide-react';
import { createCategory } from '@/store/thunks/category.create.single';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { useDebounce } from '@/hooks/useDebounce';
import { patchTransactionCategory } from '@/store/thunks/transaction.patch.category';
import { recategorizeUncategorizedTransactions } from '@/store/thunks/transaction.recategorize.uncategorized';
import {
    TransactionCategoryCell,
    type CategorySuggestion,
} from '@/components/transactions/TransactionCategoryCell';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';

const PER_PAGE = 50;

const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

function descriptionKey(description: string): string {
    return description.trim().toLowerCase();
}

function clearSuggestionFields(item: Transaction): Transaction {
    return {
        ...item,
        suggested_category_id: undefined,
        suggested_category_name: undefined,
    };
}

const TransactionsPage = () => {
    const dispatch = useAppDispatch();

    const [showUncategorizedOnly, setShowUncategorizedOnly] = useState<boolean>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('uncategorized') === '1') {
            return true;
        }
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

    const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
    const [bulkCategoryId, setBulkCategoryId] = useState('');
    const [bulkBusy, setBulkBusy] = useState(false);
    const fetchGenerationRef = useRef(0);

    const updateItems = useCallback((updater: (rows: Transaction[]) => Transaction[]) => {
        setItems((current) => updater(current));
    }, []);

    const applyCategoryLocally = useCallback(
        (transactionIds: number[], categoryId: number | null) => {
            const idSet = new Set(transactionIds);
            updateItems((rows) =>
                rows.map((row) => {
                    if (!idSet.has(row.id)) {
                        return row;
                    }
                    return clearSuggestionFields({
                        ...row,
                        category_id: categoryId,
                    });
                })
            );
        },
        [updateItems]
    );

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
                includeSuggestions: true,
            });

            if (fetchGenerationRef.current !== generation) {
                return;
            }

            setItems(result.items);
            setTotal(result.total);
            setTotalPages(result.total_pages);
            setPage(result.page);
            setSelectedIds(new Set());
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

    const categoryNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const category of categoryList) {
            map.set(Number(category.id), category.name);
        }
        return map;
    }, [categoryList]);

    const peerCategoryByDescription = useMemo(() => {
        const map = new Map<string, { id: number; name: string }>();
        for (const item of items) {
            if (item.category_id === null || item.category_id === undefined) {
                continue;
            }
            const name = categoryNameById.get(item.category_id);
            if (!name) {
                continue;
            }
            map.set(descriptionKey(item.description), {
                id: item.category_id,
                name,
            });
        }
        return map;
    }, [items, categoryNameById]);

    const resolveSuggestion = useCallback(
        (row: Transaction): CategorySuggestion | null => {
            const current = row.category_id ?? null;
            if (
                row.suggested_category_id !== null &&
                row.suggested_category_id !== undefined &&
                row.suggested_category_name &&
                current !== row.suggested_category_id
            ) {
                return {
                    categoryId: row.suggested_category_id,
                    categoryName: row.suggested_category_name,
                    hint: 'From your mapping rules or past categorization',
                };
            }
            const peer = peerCategoryByDescription.get(descriptionKey(row.description));
            if (peer && current !== peer.id) {
                return {
                    categoryId: peer.id,
                    categoryName: peer.name,
                    hint: 'Same description elsewhere on this page',
                };
            }
            return null;
        },
        [peerCategoryByDescription]
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
            setCreateCategoryInlineError(readThunkRejectMessage(err, 'Failed to create category'));
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
                applyCategoryLocally([transactionId], categoryId);
            } catch {
                void reloadPage(page);
            } finally {
                setBusyCategoryTxId(null);
            }
        },
        [applyCategoryLocally, dispatch, page, reloadPage]
    );

    const handlePickSuggestion = useCallback(
        async (transactionId: number, categoryId: number) => {
            setBusyCategoryTxId(transactionId);
            try {
                await dispatch(
                    patchTransactionCategory({ transactionId, categoryId })
                ).unwrap();
                applyCategoryLocally([transactionId], categoryId);
            } catch {
                void reloadPage(page);
            } finally {
                setBusyCategoryTxId(null);
            }
        },
        [applyCategoryLocally, dispatch, page, reloadPage]
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

    const toggleSelected = useCallback((transactionId: number, checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(transactionId);
            } else {
                next.delete(transactionId);
            }
            return next;
        });
    }, []);

    const toggleSelectAllOnPage = useCallback((checked: boolean) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(items.map((item) => item.id)));
    }, [items]);

    const selectedOnPage = useMemo(
        () => items.filter((item) => selectedIds.has(item.id)),
        [items, selectedIds]
    );

    const selectedWithSuggestions = useMemo(
        () => selectedOnPage.filter((item) => resolveSuggestion(item) !== null),
        [selectedOnPage, resolveSuggestion]
    );

    const handleBulkApplyCategory = useCallback(async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) {
            return;
        }
        const categoryId =
            bulkCategoryId === '' ? null : Number.parseInt(bulkCategoryId, 10);
        if (categoryId !== null && !Number.isFinite(categoryId)) {
            return;
        }
        setBulkBusy(true);
        try {
            await bulkPatchTransactionCategories(ids, categoryId);
            applyCategoryLocally(ids, categoryId);
            setSelectedIds(new Set());
            setBulkCategoryId('');
        } catch {
            void reloadPage(page);
        } finally {
            setBulkBusy(false);
        }
    }, [applyCategoryLocally, bulkCategoryId, page, reloadPage, selectedIds]);

    const handleBulkAcceptSuggestions = useCallback(async () => {
        if (selectedWithSuggestions.length === 0) {
            return;
        }
        const groups = new Map<number, number[]>();
        for (const row of selectedWithSuggestions) {
            const suggestion = resolveSuggestion(row);
            if (!suggestion) {
                continue;
            }
            const list = groups.get(suggestion.categoryId) ?? [];
            list.push(row.id);
            groups.set(suggestion.categoryId, list);
        }
        setBulkBusy(true);
        try {
            for (const [categoryId, ids] of groups) {
                await bulkPatchTransactionCategories(ids, categoryId);
                applyCategoryLocally(ids, categoryId);
            }
            setSelectedIds(new Set());
        } catch {
            void reloadPage(page);
        } finally {
            setBulkBusy(false);
        }
    }, [
        applyCategoryLocally,
        page,
        reloadPage,
        resolveSuggestion,
        selectedWithSuggestions,
    ]);

    const handleApplyToMatchingDescriptions = useCallback(async () => {
        if (selectedOnPage.length !== 1) {
            return;
        }
        const source = selectedOnPage[0];
        if (source.category_id === null || source.category_id === undefined) {
            return;
        }
        const key = descriptionKey(source.description);
        const matchingIds = items
            .filter((item) => descriptionKey(item.description) === key)
            .map((item) => item.id);
        if (matchingIds.length === 0) {
            return;
        }
        setBulkBusy(true);
        try {
            await bulkPatchTransactionCategories(matchingIds, source.category_id);
            applyCategoryLocally(matchingIds, source.category_id);
            setSelectedIds(new Set());
        } catch {
            void reloadPage(page);
        } finally {
            setBulkBusy(false);
        }
    }, [applyCategoryLocally, items, page, reloadPage, selectedOnPage]);

    const categoriesAutoFetchCommittedRef = useRef(false);

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

    const allOnPageSelected =
        items.length > 0 && items.every((item) => selectedIds.has(item.id));

    const columns: TColumn<Transaction>[] = useMemo(() => [
        {
            key: "id",
            label: "",
            sortable: false,
            headerRender: (
                <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    disabled={items.length === 0 || bulkBusy}
                    onChange={(event) => {
                        event.stopPropagation();
                        toggleSelectAllOnPage(event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="form-checkbox h-4 w-4 text-secondary-default bg-gray-800 border-gray-600 rounded focus:ring-secondary-default cursor-pointer"
                    aria-label="Select all on page"
                />
            ),
            render: (_, row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={(event) => {
                        event.stopPropagation();
                        toggleSelected(row.id, event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="form-checkbox h-4 w-4 text-secondary-default bg-gray-800 border-gray-600 rounded focus:ring-secondary-default"
                    aria-label={`Select transaction ${row.id}`}
                />
            ),
            cellClassName: "w-10 text-center",
            headerClassName: "w-10 text-center",
        },
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
            render: (_, row) => (
                <TransactionCategoryCell
                    row={row}
                    categories={categoryList}
                    busy={busyCategoryTxId === row.id || bulkBusy}
                    suggestion={resolveSuggestion(row)}
                    onCategoryChange={handleCategoryChange}
                    onPickSuggestion={handlePickSuggestion}
                />
            ),
            cellClassName: "text-center",
            headerClassName: "text-center",
        },
    ], [
        bulkBusy,
        busyCategoryTxId,
        categoryList,
        handleCategoryChange,
        handlePickSuggestion,
        resolveSuggestion,
        allOnPageSelected,
        bulkBusy,
        items.length,
        selectedIds,
        toggleSelectAllOnPage,
        toggleSelected,
    ]);

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

            {selectedIds.size > 0 ? (
                <div className="px-4 py-3 border-b border-secondary-default/20 bg-gray-900/80 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-white/80">
                        {selectedIds.size} selected
                    </span>
                    <CategoryPicker
                        value={bulkCategoryId}
                        categories={categoryList}
                        disabled={bulkBusy}
                        onChange={setBulkCategoryId}
                        placeholder="Choose category…"
                        className="max-w-[12rem]"
                    />
                    <button
                        type="button"
                        disabled={bulkBusy}
                        onClick={() => void handleBulkApplyCategory()}
                        className="text-sm px-3 py-1.5 rounded bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50"
                    >
                        {bulkCategoryId === '' ? 'Clear category' : 'Apply category'}
                    </button>
                    <button
                        type="button"
                        disabled={bulkBusy || selectedWithSuggestions.length === 0}
                        onClick={() => void handleBulkAcceptSuggestions()}
                        className="text-sm px-3 py-1.5 rounded bg-secondary-default/20 text-secondary-default border border-secondary-default/40 hover:bg-secondary-default/30 disabled:opacity-50"
                    >
                        Accept suggestions ({selectedWithSuggestions.length})
                    </button>
                    {selectedOnPage.length === 1 &&
                    selectedOnPage[0].category_id !== null &&
                    selectedOnPage[0].category_id !== undefined ? (
                        <button
                            type="button"
                            disabled={bulkBusy}
                            onClick={() => void handleApplyToMatchingDescriptions()}
                            className="text-sm px-3 py-1.5 rounded bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50"
                        >
                            Apply to matching on page
                        </button>
                    ) : null}
                    <button
                        type="button"
                        disabled={bulkBusy}
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm px-2 py-1.5 text-gray-400 hover:text-white ml-auto"
                    >
                        Clear
                    </button>
                </div>
            ) : null}

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
