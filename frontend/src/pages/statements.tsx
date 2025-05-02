import { Table, type TColumn } from "@/components/table";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getAllStatements } from "@/store/thunks/statements.get.all";
// Import necessary icons
import { AlertTriangle, FilePlusIcon, Loader2, PlusCircle, Trash2, TrendingDown, TrendingUp, UploadCloud } from "lucide-react"; // Added AlertTriangle
import { useEffect, useState, ChangeEvent, DragEvent, useMemo } from "react"; // Added useMemo
import { DateTime, Interval } from "luxon"; // Added Interval
import { cn } from "@/lib/utils/cn";
// --- Assume you have a delete thunk like this ---
// import { deleteStatement } from "@/store/thunks/statements.delete";
// --- End of assumption ---

// Define the Statement type based on your Redux store structure
export type Statement = {
	id: number;
	date: string; // Assuming ISO date string for the start of the period
	account_id: string;
	opening_balance: number;
	closing_balance: number;
	deleted_at: string | null; // Allow null if it can be null
	created_at: string; // Assuming this is always present
};

// Helper function for currency formatting (optional, adjust as needed)
const formatCurrency = (amount: number): string => {
	// Basic formatting, consider using Intl.NumberFormat for more robust localization
	const absAmount = Math.abs(amount / 100).toFixed(2); // Assuming balances are in cents
	return `${amount < 0 ? '-' : ''}$${absAmount}`;
};


export const Statements = () => {
	const dispatch = useAppDispatch();
	// Use the defined Statement type for the selector
	const { statements, statementsLoading } = useAppSelector(
		(state): { statements: Statement[], statementsLoading: boolean } => state.StatementsReducer
	);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	// State to track if a file is being dragged over the drop zone
	const [isDraggingOver, setIsDraggingOver] = useState(false);

	useEffect(() => {
		void dispatch(getAllStatements());
	}, [dispatch]);

	// --- Calculate Missing Statement Periods ---
	const missingPeriods = useMemo(() => {
		if (!statements || statements.length < 2) {
			return []; // Need at least two statements to find a gap
		}

		// 1. Sort statements by date ascending
		const sortedStatements = [...statements].sort((a, b) =>
			DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis()
		);

		const missing: string[] = [];
		// 2. Iterate and find gaps (assuming monthly statements)
		for (let i = 1; i < sortedStatements.length; i++) {
			const prevDate = DateTime.fromISO(sortedStatements[i - 1].date);
			const currDate = DateTime.fromISO(sortedStatements[i].date);

			if (!prevDate.isValid || !currDate.isValid) {
				console.warn("Invalid date found while checking for missing statements, skipping comparison.");
				continue; // Skip if dates are invalid
			}

			// Calculate the difference in months
			// Ensure we compare based on the start of the month for accurate diff
			const monthsDiff = currDate.startOf('month').diff(prevDate.startOf('month'), 'months').months;

			// If difference is more than 1 month, there's a gap
			if (monthsDiff > 1) {
				let missingDate = prevDate.plus({ months: 1 });
				// Get the start of the month for the current date for comparison
				const currDateStartOfMonth = currDate.startOf('month');
				// Loop while the *start* of the missing month is strictly less than the *start* of the current statement's month
				while (missingDate.startOf('month') < currDateStartOfMonth) { // <-- Updated condition
					missing.push(missingDate.toFormat("LLL yyyy")); // e.g., "Feb 2024"
					missingDate = missingDate.plus({ months: 1 });
				}
			}
		}

		return missing;
	}, [statements]);

	// --- Updated handleFileUpload to accept FileList ---
	const handleFileUpload = async (files: FileList | null) => {
		if (!files || files.length === 0) {
			setUploadError("No files selected or dropped.");
			return; // No files selected or dropped
		}

		// Optional: Filter for PDF files if needed (especially for drag-and-drop)
		const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
		if (pdfFiles.length === 0) {
			setUploadError("No PDF files found. Please upload PDF statements only.");
			return;
		}
		if (pdfFiles.length < files.length) {
			setUploadError("Some non-PDF files were ignored. Only PDF files can be uploaded.");
			// Continue with only the PDF files
		} else {
			setUploadError(null); // Reset error if all files are PDFs
		}


		setIsUploading(true);
		// setUploadError(null); // Error is handled above now
		const formData = new FormData();
		for (let i = 0; i < pdfFiles.length; i++) {
			formData.append("files", pdfFiles[i]); // Use "files" as the key
		}

		try {
			const response = await fetch("/api/statements", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Upload failed with status: " + response.status }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			console.log("Upload successful:", await response.json());
			void dispatch(getAllStatements());
			// Clear any previous upload error on success
			setUploadError(null);

		} catch (error) {
			console.error("Upload error:", error);
			setUploadError(error instanceof Error ? error.message : "An unknown error occurred during upload.");
		} finally {
			setIsUploading(false);
			// Reset the file input specifically (drag-and-drop doesn't need this)
			const fileInput = document.getElementById("file-upload") as HTMLInputElement;
			if (fileInput) {
				fileInput.value = '';
			}
		}
	};
	// --- End handleFileUpload update ---

	// --- Drag and Drop Handlers ---
	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault(); // Necessary to allow dropping
		event.stopPropagation();
		if (!isUploading) { // Only show effect if not already uploading
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
		setIsDraggingOver(false); // Reset visual state

		if (isUploading) return; // Don't process drop if already uploading

		const files = event.dataTransfer.files;
		void handleFileUpload(files); // Pass dropped files to the handler
	};
	// --- End Drag and Drop Handlers ---


	// --- Handler for file input change ---
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		void handleFileUpload(event.target.files);
	};
	// --- End Input Change Handler ---

	const handleDeleteStatement = async (statementId: number) => {
		if (!window.confirm(`Are you sure you want to delete statement ID ${statementId}? This action cannot be undone.`)) {
			return;
		}
		setDeletingId(statementId);
		try {
			// Placeholder for API call
			const response = await fetch(`/api/statements/${statementId}`, { method: 'DELETE' });
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Delete failed" }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}
			console.log(`Statement ${statementId} deleted successfully.`);
			void dispatch(getAllStatements());
		} catch (error) {
			console.error("Delete error:", error);
			alert(`Failed to delete statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setDeletingId(null);
		}
	};

	const columns: TColumn<Statement>[] = [
		{ key: "id", label: "ID", sortable: true, render: (v) => v },
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
			key: "id", label: "Actions",
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
	];

	return (
		<div className="relative flex flex-col items-center h-screen w-full">
			{isUploading && (
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
					<Loader2 className="w-12 h-12 animate-spin text-secondary-default mb-4" />
					<p className="text-white text-lg">Uploading statements...</p>
				</div>
			)}

			{/* --- Upload Area --- */}
			<div
				className={cn(
					"w-full p-4 border-b-1 border-secondary-default/20 bg-black transition-colors duration-200 ease-in-out",
					isDraggingOver && !isUploading && "border-secondary-default border-dashed border-2 bg-white/10",
					!isUploading ? "cursor-pointer hover:bg-white/5" : "opacity-50 pointer-events-none",
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
				{uploadError && (
					<p className="text-center text-red-500 mt-2 text-sm">{uploadError}</p>
				)}
			</div>
			{/* --- End Upload Area --- */}

			{/* --- Missing Statements Warning --- */}
			{missingPeriods.length > 0 && !statementsLoading && (
				<div className="w-full p-3 bg-yellow-900/30 border-b border-yellow-600/50 text-yellow-300 text-sm">
					<div className="flex items-center gap-2 max-w-screen-lg mx-auto">
						<AlertTriangle size={18} className="flex-shrink-0" />
						<div>
							<span className="font-semibold">Missing Statement Periods Detected:</span>
							<ul className="list-disc list-inside ml-2 mt-1">
								{missingPeriods.map(period => <li key={period}>{period}</li>)}
							</ul>
						</div>
					</div>
				</div>
			)}
			{/* --- End Missing Statements Warning --- */}


			<div className={cn("w-full flex-grow overflow-hidden", isUploading && "opacity-50")}>
				<Table<Statement, keyof Statement>
					columns={columns}
					data={statements} // Pass original data, table handles its own sorting state
					header={{ sticky: true }}
					loading={statementsLoading && !isUploading}
				/>
			</div>
		</div>
	);
};
