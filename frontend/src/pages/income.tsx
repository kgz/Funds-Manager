import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HandCoins, Info, Loader2, Pencil, X } from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	eyebrowClass,
	glassCardClass,
	inputDarkClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
	selectDarkClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	fetchIncomeSummary,
	upsertIncomeStreamProfile,
	type IncomeStreamSummary,
} from '@/types/income';
import {
	monthlyToPackageAmount,
	packageAmountToMonthly,
	readPackagePeriod,
	type PackagePeriod,
	yearlyGstFromMonthly,
} from '@/lib/income/yearlyGst';

const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const incomeKpiLabelClass =
	'm-0 text-[12px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const incomeKpiValueClass =
	'm-0 text-[26px] font-medium leading-none tracking-[-0.02em] text-paper-fg';

const incomeKpiMoneyClass =
	'm-0 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums text-paper-fg';

const pillBaseClass =
	'inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-medium uppercase tracking-[0.04em]';

const incomeBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const incomeBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const incomeBtnEditClass =
	'inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-paper border border-paper-border bg-paper-surface px-2 text-[12px] font-medium text-paper-muted transition-colors hover:text-paper-fg hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))]';

const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

function IncomeStatusPills({ stream }: { stream: IncomeStreamSummary }) {
	return (
		<span className="inline-flex flex-wrap gap-1">
			{stream.isPrimary ? (
				<span
					className={cn(
						pillBaseClass,
						'border-[color-mix(in_oklch,var(--accent)_30%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))] text-secondary-default'
					)}
				>
					Primary
				</span>
			) : null}
			{stream.isConfirmed ? (
				<span
					className={cn(
						pillBaseClass,
						'border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[color:var(--success)]'
					)}
				>
					Confirmed
				</span>
			) : null}
			{stream.isIrregular ? (
				<span
					className={cn(
						pillBaseClass,
						'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] text-[oklch(45%_0.12_75)]'
					)}
				>
					Variable
				</span>
			) : null}
		</span>
	);
}

type IncomeKpiRowProps = {
	totalMonthlyDollars: number;
	totalYearlyExGstDollars: number;
	totalYearlyIncGstDollars: number;
	streamCount: number;
};

function IncomeKpiRow({
	totalMonthlyDollars,
	totalYearlyExGstDollars,
	totalYearlyIncGstDollars,
	streamCount,
}: IncomeKpiRowProps) {
	return (
		<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Income summary">
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={incomeKpiLabelClass}>Est monthly</p>
				<p className={cn(incomeKpiMoneyClass, 'mt-2')}>{formatMoney(totalMonthlyDollars)}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={incomeKpiLabelClass}>Est yearly ex GST</p>
				<p className={cn(incomeKpiMoneyClass, 'mt-2')}>{formatMoney(totalYearlyExGstDollars)}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={incomeKpiLabelClass}>Est yearly inc GST</p>
				<p className={cn(incomeKpiMoneyClass, 'mt-2')}>{formatMoney(totalYearlyIncGstDollars)}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={incomeKpiLabelClass}>Streams detected</p>
				<p className={cn(incomeKpiValueClass, 'mt-2')}>{streamCount}</p>
			</article>
		</section>
	);
}

function IncomePaygCallout() {
	return (
		<div className="mx-4 mb-3 rounded-paper border border-[color-mix(in_oklch,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_6%,var(--surface))] p-3.5 text-[13px] leading-[1.45]">
			<div className="flex min-w-0 items-start gap-2.5">
				<span
					className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color-mix(in_oklch,var(--accent)_24%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-secondary-default"
					aria-hidden="true"
				>
					<Info className="h-3.5 w-3.5" strokeWidth={2} />
				</span>
				<div className="min-w-0">
					<strong className="mb-0.5 block font-semibold text-paper-fg">
						Detected amounts are after PAYG withholding
					</strong>
					<p className="m-0 text-[12px] text-paper-muted">
						Bank deposits reflect take-home pay. Edit each stream to set the employment package ex
						GST per week, month, or year for lender serviceability.
					</p>
				</div>
			</div>
		</div>
	);
}

type IncomeEditDialogProps = {
	stream: IncomeStreamSummary | null;
	label: string;
	gross: string;
	grossPeriod: PackagePeriod;
	isPrimary: boolean;
	isConfirmed: boolean;
	saving: boolean;
	saveError: string | null;
	grossPreview: { exGst: number; incGst: number } | null;
	onClose: () => void;
	onLabelChange: (value: string) => void;
	onGrossChange: (value: string) => void;
	onGrossPeriodChange: (period: PackagePeriod) => void;
	onPrimaryChange: (value: boolean) => void;
	onConfirmedChange: (value: boolean) => void;
	onSubmit: (event: FormEvent) => void;
};

function IncomeEditDialog({
	stream,
	label,
	gross,
	grossPeriod,
	isPrimary,
	isConfirmed,
	saving,
	saveError,
	grossPreview,
	onClose,
	onLabelChange,
	onGrossChange,
	onGrossPeriodChange,
	onPrimaryChange,
	onConfirmedChange,
	onSubmit,
}: IncomeEditDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog === null) {
			return;
		}
		if (stream !== null) {
			if (!dialog.open) {
				dialog.showModal();
			}
		} else if (dialog.open) {
			dialog.close();
		}
	}, [stream]);

	return (
		<dialog
			ref={dialogRef}
			className="fixed inset-0 m-auto h-fit w-[min(480px,calc(100vw-32px))] max-h-[min(640px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm"
			onCancel={(event) => {
				event.preventDefault();
				if (!saving) {
					onClose();
				}
			}}
			onClose={onClose}
		>
			<form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
				<div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
					<div className="min-w-0">
						<span className={cn(eyebrowClass, 'mb-1 block')}>Income stream</span>
						<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg">
							Edit stream
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={saving}
						className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
						aria-label="Close"
					>
						<X className="h-4 w-4" strokeWidth={2} />
					</button>
				</div>

				<div className="flex flex-col gap-3.5 overflow-y-auto px-[22px] py-[18px]">
					{saveError !== null ? <InlineAlert variant="error">{saveError}</InlineAlert> : null}
					<label className="flex flex-col gap-1.5">
						<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
							Label
						</span>
						<input
							className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
							value={label}
							onChange={(event) => onLabelChange(event.target.value)}
							disabled={saving}
						/>
					</label>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted">
							Package ex GST
						</span>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
							<input
								type="text"
								inputMode="decimal"
								className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono tabular-nums')}
								value={gross}
								onChange={(event) => onGrossChange(event.target.value)}
								placeholder="Contract or payslip amount"
								disabled={saving}
							/>
							<select
								className={cn(selectDarkClass, 'h-8 shrink-0 px-2.5')}
								value={grossPeriod}
								onChange={(event) => {
									const next = readPackagePeriod(event.target.value);
									if (next !== null) {
										onGrossPeriodChange(next);
									}
								}}
								disabled={saving}
								aria-label="Package period"
							>
								<option value="week" className="bg-paper-surface text-paper-fg">
									per week
								</option>
								<option value="month" className="bg-paper-surface text-paper-fg">
									per month
								</option>
								<option value="year" className="bg-paper-surface text-paper-fg">
									per year
								</option>
							</select>
						</div>
						{grossPreview !== null ? (
							<p className="m-0 text-[12px] text-paper-muted">
								Yearly ex GST {formatMoney(grossPreview.exGst)} · inc GST{' '}
								{formatMoney(grossPreview.incGst)}
							</p>
						) : null}
					</div>
					<div className="flex flex-col gap-2.5 pt-1">
						<label className="flex cursor-pointer items-center gap-2 text-[13px] text-paper-fg">
							<input
								type="checkbox"
								className="h-[15px] w-[15px] cursor-pointer accent-paper-fg"
								checked={isPrimary}
								onChange={(event) => onPrimaryChange(event.target.checked)}
								disabled={saving}
							/>
							Primary income
						</label>
						<label className="flex cursor-pointer items-center gap-2 text-[13px] text-paper-fg">
							<input
								type="checkbox"
								className="h-[15px] w-[15px] cursor-pointer accent-paper-fg"
								checked={isConfirmed}
								onChange={(event) => onConfirmedChange(event.target.checked)}
								disabled={saving}
							/>
							Confirmed by user
						</label>
					</div>
				</div>

				<div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
					<button type="button" className={incomeBtnClass} onClick={onClose} disabled={saving}>
						Cancel
					</button>
					<button type="submit" className={incomeBtnPrimaryClass} disabled={saving}>
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
					</button>
				</div>
			</form>
		</dialog>
	);
}

export function IncomePage() {
	const { accountIdNumber, selectedLabel } = useAccountFilter();
	const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchIncomeSummary>> | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState<IncomeStreamSummary | null>(null);
	const [label, setLabel] = useState('');
	const [gross, setGross] = useState('');
	const [grossPeriod, setGrossPeriod] = useState<PackagePeriod>('month');
	const [isPrimary, setIsPrimary] = useState(false);
	const [isConfirmed, setIsConfirmed] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchIncomeSummary(accountIdNumber);
			setSummary(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load income summary');
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [accountIdNumber]);

	useEffect(() => {
		void load();
	}, [load]);

	const openEdit = (stream: IncomeStreamSummary) => {
		setEditing(stream);
		setLabel(stream.label);
		const period: PackagePeriod = 'month';
		setGrossPeriod(period);
		setGross(
			stream.grossMonthlyDollars != null
				? String(monthlyToPackageAmount(stream.grossMonthlyDollars, period))
				: ''
		);
		setIsPrimary(stream.isPrimary);
		setIsConfirmed(stream.isConfirmed);
		setSaveError(null);
	};

	const closeEdit = () => {
		setEditing(null);
		setSaveError(null);
	};

	const onGrossPeriodChange = (nextPeriod: PackagePeriod) => {
		const parsed = gross.trim().length === 0 ? null : Number(gross);
		if (parsed !== null && Number.isFinite(parsed)) {
			const monthly = packageAmountToMonthly(parsed, grossPeriod);
			setGross(String(monthlyToPackageAmount(monthly, nextPeriod)));
		}
		setGrossPeriod(nextPeriod);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (editing === null) {
			return;
		}
		setSaving(true);
		setSaveError(null);
		const trimmedLabel = label.trim();
		const grossParsed = gross.trim().length === 0 ? null : Number(gross);
		if (grossParsed !== null && !Number.isFinite(grossParsed)) {
			setSaveError('Package amount must be a number');
			setSaving(false);
			return;
		}
		const grossMonthlyDollars =
			grossParsed === null ? null : packageAmountToMonthly(grossParsed, grossPeriod);
		try {
			await upsertIncomeStreamProfile({
				streamKey: editing.streamKey,
				displayLabel: trimmedLabel.length > 0 ? trimmedLabel : editing.sourceLabel,
				isPrimary,
				isConfirmed,
				grossMonthlyDollars,
			});
			closeEdit();
			await load();
		} catch (err: unknown) {
			setSaveError(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	const grossPreview = useMemo(() => {
		const parsed = gross.trim().length === 0 ? null : Number(gross);
		if (parsed === null || !Number.isFinite(parsed)) {
			return null;
		}
		return yearlyGstFromMonthly(packageAmountToMonthly(parsed, grossPeriod));
	}, [gross, grossPeriod]);

	const initialLoading = loading && summary === null && error === null;
	if (initialLoading) {
		return <PageLoadingState label="Detecting income streams…" />;
	}

	if (error !== null && summary === null) {
		return (
			<ErrorState
				title="Error loading income"
				message={error}
				onRetry={() => void load()}
			/>
		);
	}

	const streams = summary?.streams ?? [];

	return (
		<PageShell variant="table">
			<header className="sticky top-0 z-30 shrink-0 border-b border-paper-border bg-paper-surface px-8 py-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Income</h1>
							{loading ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							Detected salary and regular credits for broker verification
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<AccountFilter />
					</div>
				</div>
			</header>

			<div className="min-h-0 flex-grow overflow-auto px-8 py-6">
				<div className="flex flex-col gap-6">
					{summary !== null ? (
						<IncomeKpiRow
							totalMonthlyDollars={summary.totalMonthlyDollars}
							totalYearlyExGstDollars={summary.totalYearlyExGstDollars}
							totalYearlyIncGstDollars={summary.totalYearlyIncGstDollars}
							streamCount={streams.length}
						/>
					) : null}

					{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

					<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
						<div className="border-b border-paper-border px-4 py-3.5">
							<h2 className={panelTitleClass}>Income streams</h2>
							<p className={cn(panelHintClass, 'mt-1')}>
								{selectedLabel} · recurring credits
							</p>
						</div>

						<IncomePaygCallout />

						{streams.length === 0 ? (
							<div className="px-4 pb-6">
								<EmptyState
									icon={HandCoins}
									compact
									title="No income streams detected"
									description="Import statements with regular credits (e.g. salary) — at least 3 occurrences are needed."
								/>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[72rem] border-collapse text-[13px]">
									<thead>
										<tr>
											<th className={cn(tableThClass, 'min-w-[160px]')} scope="col">
												Source
											</th>
											<th className={cn(tableThClass, 'w-[100px]')} scope="col">
												Frequency
											</th>
											<th className={cn(tableThClass, 'text-right')} scope="col">
												Est monthly
											</th>
											<th className={cn(tableThClass, 'text-right')} scope="col">
												Yearly ex GST
											</th>
											<th className={cn(tableThClass, 'text-right')} scope="col">
												Yearly inc GST
											</th>
											<th className={cn(tableThClass, 'w-[72px] text-right')} scope="col">
												Months
											</th>
											<th className={cn(tableThClass, 'min-w-[140px]')} scope="col">
												Status
											</th>
											<th className={cn(tableThClass, 'w-[72px] text-right')} scope="col">
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{streams.map((stream) => (
											<tr
												key={stream.streamKey}
												className="transition-colors hover:[&>td]:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
											>
												<td className={tableTdClass}>
													<div className="flex flex-col gap-0.5">
														<span className="font-medium text-paper-fg">{stream.label}</span>
														<span className="font-mono text-[12px] tabular-nums text-paper-muted">
															{stream.sourceLabel} · {formatMoney(stream.averageAmountDollars)}
														</span>
													</div>
												</td>
												<td className={tableTdClass}>{stream.frequency}</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono font-medium tabular-nums'
													)}
												>
													{formatMoney(stream.estimatedMonthlyDollars)}
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono font-medium tabular-nums'
													)}
												>
													{formatMoney(stream.estimatedYearlyExGstDollars)}
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono font-medium tabular-nums'
													)}
												>
													{formatMoney(stream.estimatedYearlyIncGstDollars)}
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono tabular-nums'
													)}
												>
													{stream.monthsObserved}
												</td>
												<td className={tableTdClass}>
													<IncomeStatusPills stream={stream} />
												</td>
												<td className={cn(tableTdClass, 'text-right')}>
													<button
														type="button"
														className={incomeBtnEditClass}
														onClick={() => openEdit(stream)}
													>
														<Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
														Edit
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</div>

			<IncomeEditDialog
				stream={editing}
				label={label}
				gross={gross}
				grossPeriod={grossPeriod}
				isPrimary={isPrimary}
				isConfirmed={isConfirmed}
				saving={saving}
				saveError={saveError}
				grossPreview={grossPreview}
				onClose={closeEdit}
				onLabelChange={setLabel}
				onGrossChange={setGross}
				onGrossPeriodChange={onGrossPeriodChange}
				onPrimaryChange={setIsPrimary}
				onConfirmedChange={setIsConfirmed}
				onSubmit={(event) => void onSubmit(event)}
			/>
		</PageShell>
	);
}
