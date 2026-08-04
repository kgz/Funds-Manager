import {
	fetchMissingStatementPeriods,
	fetchStatementsPage,
	previewStatementUpload,
	uploadStatementFiles,
	type MissingStatementPeriod,
	type Statement,
	type StatementPreviewFile,
} from '@/types/statement';
import { AccountMultiSelect } from '@/components/account-multi-select';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { Modal } from '@/components/layout/Modal';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	buttonOutlineClass,
	buttonWarningClass,
	glassCardClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { useStatementsAccountFilter } from '@/hooks/useStatementsAccountFilter';
import { cn } from '@/lib/utils/cn';
import { accountDisplayLabel } from '@/types/account';
import { AlertTriangle, FileArchive, Loader2, Upload } from 'lucide-react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
} from 'react';
import { DateTime } from 'luxon';

const PER_PAGE = 50;
const CLIENT_FETCH_PER_PAGE = 200;

const stmtPrimaryButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const stmtGhostButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center rounded-paper border border-transparent bg-transparent px-3 text-[13px] font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

const stmtOutlineButtonClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const pillBaseClass =
	'inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-medium uppercase tracking-[0.04em]';

const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

type MissingPeriodRow = {
	kind: 'missing';
	key: string;
	accountLabel: string;
	period: string;
};

type StatementRow = {
	kind: 'statement';
	key: string;
	statement: Statement;
};

type DisplayRow = MissingPeriodRow | StatementRow;

function formatStatementPeriod(row: Statement): string {
	const start = row.period_start ? DateTime.fromISO(row.period_start) : null;
	const end = row.period_end ? DateTime.fromISO(row.period_end) : null;
	if (start?.isValid && end?.isValid) {
		if (start.month === end.month && start.year === end.year) {
			return `${start.toFormat('dd')}–${end.toFormat('dd LLL yyyy')}`;
		}
		return `${start.toFormat('dd LLL yyyy')}–${end.toFormat('dd LLL yyyy')}`;
	}
	const date = DateTime.fromISO(row.date);
	return date.isValid ? date.toFormat('LLL yyyy') : 'Invalid date';
}

function periodSortKey(period: string): number {
	if (period.includes(' to ')) {
		const start = period.split(' to ')[0]?.trim() ?? '';
		const parsed = DateTime.fromISO(start);
		if (parsed.isValid) {
			return parsed.toMillis();
		}
	}
	const parsed = DateTime.fromFormat(period, 'LLL yyyy');
	return parsed.isValid ? parsed.toMillis() : 0;
}

function statementSortKey(row: Statement): number {
	if (row.period_end) {
		const parsed = DateTime.fromISO(row.period_end);
		if (parsed.isValid) {
			return parsed.toMillis();
		}
	}
	const parsed = DateTime.fromISO(row.date);
	return parsed.isValid ? parsed.toMillis() : 0;
}

function buildMissingAlertBody(periods: MissingStatementPeriod[]): string {
	const byAccount = new Map<string, string[]>();
	for (const entry of periods) {
		const existing = byAccount.get(entry.account_label) ?? [];
		existing.push(entry.period);
		byAccount.set(entry.account_label, existing);
	}
	const sentences = [...byAccount.entries()].map(([label, accountPeriods]) => {
		const periodBits = accountPeriods.map((period) => {
			const display = period.includes(' to ')
				? period
				: period;
			return display;
		});
		const joined =
			periodBits.length === 1
				? periodBits[0]
				: `${periodBits.slice(0, -1).join(', ')} or ${periodBits[periodBits.length - 1]}`;
		return `${label} has no statement covering ${joined}.`;
	});
	return sentences.join(' ');
}

export const Statements = () => {
	const {
		accounts,
		accountsLoading,
		selectedIds,
		setSelectedIds,
		filterLabel,
		apiAccountId,
		needsClientFilter,
		accountLabelMatchesFilter,
		statementMatchesFilter,
	} = useStatementsAccountFilter();

	const [page, setPage] = useState(1);
	const [items, setItems] = useState<Statement[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [missingPeriods, setMissingPeriods] = useState<MissingStatementPeriod[]>([]);
	const [missingLoading, setMissingLoading] = useState(true);

	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploadStatus, setUploadStatus] = useState<string | null>(null);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [replacePrompt, setReplacePrompt] = useState<{
		files: File[];
		conflicts: StatementPreviewFile[];
	} | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const fetchGenerationRef = useRef(0);

	const filteredMissingPeriods = useMemo(
		() => missingPeriods.filter((entry) => accountLabelMatchesFilter(entry.account_label)),
		[missingPeriods, accountLabelMatchesFilter]
	);

	const reloadPage = useCallback(async (targetPage: number) => {
		const generation = fetchGenerationRef.current + 1;
		fetchGenerationRef.current = generation;
		setLoading(true);
		setLoadError(null);

		try {
			const result = await fetchStatementsPage({
				page: needsClientFilter ? 1 : targetPage,
				perPage: needsClientFilter ? CLIENT_FETCH_PER_PAGE : PER_PAGE,
				accountId: apiAccountId,
				sortBy: 'date',
				sortDir: 'desc',
			});
			if (fetchGenerationRef.current !== generation) {
				return;
			}

			let nextItems = result.items;
			let nextTotal = result.total;
			let nextTotalPages = result.total_pages;
			let nextPage = result.page;

			if (needsClientFilter) {
				nextItems = result.items.filter((row) =>
					statementMatchesFilter(row.financial_account_id ?? row.financial_account?.id)
				);
				nextTotal = nextItems.length;
				nextTotalPages = Math.max(1, Math.ceil(nextTotal / PER_PAGE));
				nextPage = Math.min(targetPage, nextTotalPages);
				const offset = (nextPage - 1) * PER_PAGE;
				nextItems = nextItems.slice(offset, offset + PER_PAGE);
			}

			setItems(nextItems);
			setTotal(nextTotal);
			setTotalPages(nextTotalPages);
			setPage(nextPage);
		} catch (error) {
			if (fetchGenerationRef.current !== generation) {
				return;
			}
			setItems([]);
			setTotal(0);
			setTotalPages(0);
			setLoadError(
				error instanceof Error ? error.message : 'Failed to load statements'
			);
		} finally {
			if (fetchGenerationRef.current === generation) {
				setLoading(false);
			}
		}
	}, [apiAccountId, needsClientFilter, statementMatchesFilter]);

	const reloadMissing = useCallback(async () => {
		setMissingLoading(true);
		try {
			const periods = await fetchMissingStatementPeriods(apiAccountId);
			setMissingPeriods(periods);
		} catch {
			setMissingPeriods([]);
		} finally {
			setMissingLoading(false);
		}
	}, [apiAccountId]);

	useEffect(() => {
		setPage(1);
	}, [apiAccountId, needsClientFilter, selectedIds]);

	useEffect(() => {
		void reloadPage(page);
	}, [page, reloadPage]);

	useEffect(() => {
		void reloadMissing();
	}, [reloadMissing]);

	const clearFileInput = () => {
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const openFilePicker = () => {
		if (!isUploading) {
			fileInputRef.current?.click();
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
			if (result.processed_files.length > 0) {
				setUploadStatus(`Imported ${result.processed_files.length} file(s)`);
			}
			setPage(1);
			await reloadPage(1);
			await reloadMissing();
		} catch (error) {
			setUploadError(
				error instanceof Error ? error.message : 'An unknown error occurred during upload.'
			);
		} finally {
			setIsUploading(false);
			clearFileInput();
		}
	};

	const handleFileUpload = async (files: FileList | null) => {
		if (!files || files.length === 0) {
			setUploadError('No files selected or dropped.');
			return;
		}

		const pdfFiles = Array.from(files).filter((file) => file.type === 'application/pdf');
		if (pdfFiles.length === 0) {
			setUploadError('No PDF files found. Please upload PDF statements only.');
			return;
		}
		if (pdfFiles.length < files.length) {
			setUploadError('Some non-PDF files were ignored. Only PDF files can be uploaded.');
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
			setUploadError(
				error instanceof Error ? error.message : 'An unknown error occurred during upload.'
			);
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
		if (isUploading) {
			return;
		}
		void handleFileUpload(event.dataTransfer.files);
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		void handleFileUpload(event.target.files);
	};

	const displayRows: DisplayRow[] = useMemo(() => {
		const statementRows: DisplayRow[] = items.map((statement) => ({
			kind: 'statement',
			key: `statement-${statement.id}`,
			statement,
		}));
		const missingRows: DisplayRow[] = filteredMissingPeriods.map((entry) => ({
			kind: 'missing',
			key: `missing-${entry.account_label}-${entry.period}`,
			accountLabel: entry.account_label,
			period: entry.period.includes(' to ')
				? entry.period
				: entry.period,
		}));
		return [...statementRows, ...missingRows].sort((left, right) => {
			const leftKey =
				left.kind === 'statement'
					? statementSortKey(left.statement)
					: periodSortKey(left.period);
			const rightKey =
				right.kind === 'statement'
					? statementSortKey(right.statement)
					: periodSortKey(right.period);
			return rightKey - leftKey;
		});
	}, [filteredMissingPeriods, items]);

	const visibleCount = displayRows.length;
	const countLabel =
		visibleCount === 1 ? '1 on file' : `${visibleCount} on file`;

	const initialLoading = loading && items.length === 0 && loadError === null;
	const showEmpty =
		!loading &&
		!isUploading &&
		total === 0 &&
		filteredMissingPeriods.length === 0 &&
		loadError === null;

	const missingAlertBody = buildMissingAlertBody(filteredMissingPeriods);

	return (
		<PageShell variant="table" className="relative">
			<header className="sticky top-0 z-30 shrink-0 border-b border-paper-border bg-paper-surface px-8 py-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Statements</h1>
							{loading ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Import bank PDF statements · {filterLabel}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<AccountMultiSelect
							accounts={accounts}
							selectedIds={selectedIds}
							onSelectedIdsChange={setSelectedIds}
							disabled={accountsLoading}
							menuAlign="right"
						/>
						<button
							type="button"
							className={stmtPrimaryButtonClass}
							disabled={isUploading}
							onClick={openFilePicker}
						>
							Upload PDF
						</button>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							className="hidden"
							accept=".pdf,application/pdf"
							onChange={handleInputChange}
							disabled={isUploading}
						/>
					</div>
				</div>
			</header>

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
					<ul className="max-h-48 space-y-2 overflow-y-auto">
						{replacePrompt.conflicts.map((conflict) => (
							<li
								key={`${conflict.account_id}-${conflict.statement_date}-${conflict.filename}`}
								className="rounded-paper border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))] px-3 py-2 text-sm text-paper-fg"
							>
								<span className="font-semibold">{conflict.period_label}</span>
								{' · '}
								<span>account {conflict.account_id}</span>
								<span className="mt-0.5 block text-xs text-paper-muted">
									{conflict.filename}
								</span>
							</li>
						))}
					</ul>
				) : null}
			</Modal>

			{isUploading ? (
				<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[color-mix(in_oklch,var(--fg)_35%,transparent)] backdrop-blur-sm">
					<Loader2 className="mb-4 h-12 w-12 animate-spin text-paper-fg" />
					<p className="text-lg text-paper-fg">Uploading statements…</p>
				</div>
			) : null}

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				<div className="flex flex-col gap-6">
					{filteredMissingPeriods.length > 0 && !missingLoading ? (
						<div
							role="status"
							className="flex items-start gap-2.5 rounded-paper border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))] px-3.5 py-3 text-[13px] text-paper-fg"
						>
							<AlertTriangle
								className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_oklch,var(--warn)_80%,var(--fg))]"
								strokeWidth={1.8}
								aria-hidden
							/>
							<div>
								<strong className="font-semibold">Missing periods detected.</strong>{' '}
								{missingAlertBody} Upload those PDFs to close the gaps.
							</div>
						</div>
					) : null}

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="p-4">
							<div
								role="button"
								tabIndex={0}
								aria-label="Drop PDF statements here or click to browse"
								className={cn(
									'rounded-lg border border-dashed border-[color-mix(in_oklch,var(--muted)_40%,var(--border))] bg-paper px-6 py-9 text-center transition-[border-color,background] duration-150',
									isDraggingOver && !isUploading
										? 'border-[color-mix(in_oklch,var(--accent)_60%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_5%,var(--bg))]'
										: 'cursor-pointer hover:border-[color-mix(in_oklch,var(--muted)_55%,var(--border))]',
									isUploading && 'pointer-events-none opacity-50'
								)}
								onClick={openFilePicker}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										openFilePicker();
									}
								}}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<Upload
									className="mx-auto h-8 w-8 text-paper-muted"
									strokeWidth={1.5}
									aria-hidden
								/>
								<h3 className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
									Drop bank statement PDFs
								</h3>
								<p className="mt-1 text-[13px] text-paper-muted">
									People&apos;s Choice, CBA, and similar AU statement formats · max 20
									MB each
								</p>
								<p className="mt-3">
									<button
										type="button"
										className={stmtOutlineButtonClass}
										onClick={(event) => {
											event.stopPropagation();
											openFilePicker();
										}}
										disabled={isUploading}
									>
										Browse files
									</button>
								</p>
							</div>
							{uploadError ? (
								<p className="mt-3 text-center text-[13px] text-[var(--danger)]">
									{uploadError}
								</p>
							) : null}
							{uploadStatus && !uploadError ? (
								<p className={cn(panelHintClass, 'mt-3 text-center')}>
									{uploadStatus}
								</p>
							) : null}
						</div>
					</section>

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Imported statements</h2>
							<p className={panelHintClass}>{countLabel}</p>
						</div>

						{initialLoading ? (
							<PageLoadingState label="Loading statements…" fullScreen={false} />
						) : loadError !== null && items.length === 0 ? (
							<ErrorState
								title="Error loading statements"
								message={loadError}
								onRetry={() => void reloadPage(page)}
								className="min-h-[30vh]"
							/>
						) : showEmpty ? (
							<EmptyState
								compact
								icon={FileArchive}
								title="No statements yet"
								description="Upload a PDF above to import your first statement period."
								className="py-12"
							/>
						) : (
							<>
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[13px]">
										<thead>
											<tr>
												<th className={tableThClass}>Period</th>
												<th className={tableThClass}>Account</th>
												<th className={tableThClass}>Filename</th>
												<th className={tableThClass}>Imported</th>
												<th className={tableThClass}>Txns</th>
												<th className={tableThClass}>Status</th>
												<th className={tableThClass} />
											</tr>
										</thead>
										<tbody>
											{displayRows.map((row) => {
												if (row.kind === 'missing') {
													return (
														<tr
															key={row.key}
															className="bg-[color-mix(in_oklch,var(--warn)_6%,var(--surface))]"
														>
															<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
																{row.period}
															</td>
															<td className={tableTdClass}>{row.accountLabel}</td>
															<td className={cn(tableTdClass, 'text-paper-muted')}>—</td>
															<td className={cn(tableTdClass, 'text-paper-muted')}>—</td>
															<td className={cn(tableTdClass, 'text-paper-muted')}>—</td>
															<td className={tableTdClass}>
																<span
																	className={cn(
																		pillBaseClass,
																		'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] text-[oklch(45%_0.12_75)]'
																	)}
																>
																	Missing
																</span>
															</td>
															<td className={tableTdClass}>
																<button
																	type="button"
																	className={stmtOutlineButtonClass}
																	onClick={openFilePicker}
																	disabled={isUploading}
																>
																	Upload
																</button>
															</td>
														</tr>
													);
												}

												const statement = row.statement;
												const accountLabel = statement.financial_account
													? accountDisplayLabel(statement.financial_account)
													: statement.account_id;
												const imported = DateTime.fromISO(statement.created_at);

												return (
													<tr
														key={row.key}
														className="transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
													>
														<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
															{formatStatementPeriod(statement)}
														</td>
														<td className={tableTdClass}>{accountLabel}</td>
														<td className={cn(tableTdClass, 'text-paper-muted')}>—</td>
														<td className={cn(tableTdClass, 'font-mono tabular-nums')}>
															{imported.isValid
																? imported.toFormat('dd LLL yyyy')
																: '—'}
														</td>
														<td className={cn(tableTdClass, 'font-mono tabular-nums text-paper-muted')}>
															—
														</td>
														<td className={tableTdClass}>
															<span
																className={cn(
																	pillBaseClass,
																	'border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[var(--success)]'
																)}
															>
																Parsed
															</span>
														</td>
														<td className={tableTdClass}>
															<button
																type="button"
																className={stmtGhostButtonClass}
																disabled
																title="View details (not implemented)"
															>
																View
															</button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								{totalPages > 1 ? (
									<div className="flex items-center justify-between gap-3 border-t border-paper-border px-4 py-3 text-xs text-paper-muted">
										<span>
											Page {page} of {totalPages} · {total} statement
											{total === 1 ? '' : 's'}
										</span>
										<div className="flex items-center gap-1.5">
											<button
												type="button"
												className={stmtOutlineButtonClass}
												disabled={page <= 1 || loading}
												onClick={() => setPage((current) => Math.max(1, current - 1))}
											>
												Previous
											</button>
											<button
												type="button"
												className={stmtOutlineButtonClass}
												disabled={page >= totalPages || loading}
												onClick={() => setPage((current) => current + 1)}
											>
												Next
											</button>
										</div>
									</div>
								) : null}
							</>
						)}
					</section>
				</div>
			</div>
		</PageShell>
	);
};
