import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
    bulkPatchTransactionCategories,
    fetchTransactionsPage,
    type Transaction,
} from '../types/transaction';
import { Table, sortRows, type SortState, type TColumn } from "@/components/table";
import { cn } from "@/lib/utils/cn";
import { DateTime } from "luxon";
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActionableBadge } from '@/components/layout/ActionableBadge';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SearchInput } from '@/components/layout/SearchInput';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import {
	buttonAccentClass,
	buttonOutlineClass,
	inputDarkClass,
} from '@/components/layout/tokens';
import { Loader2 } from 'lucide-react';
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
import { AccountFilter } from '@/components/account-filter';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import { notifyTransferSuggestionsChanged } from '@/hooks/useActionableItemCount';
import { accountDisplayLabel } from '@/types/account';
import {
	confirmTransferPair,
	dismissTransferPair,
	fetchTransferSuggestions,
	type TransferSuggestion,
} from '@/types/transfer';

const PER_PAGE = 50;

const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount / 100).toFixed(2);
    return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

function ColoredAmount({ amount }: { amount: number }) {
    const isPositive = amount >= 0;
    return (
        <span
            className={cn(
                'font-mono tabular-nums',
                isPositive ? 'text-green-400' : 'text-red-400'
            )}
        >
            {formatCurrency(amount)}
        </span>
    );
}

function formatTransferDate(value: string): string {
    const parsed = DateTime.fromISO(value);
    return parsed.isValid ? parsed.toFormat('dd LLL yyyy') : value;
}

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
    const { accountIdNumber } = useAccountFilter();

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
    const [transferSuggestions, setTransferSuggestions] = useState<TransferSuggestion[]>([]);
    const [transferBusy, setTransferBusy] = useState(false);
    const [hideTransfers, setHideTransfers] = useState<boolean>(() => {
        return localStorage.getItem('hideTransferTransactions') === 'true';
    });
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
                accountId: accountIdNumber,
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
    }, [accountIdNumber, debouncedSearchTerm, showUncategorizedOnly]);

    useEffect(() => {
        setPage(1);
    }, [accountIdNumber, debouncedSearchTerm, showUncategorizedOnly]);

    useEffect(() => {
        void reloadPage(page);
    }, [page, reloadPage, accountIdNumber]);

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
            if (current !== null) {
                return null;
            }
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

    useEffect(() => {
        localStorage.setItem('hideTransferTransactions', String(hideTransfers));
    }, [hideTransfers]);

    useEffect(() => {
        void fetchTransferSuggestions(accountIdNumber ?? undefined)
            .then(setTransferSuggestions)
            .catch(() => setTransferSuggestions([]));
    }, [accountIdNumber]);

    const reloadTransferSuggestions = useCallback(() => {
        void fetchTransferSuggestions(accountIdNumber ?? undefined)
            .then(setTransferSuggestions)
            .catch(() => setTransferSuggestions([]));
        notifyTransferSuggestionsChanged();
    }, [accountIdNumber]);

    const selectedTransferPair = useMemo(() => {
        const selectedRows = items.filter((row) => selectedIds.has(row.id));
        if (selectedRows.length !== 2) {
            return null;
        }
        const outRow = selectedRows.find((row) => row.amount < 0);
        const inRow = selectedRows.find((row) => row.amount > 0);
        if (!outRow || !inRow || outRow.amount !== -inRow.amount) {
            return null;
        }
        const outAccountId = outRow.financial_account?.id;
        const inAccountId = inRow.financial_account?.id;
        if (
            outAccountId !== undefined &&
            inAccountId !== undefined &&
            outAccountId === inAccountId
        ) {
            return null;
        }
        return { outId: outRow.id, inId: inRow.id };
    }, [items, selectedIds]);

    const handleMarkSelectedAsTransfer = useCallback(async () => {
        if (!selectedTransferPair) {
            return;
        }
        setTransferBusy(true);
        try {
            await confirmTransferPair(
                selectedTransferPair.outId,
                selectedTransferPair.inId
            );
            setSelectedIds(new Set());
            reloadTransferSuggestions();
            await reloadPage(page);
        } finally {
            setTransferBusy(false);
        }
    }, [page, reloadPage, reloadTransferSuggestions, selectedTransferPair]);

    const handleConfirmSuggestion = useCallback(
        async (suggestion: TransferSuggestion) => {
            setTransferBusy(true);
            try {
                await confirmTransferPair(
                    suggestion.outTransaction.id,
                    suggestion.inTransaction.id
                );
                reloadTransferSuggestions();
                await reloadPage(page);
            } finally {
                setTransferBusy(false);
            }
        },
        [page, reloadPage, reloadTransferSuggestions]
    );

    const handleDismissSuggestion = useCallback(
        async (suggestion: TransferSuggestion) => {
            setTransferBusy(true);
            try {
                await dismissTransferPair(
                    suggestion.outTransaction.id,
                    suggestion.inTransaction.id
                );
                reloadTransferSuggestions();
            } finally {
                setTransferBusy(false);
            }
        },
        [reloadTransferSuggestions]
    );

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
            key: "financial_account",
            label: "Account",
            sortable: true,
            render: (_v, row) =>
                row.financial_account
                    ? accountDisplayLabel(row.financial_account)
                    : '—',
            sortFunction: (_a, _b, rowA, rowB) => {
                const labelA = rowA.financial_account
                    ? accountDisplayLabel(rowA.financial_account)
                    : '';
                const labelB = rowB.financial_account
                    ? accountDisplayLabel(rowB.financial_account)
                    : '';
                return labelA.localeCompare(labelB);
            },
            cellClassName: "text-xs text-white/70 whitespace-nowrap",
        },
        {
            key: "description",
            label: "Description",
            sortable: true,
            render: (v, row) => (
                <span className="inline-flex items-center gap-2">
                    <span className="truncate">{v}</span>
                    {row.transfer_pair_status === 'confirmed' ? (
                        <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                            Transfer
                        </span>
                    ) : null}
                </span>
            ),
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

    const sortedItems = useMemo(() => {
        const visible = hideTransfers
            ? items.filter((row) => row.transfer_pair_status !== 'confirmed')
            : items;
        return sortRows(visible, columns, sortState);
    }, [hideTransfers, items, columns, sortState]);

    const initialLoading = loading && items.length === 0 && error === null;
    if (initialLoading) {
        return <PageLoadingState label="Loading transactions…" />;
    }

    if (error && items.length === 0) {
        return (
            <ErrorState
                title="Error loading transactions"
                message={error}
                onRetry={() => void reloadPage(page)}
            />
        );
    }

    return (
        <PageShell variant="table">
            <div className="space-y-3 border-b border-white/10 p-4">
                <PageHeader
                    title="Transactions"
                    className="mb-0"
                    meta={
                        <>
                            {loading ? (
                                <Loader2
                                    className="h-4 w-4 animate-spin text-secondary-default"
                                    aria-label="Loading"
                                />
                            ) : null}
                            {!loading && total > 0 ? (
                                <span className="text-sm text-white/50">
                                    {total.toLocaleString()} total
                                </span>
                            ) : null}
                        </>
                    }
                />
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                        <AccountFilter />
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search descriptions…"
                            className="w-full min-w-[12rem] sm:w-64"
                        />
                        <SegmentedControl
                            ariaLabel="Transaction filter"
                            value={showUncategorizedOnly ? 'uncategorized' : 'all'}
                            onChange={(next) =>
                                setShowUncategorizedOnly(next === 'uncategorized')
                            }
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'uncategorized', label: 'Uncategorized' },
                            ]}
                        />
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
                            <input
                                type="checkbox"
                                checked={hideTransfers}
                                onChange={(event) => setHideTransfers(event.target.checked)}
                                className="form-checkbox h-4 w-4 rounded border-gray-600 bg-gray-800 text-secondary-default"
                            />
                            Hide transfers
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                        <button
                            type="button"
                            disabled={bulkRecategorizeRunning}
                            onClick={() => void handleRecategorizeUncategorized()}
                            className={buttonOutlineClass}
                        >
                            {bulkRecategorizeRunning
                                ? 'Recategorizing…'
                                : 'Recategorize uncategorized'}
                        </button>
                        {!inlineNewCategoryOpen ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setInlineNewCategoryOpen(true);
                                    setCreateCategoryInlineError(null);
                                }}
                                className={buttonOutlineClass}
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
                                    className={cn(inputDarkClass, 'w-44 px-2 py-1.5')}
                                />
                                <button
                                    type="button"
                                    disabled={creatingCategory}
                                    onClick={() => void handleInlineCreateCategory()}
                                    className={buttonAccentClass}
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
                                    className="cursor-pointer px-2 py-1.5 text-sm text-white/50 hover:text-white"
                                >
                                    Cancel
                                </button>
                                {createCategoryInlineError ? (
                                    <span className="w-full text-xs text-red-400 sm:w-auto">
                                        {createCategoryInlineError}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {transferSuggestions.length > 0 ? (
                <div className="space-y-3 border-b border-white/10 bg-sky-950/30 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-sky-200">
                        <ActionableBadge />
                        <span>
                            {transferSuggestions.length} possible inter-account transfer
                            {transferSuggestions.length === 1 ? '' : 's'} detected
                        </span>
                    </p>
                    <div className="overflow-x-auto rounded border border-white/10 bg-black/20">
                        <table className="w-full min-w-[40rem] text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
                                    <th className="px-3 py-2 font-medium">Leg</th>
                                    <th className="px-3 py-2 font-medium">Account</th>
                                    <th className="px-3 py-2 font-medium">Date</th>
                                    <th className="px-3 py-2 font-medium">Description</th>
                                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transferSuggestions.slice(0, 5).map((suggestion) => (
                                    <Fragment
                                        key={`${suggestion.outTransaction.id}-${suggestion.inTransaction.id}`}
                                    >
                                        <tr
                                            key={`${suggestion.outTransaction.id}-out`}
                                            className="border-t border-white/10"
                                        >
                                            <td className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-white/50">
                                                Out
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-white/90">
                                                {suggestion.outTransaction.accountLabel}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-white/60">
                                                {formatTransferDate(suggestion.outTransaction.transactionDate)}
                                            </td>
                                            <td className="max-w-xs truncate px-3 py-2 text-white/80">
                                                {suggestion.outTransaction.description}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <ColoredAmount amount={suggestion.outTransaction.amount} />
                                            </td>
                                            <td
                                                rowSpan={2}
                                                className="border-l border-white/10 px-3 py-2 align-middle text-right"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={transferBusy}
                                                        onClick={() => void handleConfirmSuggestion(suggestion)}
                                                        className={buttonAccentClass}
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={transferBusy}
                                                        onClick={() => void handleDismissSuggestion(suggestion)}
                                                        className={buttonOutlineClass}
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr key={`${suggestion.inTransaction.id}-in`}>
                                            <td className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-white/50">
                                                In
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-white/90">
                                                {suggestion.inTransaction.accountLabel}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-white/60">
                                                {formatTransferDate(suggestion.inTransaction.transactionDate)}
                                            </td>
                                            <td className="max-w-xs truncate px-3 py-2 text-white/80">
                                                {suggestion.inTransaction.description}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <ColoredAmount amount={suggestion.inTransaction.amount} />
                                            </td>
                                        </tr>
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {selectedIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
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
                        className={buttonOutlineClass}
                    >
                        {bulkCategoryId === '' ? 'Clear category' : 'Apply category'}
                    </button>
                    <button
                        type="button"
                        disabled={bulkBusy || selectedWithSuggestions.length === 0}
                        onClick={() => void handleBulkAcceptSuggestions()}
                        className={buttonAccentClass}
                    >
                        Accept suggestions ({selectedWithSuggestions.length})
                    </button>
                    <button
                        type="button"
                        disabled={transferBusy || selectedTransferPair === null}
                        onClick={() => void handleMarkSelectedAsTransfer()}
                        className={buttonOutlineClass}
                    >
                        Mark as transfer
                    </button>
                    {selectedOnPage.length === 1 &&
                    selectedOnPage[0].category_id !== null &&
                    selectedOnPage[0].category_id !== undefined ? (
                        <button
                            type="button"
                            disabled={bulkBusy}
                            onClick={() => void handleApplyToMatchingDescriptions()}
                            className={buttonOutlineClass}
                        >
                            Apply to matching on page
                        </button>
                    ) : null}
                    <button
                        type="button"
                        disabled={bulkBusy}
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-auto cursor-pointer px-2 py-1.5 text-sm text-white/50 hover:text-white"
                    >
                        Clear
                    </button>
                </div>
            ) : null}

            {error ? (
                <div className="px-4 py-2">
                    <InlineAlert variant="error">{error}</InlineAlert>
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
        </PageShell>
    );
};

export default TransactionsPage;
