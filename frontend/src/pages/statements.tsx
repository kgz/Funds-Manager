import { Table, sortRows, type SortState, type TColumn } from "@/components/table";
import {
	fetchMissingStatementPeriods,
	fetchStatementsPage,
	previewStatementUpload,
	uploadStatementFiles,
	type Statement,
	type StatementPreviewFile,
} from "@/types/statement";
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { Modal } from '@/components/layout/Modal';
import { buttonOutlineClass, buttonWarningClass, glassCardClass } from '@/components/layout/tokens';
import { FileArchive, FilePlusIcon, Loader2, PlusCircle, Trash2, TrendingDown, TrendingUp, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent, DragEvent } from "react";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils/cn";

const PER_PAGE = 50;

const formatCurrency = (amount: number): string => {
	const absAmount = Math.abs(amount / 100).toFixed(2);
	return `${amount < 0 ? '-' : ''}$${absAmount}`;
};

export const Statements = () => {
	const [page, setPage] = useState(1);
	const [items, setItems] = useState<Statement[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [loading, setLoading] = useState(true);
	const [missingPeriods, setMissingPeriods] = useState<string[]>([]);
	const [missingLoading, setMissingLoading] = useState(true);

	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [replacePrompt, setReplacePrompt] = useState<{
		files: File[];
		conflicts: StatementPreviewFile[];
	} | null>(null);
	const [sortState, setSortState] = useState<SortState<Statement>>({
		key: 'date',
		direction: 'desc',
	});

	const fetchGenerationRef = useRef(0);

	const reloadPage = useCallback(async (targetPage: number) => {
		const generation = fetchGenerationRef.current + 1;
		fetchGenerationRef.current = generation;
		setLoading(true);

		try {
			const result = await fetchStatementsPage({ page: targetPage, perPage: PER_PAGE });
			if (fetchGenerationRef.current !== generation) {
				return;
			}
			setItems(result.items);
			setTotal(result.total);
			setTotalPages(result.total_pages);
			setPage(result.page);
		} catch {
			if (fetchGenerationRef.current !== generation) {
				return;
			}
			setItems([]);
			setTotal(0);
			setTotalPages(0);
		} finally {
			if (fetchGenerationRef.current === generation) {
				setLoading(false);
			}
		}
	}, []);

	const reloadMissing = useCallback(async () => {
		setMissingLoading(true);
		try {
			const periods = await fetchMissingStatementPeriods();
			setMissingPeriods(periods);
		} catch {
			setMissingPeriods([]);
		} finally {
			setMissingLoading(false);
		}
	}, []);

	const refreshAll = useCallback(async () => {
		await Promise.all([reloadPage(page), reloadMissing()]);
	}, [page, reloadPage, reloadMissing]);

	useEffect(() => {
		void reloadPage(page);
	}, [page, reloadPage]);

	useEffect(() => {
		void reloadMissing();
	}, [reloadMissing]);

	const clearFileInput = () => {
		const fileInput = document.getElementById("file-upload") as HTMLInputElement | null;
		if (fileInput) {
			fileInput.value = '';
		}
	};

	const commitUpload = async (pdfFiles: File[], replace: boolean) => {
		setIsUploading(true);
		try {
			const result = await uploadStatementFiles(pdfFiles, { replace });
			if (result.errors.length > 0 && result.processed_files.length === 0) {
				throw new Error(result.errors.join('; '));
			}
			if (result.errors.length > 0) {
				setUploadError(result.errors.join('; '));
			} else {
				setUploadError(null);
			}
			setPage(1);
			await reloadPage(1);
			await reloadMissing();
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : "An unknown error occurred during upload.");
		} finally {
			setIsUploading(false);
			clearFileInput();
		}
	};

	const handleFileUpload = async (files: FileList | null) => {
		if (!files || files.length === 0) {
			setUploadError("No files selected or dropped.");
			return;
		}

		const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
		if (pdfFiles.length === 0) {
			setUploadError("No PDF files found. Please upload PDF statements only.");
			return;
		}
		if (pdfFiles.length < files.length) {
			setUploadError("Some non-PDF files were ignored. Only PDF files can be uploaded.");
		} else {
			setUploadError(null);
		}

		setIsUploading(true);
		try {
			const preview = await previewStatementUpload(pdfFiles);
			if (preview.errors.length > 0 && preview.files.length === 0) {
				throw new Error(preview.errors.join('; '));
			}
			const conflicts = preview.files.filter((file) => file.conflict);
			if (conflicts.length > 0) {
				if (preview.errors.length > 0) {
					setUploadError(preview.errors.join('; '));
				}
				setReplacePrompt({ files: pdfFiles, conflicts });
				return;
			}
			if (preview.errors.length > 0) {
				setUploadError(preview.errors.join('; '));
			}
			await commitUpload(pdfFiles, false);
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : "An unknown error occurred during upload.");
			clearFileInput();
		} finally {
			setIsUploading(false);
		}
	};

	const handleCancelReplace = () => {
		setReplacePrompt(null);
		clearFileInput();
	};

	const handleConfirmReplace = async () => {
		if (replacePrompt === null) {
			return;
		}
		const { files } = replacePrompt;
		setReplacePrompt(null);
		await commitUpload(files, true);
	};

	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (!isUploading) {
			setIsDraggingOver(true);
		}
	};

	const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDraggingOver(false);
	};

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDraggingOver(false);
		if (isUploading) return;
		void handleFileUpload(event.dataTransfer.files);
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		void handleFileUpload(event.target.files);
	};

	const handleDeleteStatement = async (statementId: number) => {
		if (!window.confirm(`Are you sure you want to delete statement ID ${statementId}? This action cannot be undone.`)) {
			return;
		}
		setDeletingId(statementId);
		try {
			const response = await fetch(`/api/statements/${statementId}`, { method: 'DELETE' });
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Delete failed" }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}
			await refreshAll();
		} catch (error) {
			alert(`Failed to delete statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setDeletingId(null);
		}
	};

	const columns: TColumn<Statement>[] = useMemo(() => [
		{
			key: "id",
			label: "ID",
			sortable: true,
			render: (v) => v,
			sortFunction: (a, b) => a - b,
		},
		{
			key: "date", label: "Statement Period", sortable: true,
			render: (v) => DateTime.fromISO(v).isValid ? DateTime.fromISO(v).toFormat("LLL yyyy") : "Invalid Date",
			sortFunction: (a, b) => DateTime.fromISO(a).toMillis() - DateTime.fromISO(b).toMillis(),
		},
		{
			key: "closing_balance", label: "Profit/Loss", sortable: true,
			render: (_v, row) => {
				const profitOrLoss = row.closing_balance - row.opening_balance;
				const isProfit = profitOrLoss >= 0;
				return (
					<span className={cn("flex items-center gap-1 font-mono", isProfit ? "text-green-400" : "text-red-400")}>
						{isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
						{formatCurrency(profitOrLoss)}
					</span>
				);
			},
			sortFunction: (a, b, rowA, rowB) => (rowA.closing_balance - rowA.opening_balance) - (rowB.closing_balance - rowB.opening_balance)
		},
		{
			key: "created_at",
			label: "Actions",
			sortable: false,
			render: (_v, row) => (
				<div className="flex gap-2 items-center">
					<button title="View Details (Not Implemented)" className="cursor-pointer hover:text-secondary-default disabled:opacity-50 disabled:cursor-not-allowed" disabled={deletingId === row.id}>
						<PlusCircle className="w-4 h-4 text-secondary-default/60 hover:text-secondary-default" />
					</button>
					<button title={`Delete Statement ${row.id}`} className="cursor-pointer text-red-500/60 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleDeleteStatement(row.id)} disabled={deletingId === row.id}>
						{deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
					</button>
				</div>
			),
		},
	], [deletingId]);

	const sortedItems = useMemo(
		() => sortRows(items, columns, sortState),
		[items, columns, sortState]
	);

	return (
		<PageShell variant="table" className="relative">
			<div className="border-b border-white/10 p-4">
				<PageHeader
					title="Statements"
					subtitle="Upload bank statement PDFs and manage imported periods."
					icon={<FileArchive className="h-6 w-6 text-secondary-default" />}
					className="mb-0"
				/>
			</div>
			<Modal
				open={replacePrompt !== null}
				onClose={handleCancelReplace}
				size="md"
				title="These periods are already imported"
				description="Replacing will delete the existing statement and transactions for that account and month."
				footer={
					<>
						<button type="button" onClick={handleCancelReplace} className={buttonOutlineClass}>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void handleConfirmReplace()}
							className={buttonWarningClass}
						>
							Replace
						</button>
					</>
				}
			>
				{replacePrompt !== null ? (
					<>
						<p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-400/90">
							Replace existing statements
						</p>
						<ul className="max-h-48 space-y-2 overflow-y-auto">
						{replacePrompt.conflicts.map((conflict) => (
							<li
								key={`${conflict.account_id}-${conflict.statement_date}-${conflict.filename}`}
								className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-white"
							>
								<span className="font-medium">{conflict.period_label}</span>
								{' · '}
								<span className="text-white/80">account {conflict.account_id}</span>
								<span className="mt-0.5 block text-xs text-white/55">{conflict.filename}</span>
							</li>
						))}
						</ul>
					</>
				) : null}
			</Modal>

			{isUploading && (
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
					<Loader2 className="w-12 h-12 animate-spin text-secondary-default mb-4" />
					<p className="text-white text-lg">Uploading statements...</p>
				</div>
			)}

			<div
				className={cn(
					'mx-4 mb-4 p-6 transition-colors duration-200 ease-in-out',
					glassCardClass,
					isDraggingOver && !isUploading && 'border-secondary-default/50 border-dashed bg-white/10',
					!isUploading ? 'cursor-pointer hover:bg-white/[0.07]' : 'pointer-events-none opacity-50',
				)}
				onClick={() => !isUploading && document.getElementById("file-upload")?.click()}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className="flex flex-col items-center justify-center pointer-events-none">
					{isDraggingOver && !isUploading ? (
						<>
							<UploadCloud className="w-10 h-10 mx-auto text-secondary-default mb-2" />
							<p className="text-center text-secondary-default font-semibold">Drop PDF files here</p>
						</>
					) : (
						<>
							<p className="text-center text-white/30">Click or drop PDF statement(s) here to upload</p>
							<br />
							<FilePlusIcon className="w-8 h-8 mx-auto text-white/30 group-hover:text-secondary-default/60" />
						</>
					)}
				</div>
				<input
					type="file"
					multiple
					className="hidden"
					accept=".pdf,application/pdf"
					id="file-upload"
					onChange={handleInputChange}
					disabled={isUploading}
				/>
				{uploadError ? (
					<p className="mt-2 text-center text-sm text-red-400">{uploadError}</p>
				) : null}
			</div>

			{missingPeriods.length > 0 && !missingLoading ? (
				<div className="mx-4 mb-4">
					<InlineAlert variant="warning">
						<span className="font-semibold">Missing statement periods:</span>
						<ul className="ml-4 mt-1 list-disc">
							{missingPeriods.map((period) => (
								<li key={period}>{period}</li>
							))}
						</ul>
					</InlineAlert>
				</div>
			) : null}

			<div className={cn('min-h-0 flex-grow overflow-hidden px-4', isUploading && 'opacity-50')}>
				<Table<Statement>
					columns={columns}
					data={sortedItems}
					header={{ sticky: true }}
					loading={loading && !isUploading}
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
					emptyStateMessage={loading ? "Loading..." : "No statements found."}
				/>
			</div>
		</PageShell>
	);
};
