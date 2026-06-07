// src/components/table.tsx

import { cn } from "@/lib/utils/cn";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const VIRTUALIZE_AT = 25;
const ROW_HEIGHT_PX = 52;

// TColumn definition remains the same
export type TColumn<TData> = {
	[Key in keyof TData]: {
		key: Key;
		label: string;
		width?: string;
		render?: (value: TData[Key], row: TData) => React.ReactNode;
		headerRender?: React.ReactNode;
		sortable?: boolean;
		sortFunction?: (a: TData[Key], b: TData[Key], rowA: TData, rowB: TData) => number;
		cellClassName?: string;
		headerClassName?: string;
	};
}[keyof TData];


// Define types for sorting state (still controlled by parent)
export type SortDirection = "asc" | "desc";
export type SortState<T> = {
	key: keyof T | null;
	direction: SortDirection;
};

export function sortRows<T extends BaseDataItem>(
	rows: T[],
	columns: TColumn<T>[],
	sortState: SortState<T> | undefined,
	rowKey: keyof T = 'id' as keyof T,
): T[] {
	if (sortState?.key === null || sortState?.key === undefined) {
		return rows;
	}
	const column = columns.find((col) => col.key === sortState.key);
	if (column === undefined) {
		return rows;
	}
	const sortKey = sortState.key;
	const direction = sortState.direction === 'asc' ? 1 : -1;
	const sorted = [...rows];
	sorted.sort((rowA, rowB) => {
		const valueA = rowA[sortKey];
		const valueB = rowB[sortKey];
		let cmp = 0;
		if (column.sortFunction) {
			cmp = column.sortFunction(valueA, valueB, rowA, rowB);
		} else if (typeof valueA === 'number' && typeof valueB === 'number') {
			cmp = valueA - valueB;
		} else {
			cmp = String(valueA ?? '').localeCompare(String(valueB ?? ''));
		}
		if (cmp !== 0) {
			return direction * cmp;
		}
		const idA = rowA[rowKey];
		const idB = rowB[rowKey];
		if (typeof idA === 'number' && typeof idB === 'number') {
			return idB - idA;
		}
		return String(idB ?? '').localeCompare(String(idA ?? ''));
	});
	return sorted;
}

// Define a base constraint for data items, assuming they have a unique key (default 'id')
type BaseDataItem = { id: string | number } | Record<string, any>;

export type ServerPagination = {
	page: number;
	totalPages: number;
	totalItems: number;
	onPrevious: () => void;
	onNext: () => void;
	canPrevious: boolean;
	canNext: boolean;
};

// Update TableProps for internal pagination handling
type TableProps<T extends BaseDataItem> = {
	columns: TColumn<T>[];
	data: T[]; // Expects the *full* dataset (pre-sorted if using parent-controlled sort)
	header?: {
		sticky?: boolean;
	};
	loading?: boolean;
	// --- Pagination Config ---
	itemsPerPage?: number; // How many items to show per page
	serverPagination?: ServerPagination;
	// --- Sorting Props (Parent Controlled) ---
	sortState?: SortState<T>;
	onSortChange?: (sortKey: keyof T | null, direction: SortDirection) => void;
	// --- Optional Props ---
	rowKey?: keyof T; // Key to use for React list keys (defaults to 'id')
	emptyStateMessage?: string;
	rowClassName?: string | ((row: T, index: number) => string);
	onRowClick?: (row: T) => void;
};

export const Table = <T extends BaseDataItem>(
	{
		columns,
		data, // Expects full, potentially pre-sorted data
		header,
		loading,
		itemsPerPage, // Use this directly
		serverPagination,
		sortState,
		onSortChange,
		rowKey = 'id', // Default to 'id' for row keys
		emptyStateMessage = "No data available.",
		rowClassName,
		onRowClick
	}: TableProps<T>) => {

	// --- Internal Pagination State ---
	const [currentPage, setCurrentPage] = useState(1);

	// --- Reset page if data changes significantly ---
	useEffect(() => {
		setCurrentPage(1);
	}, [data.length, itemsPerPage]); // Reset when total items or items per page changes

	// --- Pagination Calculations ---
	const totalItems = serverPagination?.totalItems ?? data.length;
	const paginationEnabled =
		serverPagination !== undefined ||
		(typeof itemsPerPage === 'number' && itemsPerPage > 0 && data.length > itemsPerPage);
	const totalPages = serverPagination?.totalPages
		?? (paginationEnabled && typeof itemsPerPage === 'number' && itemsPerPage > 0
			? Math.ceil(data.length / itemsPerPage)
			: 1);
	const validCurrentPage = serverPagination?.page
		?? Math.max(1, Math.min(currentPage, totalPages));

	// --- Data Slicing for Current Page ---
	const paginatedData = useMemo(() => {
		if (serverPagination !== undefined) {
			return data;
		}
		if (!paginationEnabled || typeof itemsPerPage !== 'number' || itemsPerPage <= 0) {
			return data;
		}
		const startIndex = (validCurrentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return data.slice(startIndex, endIndex);
	}, [data, validCurrentPage, itemsPerPage, paginationEnabled, serverPagination]);

	// --- Pagination Handlers ---
	const canGoPrevious = serverPagination?.canPrevious ?? validCurrentPage > 1;
	const canGoNext = serverPagination?.canNext ?? validCurrentPage < totalPages;

	const handlePreviousPage = () => {
		if (serverPagination) {
			serverPagination.onPrevious();
			return;
		}
		if (canGoPrevious) {
			setCurrentPage(prev => prev - 1);
		}
	};

	const handleNextPage = () => {
		if (serverPagination) {
			serverPagination.onNext();
			return;
		}
		if (canGoNext) {
			setCurrentPage(prev => prev + 1);
		}
	};

	// --- Sorting Handler (remains parent-controlled) ---
	const handleSort = (columnKey: keyof T) => {
		if (!onSortChange) return;
		let newDirection: SortDirection = 'asc';
		if (sortState?.key === columnKey) {
			newDirection = sortState.direction === 'asc' ? 'desc' : 'asc';
		}
		onSortChange(columnKey, newDirection);
	};

	// --- Row Class Name Helper ---
	const getRowClassName = (row: T, index: number): string | undefined => {
		let classes = "";
		if (typeof rowClassName === 'function') {
			classes = rowClassName(row, index);
		} else if (typeof rowClassName === 'string') {
			classes = rowClassName;
		}
		if (onRowClick) {
			classes = cn(classes, "cursor-pointer");
		}
		return classes || undefined;
	}

	// --- Get Unique Key for Row ---
	const getRowKey = (row: T, index: number): string | number => {
		const key = row[rowKey];
		// Fallback to index if the specified key doesn't exist or is null/undefined
		return key != null ? String(key) : index;
	}

	const scrollRef = useRef<HTMLDivElement>(null);
	const useVirtualRows = !loading && paginatedData.length >= VIRTUALIZE_AT;
	const virtualizer = useVirtualizer({
		count: useVirtualRows ? paginatedData.length : 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT_PX,
		overscan: 10,
	});
	const virtualItems = useVirtualRows ? virtualizer.getVirtualItems() : [];
	const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
	const paddingBottom =
		virtualItems.length > 0
			? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
			: 0;

	const renderDataRow = (row: T, rowIndex: number) => (
		<tr
			key={getRowKey(row, rowIndex)}
			className={cn(
				"hover:bg-white/5 transition-colors duration-150",
				getRowClassName(row, rowIndex)
			)}
			onClick={() => onRowClick?.(row)}
		>
			{columns.map((column) => (
				<td
					key={`${getRowKey(row, rowIndex)}-${String(column.key)}`}
					className={cn(
						"px-4 py-3 whitespace-nowrap text-sm text-gray-300",
						column.cellClassName
					)}
				>
					{column.render
						? column.render(row[column.key], row)
						: <>{String(row[column.key] ?? '')}</>
					}
				</td>
			))}
		</tr>
	);

	return (
		// Use primary background (or a slightly lighter gray if primary is too dark)
		<div className="flex flex-col h-full bg-primary-default text-gray-200"> {/* Adjusted text color */}
			<div ref={scrollRef} className="flex-grow overflow-auto">
				<table className="w-full min-w-[600px]">
					<colgroup>
						{columns.map((column, index) => (
							<col key={`col-${index}`} style={{ width: column.width ?? "auto" }} />
						))}
					</colgroup>
					{/* Use a slightly lighter background for header for contrast */}
					<thead className="bg-gray-900"><tr>
							{columns.map((column, index) => (
								<th
									key={`header-${index}`}
									className={cn(
										"px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider", // Header text slightly dimmer
										header?.sticky && "sticky top-0 z-10 bg-gray-900", // Match header background
										// Use secondary color for hover/focus indication on sortable headers
										column.sortable && onSortChange && "cursor-pointer hover:bg-gray-800 hover:text-secondary-default",
										column.headerClassName
									)}
									onClick={() => column.sortable && handleSort(column.key)}
								>
									<div className="flex items-center gap-1">
										{column.headerRender ?? column.label}
										{/* Use secondary color for sort indicator */}
										{column.sortable && onSortChange && sortState?.key === column.key && (
											sortState.direction === "asc" ? <span className="text-xs text-secondary-default">▲</span> : <span className="text-xs text-secondary-default">▼</span>
										)}
									</div>
								</th>
							))}
						</tr>
					</thead>
					{/* Use primary background for body, slightly lighter border */}
					<tbody className="bg-primary-default divide-y divide-white/10">{/* Adjusted border */}
						{loading && Array.from({ length: itemsPerPage ?? 10 }).map((_, rowIndex) => (
							<tr key={`loading-${rowIndex}`} className="animate-pulse">
								{columns.map((_, colIndex) => (
									<td key={`loading-${rowIndex}-${colIndex}`} className="px-4 py-3 whitespace-nowrap">
										<div className="h-4 bg-gray-700 rounded w-3/4"></div>
									</td>
								))}
							</tr>
						))}
						{/* Empty state */}
						{!loading && paginatedData.length === 0 && (
							<tr>
								<td colSpan={columns.length} className="text-center py-10 px-4 text-gray-500"> {/* Dimmer empty state text */}
									{data.length === 0 ? emptyStateMessage : "No data for this page."}
								</td>
							</tr>
						)}
						{!loading && useVirtualRows && paddingTop > 0 ? (
							<tr aria-hidden="true" className="border-0">
								<td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
							</tr>
						) : null}
						{!loading && useVirtualRows
							? virtualItems.map((virtualRow) => {
								const row = paginatedData[virtualRow.index];
								if (!row) {
									return null;
								}
								return renderDataRow(row, virtualRow.index);
							})
							: !loading
								? paginatedData.map((row, rowIndex) => renderDataRow(row, rowIndex))
								: null}
						{!loading && useVirtualRows && paddingBottom > 0 ? (
							<tr aria-hidden="true" className="border-0">
								<td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			{/* --- Pagination Controls --- */}
			{paginationEnabled && (loading || totalPages > 1 || (serverPagination && totalItems > 0)) && (
				// Use slightly lighter background for footer, matching header
				<div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-gray-900 mt-auto"> {/* Adjusted border and background */}
					<div className="text-sm text-gray-400"> {/* Dimmer text */}
						Page <span className="font-medium text-gray-200">{validCurrentPage}</span> of <span className="font-medium text-gray-200">{totalPages}</span>
						<span className="hidden sm:inline"> ({totalItems} items)</span>
					</div>
					<div className="flex items-center gap-2">
						{/* Style buttons using gray/secondary */}
						<button
							onClick={handlePreviousPage}
							disabled={loading || !canGoPrevious}
							aria-label="Go to previous page"
							className={cn(
								"inline-flex items-center px-3 py-1 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800",
								"hover:bg-gray-700 hover:border-secondary-default hover:text-white", // Hover uses secondary border
								"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600" // Disabled state
							)}
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							Previous
						</button>
						<button
							onClick={handleNextPage}
							disabled={loading || !canGoNext}
							aria-label="Go to next page"
							className={cn(
								"inline-flex items-center px-3 py-1 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800",
								"hover:bg-gray-700 hover:border-secondary-default hover:text-white", // Hover uses secondary border
								"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600" // Disabled state
							)}
						>
							Next
							<ChevronRight className="h-4 w-4 ml-1" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
