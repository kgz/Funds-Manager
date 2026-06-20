import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { HandCoins, Loader2, Pencil } from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import { buttonOutlineClass, buttonPrimaryClass, inputDarkClass, selectDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { formatTransactionDate } from '@/lib/utils/dates';
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

export function IncomePage() {
	const { accountIdNumber } = useAccountFilter();
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

	return (
		<PageShell>
			<PageHeader
				title="Income"
				subtitle="Detected salary and regular credits for broker verification."
				actions={<AccountFilter />}
			/>

			<InlineAlert variant="info" className="mb-6">
				<p>
					<strong className="font-medium text-white/90">Detected amounts are what hits your bank</strong>{' '}
					(after PAYG tax), not your gross employment package. A $125k/year salary might show as
					~$94k/year here — that gap is normal tax withholding, not a detection error.
				</p>
				<p className="mt-2">
					For your contract figure (e.g. $125k package), use <strong className="font-medium text-white/90">Edit</strong>{' '}
					→ enter the package ex GST per week, month, or year.{' '}
					<strong className="font-medium text-white/90">Inc GST</strong> applies to business invoices only;
					wages are not GST-inclusive.
				</p>
			</InlineAlert>

			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			{loading ? <PageLoadingState label="Detecting income streams…" /> : null}

			{!loading && summary !== null ? (
				<>
					<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatCard label="Est. monthly income" value={formatMoney(summary.totalMonthlyDollars)} />
						<StatCard
							label="Est. yearly (ex GST)"
							value={formatMoney(summary.totalYearlyExGstDollars)}
						/>
						<StatCard
							label="Est. yearly (inc GST)"
							value={formatMoney(summary.totalYearlyIncGstDollars)}
						/>
						<StatCard label="Streams detected" value={String(summary.streams.length)} />
					</div>

					{summary.streams.length === 0 ? (
						<EmptyState
							icon={HandCoins}
							title="No income streams detected"
							description="Import statements with regular credits (e.g. salary) — at least 3 occurrences are needed."
						/>
					) : (
						<div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
							<table className="w-full min-w-[72rem] text-sm">
								<thead>
									<tr className="border-b border-white/10 text-left text-white/50">
										<th className="px-4 py-3 font-medium">Source</th>
										<th className="px-4 py-3 font-medium">Frequency</th>
										<th className="px-4 py-3 font-medium text-right">Est. monthly</th>
										<th className="px-4 py-3 font-medium text-right">Yearly ex GST</th>
										<th className="px-4 py-3 font-medium text-right">Yearly inc GST</th>
										<th className="px-4 py-3 font-medium text-right">Months</th>
										<th className="px-4 py-3 font-medium">Status</th>
										<th className="px-4 py-3 font-medium" />
									</tr>
								</thead>
								<tbody>
									{summary.streams.map((stream) => (
										<tr key={stream.streamKey} className="border-b border-white/5 text-white/90">
											<td className="px-4 py-3">
												<div className="font-medium">{stream.label}</div>
												{stream.label !== stream.sourceLabel ? (
													<div className="text-xs text-white/45">{stream.sourceLabel}</div>
												) : null}
												<div className="text-xs text-white/40">
													{formatTransactionDate(stream.firstDate)} –{' '}
													{formatTransactionDate(stream.lastDate)}
												</div>
												{stream.grossYearlyExGstDollars != null ? (
													<div className="mt-1 text-xs text-white/45">
														Package yearly ex GST:{' '}
														{formatMoney(stream.grossYearlyExGstDollars)}
														{stream.grossYearlyIncGstDollars != null
															? ` · inc GST: ${formatMoney(stream.grossYearlyIncGstDollars)}`
															: ''}
													</div>
												) : null}
											</td>
											<td className="px-4 py-3">{stream.frequency}</td>
											<td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300/90">
												{formatMoney(stream.estimatedMonthlyDollars)}
											</td>
											<td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300/90">
												{formatMoney(stream.estimatedYearlyExGstDollars)}
											</td>
											<td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300/80">
												{formatMoney(stream.estimatedYearlyIncGstDollars)}
											</td>
											<td className="px-4 py-3 text-right tabular-nums">
												{stream.monthsObserved}
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap gap-1.5">
													{stream.isPrimary ? (
														<span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
															Primary
														</span>
													) : null}
													{stream.isConfirmed ? (
														<span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
															Confirmed
														</span>
													) : null}
													{stream.isIrregular ? (
														<span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
															Variable
														</span>
													) : null}
												</div>
											</td>
											<td className="px-4 py-3 text-right">
												<button
													type="button"
													className={buttonOutlineClass}
													onClick={() => openEdit(stream)}
												>
													<Pencil size="0.875rem" className="mr-1 inline" />
													Edit
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			) : null}

			<Modal
				open={editing !== null}
				onClose={closeEdit}
				closeDisabled={saving}
				title="Edit income stream"
				description="Confirm and label streams for broker reports."
				footer={
					<>
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeEdit}
							disabled={saving}
						>
							Cancel
						</button>
						<button
							type="submit"
							form="income-stream-form"
							className={cn(buttonPrimaryClass, 'min-w-[5rem]')}
							disabled={saving}
						>
							{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
						</button>
					</>
				}
			>
				<form id="income-stream-form" onSubmit={onSubmit} className="space-y-4">
					{saveError !== null ? (
						<InlineAlert variant="error">{saveError}</InlineAlert>
					) : null}
					<div>
						<label htmlFor="incomeLabel" className="mb-1.5 block text-sm text-white/80">
							Display label
						</label>
						<input
							id="incomeLabel"
							className={cn(inputDarkClass, 'w-full px-3 py-2')}
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							disabled={saving}
						/>
					</div>
					<div>
						<label htmlFor="incomeGross" className="mb-1.5 block text-sm text-white/80">
							Package ex GST (optional)
						</label>
						<div className="flex gap-2">
							<input
								id="incomeGross"
								type="text"
								inputMode="decimal"
								className={cn(inputDarkClass, 'min-w-0 flex-1 px-3 py-2 font-mono')}
								value={gross}
								onChange={(e) => setGross(e.target.value)}
								placeholder="Contract or payslip amount"
								disabled={saving}
							/>
							<select
								className={cn(selectDarkClass, 'shrink-0 px-3 py-2')}
								value={grossPeriod}
								onChange={(e) => {
									const next = readPackagePeriod(e.target.value);
									if (next !== null) {
										onGrossPeriodChange(next);
									}
								}}
								disabled={saving}
								aria-label="Package amount period"
							>
								<option value="week" className="bg-gray-950 text-white">
									Per week
								</option>
								<option value="month" className="bg-gray-950 text-white">
									Per month
								</option>
								<option value="year" className="bg-gray-950 text-white">
									Per year
								</option>
							</select>
						</div>
						{grossPreview !== null ? (
							<p className="mt-1.5 text-xs text-white/45">
								Yearly ex GST {formatMoney(grossPreview.exGst)} · inc GST{' '}
								{formatMoney(grossPreview.incGst)}
							</p>
						) : null}
					</div>
					<label className="flex items-center gap-2 text-sm text-white/80">
						<input
							type="checkbox"
							checked={isPrimary}
							onChange={(e) => setIsPrimary(e.target.checked)}
							disabled={saving}
						/>
						Primary income
					</label>
					<label className="flex items-center gap-2 text-sm text-white/80">
						<input
							type="checkbox"
							checked={isConfirmed}
							onChange={(e) => setIsConfirmed(e.target.checked)}
							disabled={saving}
						/>
						Confirmed by me
					</label>
				</form>
			</Modal>
		</PageShell>
	);
}
