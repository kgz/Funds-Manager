import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
	CalendarRange,
	Edit2,
	Loader2,
	Plus,
	Trash2,
} from 'lucide-react';
import { AccountFilter } from '@/components/account-filter';
import { CategoryPill } from '@/components/CategoryPill';
import { PlannedPeriodFilter } from '@/components/dashboard/PlannedPeriodFilter';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { StatCard } from '@/components/layout/StatCard';
import {
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	glassCardClass,
	inputDarkClass,
	dateInputClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import {
	PLANNED_CUSTOM_RANGE_STORAGE_KEY,
	PLANNED_PERIOD_STORAGE_KEY,
	PLANNED_RANGE_MODE_STORAGE_KEY,
	plannedPeriodDateRange,
	readStoredPlannedPeriod,
	type PlannedPeriod,
} from '@/components/dashboard/period';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import {
	createPlannedSpending,
	deletePlannedSpending,
	getPlannedSpending,
	updatePlannedSpending,
} from '@/store/thunks/plannedSpending';
import {
	centsToDollars,
	dollarsToCents,
	parsePlannedAmountInput,
	plannedAmountTypeFromCents,
	signedPlannedAmountCents,
	type PlannedAmountType,
	type PlannedSpendingItem,
} from '@/types/plannedSpending';

type PlannedRangeMode = 'preset' | 'custom';
type ModalMode = 'add' | 'edit';

const PLANNED_FORM_ID = 'planned-spending-form';

const formatMoney = (cents: number) => {
	const abs = Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${cents < 0 ? '-' : ''}$${abs}`;
};

function formatPlannedDate(isoDate: string): string {
	return DateTime.fromISO(isoDate).toFormat('d MMM yyyy');
}

function defaultCustomRange(): { start: string; end: string } {
	const start = DateTime.now().toISODate();
	const end = DateTime.now().endOf('year').toISODate();
	return {
		start: start ?? '',
		end: end ?? '',
	};
}

function readPlannedRangeMode(): PlannedRangeMode {
	const stored = localStorage.getItem(PLANNED_RANGE_MODE_STORAGE_KEY);
	return stored === 'custom' ? 'custom' : 'preset';
}

function readCustomRange(): { start: string; end: string } {
	try {
		const raw = localStorage.getItem(PLANNED_CUSTOM_RANGE_STORAGE_KEY);
		if (raw === null) {
			return defaultCustomRange();
		}
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'start' in parsed &&
			'end' in parsed
		) {
			const start = Reflect.get(parsed, 'start');
			const end = Reflect.get(parsed, 'end');
			if (typeof start === 'string' && typeof end === 'string') {
				return { start, end };
			}
		}
	} catch {
		// ignore
	}
	return defaultCustomRange();
}

function categoryById(
	categories: Category[],
	categoryId: string | null
): Category | null {
	if (categoryId === null) {
		return null;
	}
	return categories.find((cat) => cat.id === categoryId) ?? null;
}

function categoryLabel(cat: Category, categories: Category[]): string {
	if (cat.parent_category_id) {
		const parent = categories.find((p) => p.id === cat.parent_category_id);
		if (parent) {
			return `${parent.name} › ${cat.name}`;
		}
	}
	return cat.name;
}

export default function PlannedSpendingPage() {
	const dispatch = useAppDispatch();
	const { items, totalCents, loading, error } = useAppSelector(
		(state) => state.PlannedReducer
	);
	const { categories } = useAppSelector((state) => state.CategoryReducer);

	const [rangeMode, setRangeMode] = useState<PlannedRangeMode>(readPlannedRangeMode);
	const [period, setPeriod] = useState<PlannedPeriod>(readStoredPlannedPeriod);
	const [customRange, setCustomRange] = useState(readCustomRange);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingItem, setEditingItem] = useState<PlannedSpendingItem | null>(null);
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [amountType, setAmountType] = useState<PlannedAmountType>('spending');
	const [plannedDate, setPlannedDate] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [notes, setNotes] = useState('');
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<PlannedSpendingItem | null>(null);

	const activeCategories = useMemo(
		() => categories.filter((cat) => !cat.deleted_at),
		[categories]
	);

	const effectiveRange = useMemo(() => {
		if (rangeMode === 'custom') {
			return customRange;
		}
		const preset = plannedPeriodDateRange(period);
		return {
			start: preset.start ?? '',
			end: preset.end ?? '',
		};
	}, [rangeMode, period, customRange]);

	const { start, end } = effectiveRange;
	const showAllItems =
		rangeMode === 'preset' && period === 'all';
	const showFutureOnly =
		rangeMode === 'preset' && period === 'future';
	const rangeInvalid =
		showAllItems
			? false
			: start.length < 10 ||
				(!showFutureOnly &&
					(end.length < 10 || start > end));

	useEffect(() => {
		localStorage.setItem(PLANNED_RANGE_MODE_STORAGE_KEY, rangeMode);
	}, [rangeMode]);

	useEffect(() => {
		if (rangeMode === 'preset') {
			localStorage.setItem(PLANNED_PERIOD_STORAGE_KEY, period);
		}
	}, [rangeMode, period]);

	useEffect(() => {
		if (rangeMode === 'custom') {
			localStorage.setItem(
				PLANNED_CUSTOM_RANGE_STORAGE_KEY,
				JSON.stringify(customRange)
			);
		}
	}, [rangeMode, customRange]);

	useEffect(() => {
		void dispatch(getAllCategories({ withCounts: false }));
	}, [dispatch]);

	const reload = useCallback(() => {
		if (rangeInvalid) {
			return;
		}
		void dispatch(
			getPlannedSpending(
				showAllItems
					? {}
					: showFutureOnly
						? { from: start }
						: { from: start, to: end }
			)
		);
	}, [dispatch, rangeInvalid, showAllItems, showFutureOnly, start, end]);

	useEffect(() => {
		reload();
	}, [reload]);

	const openAddModal = () => {
		setModalMode('add');
		setEditingItem(null);
		setName('');
		setAmount('');
		setAmountType('spending');
		setPlannedDate(DateTime.now().toISODate() ?? '');
		setCategoryId('');
		setNotes('');
		setModalError(null);
		setModalOpen(true);
	};

	const openEditModal = (item: PlannedSpendingItem) => {
		setModalMode('edit');
		setEditingItem(item);
		setName(item.name);
		setAmount(centsToDollars(Math.abs(item.amount_cents)));
		setAmountType(plannedAmountTypeFromCents(item.amount_cents));
		setPlannedDate(item.start_date);
		setCategoryId(item.category_id ?? '');
		setNotes(item.notes ?? '');
		setModalError(null);
		setModalOpen(true);
	};

	const closeModal = () => {
		if (submitting) {
			return;
		}
		setModalOpen(false);
		setEditingItem(null);
		setModalError(null);
	};

	const closeDeleteModal = () => {
		if (submitting) {
			return;
		}
		setDeleteTarget(null);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setModalError('Name is required');
			return;
		}
		const magnitudeCents = dollarsToCents(amount);
		if (magnitudeCents === null) {
			setModalError('Enter a non-zero amount');
			return;
		}
		const amountCents = signedPlannedAmountCents(magnitudeCents, amountType);
		if (plannedDate.length < 10) {
			setModalError('Date is required');
			return;
		}

		let categoryIdPayload: number | null = null;
		if (categoryId.length > 0) {
			const parsed = Number(categoryId);
			if (!Number.isFinite(parsed)) {
				setModalError('Invalid category');
				return;
			}
			categoryIdPayload = parsed;
		}

		const trimmedNotes = notes.trim();
		const notesPayload = trimmedNotes.length > 0 ? trimmedNotes : null;

		setSubmitting(true);
		setModalError(null);

		const result =
			modalMode === 'add'
				? await dispatch(
						createPlannedSpending({
							name: trimmedName,
							amount_cents: amountCents,
							start_date: plannedDate,
							category_id: categoryIdPayload,
							notes: notesPayload,
						})
					)
				: editingItem !== null
					? await dispatch(
							updatePlannedSpending({
								id: editingItem.id,
								payload: {
									name: trimmedName,
									amount_cents: amountCents,
									start_date: plannedDate,
									end_date: null,
									category_id: categoryIdPayload,
									notes: notesPayload,
								},
							})
						)
					: null;

		setSubmitting(false);

		if (result === null) {
			return;
		}

		const thunk =
			modalMode === 'add' ? createPlannedSpending : updatePlannedSpending;
		if (thunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save planned item'));
			return;
		}

		closeModal();
		reload();
	};

	const onConfirmDelete = async () => {
		if (deleteTarget === null) {
			return;
		}
		setSubmitting(true);
		const result = await dispatch(deletePlannedSpending(deleteTarget.id));
		setSubmitting(false);

		if (deletePlannedSpending.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to delete planned item'));
			return;
		}

		closeDeleteModal();
		reload();
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;
	const showEmpty =
		!loading && !rangeInvalid && items.length === 0 && error === null;

	if (initialLoading) {
		return <PageLoadingState label="Loading planned spending…" />;
	}

	if (error !== null && items.length === 0) {
		return (
			<ErrorState
				title="Could not load planned spending"
				message={error}
				onRetry={reload}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<div className="shrink-0 space-y-3 border-b border-white/10 p-4">
				<PageHeader
					title="Planned spending"
					subtitle="Upcoming expenses you expect but have not recorded yet. Items are global — the account filter does not apply here."
					icon={<CalendarRange className="h-6 w-6 text-secondary-default" />}
					className="mb-0"
					pending={isRefreshing}
					meta={
						loading ? (
							<Loader2
								className="h-4 w-4 animate-spin text-secondary-default"
								aria-label="Loading"
							/>
						) : null
					}
					actions={
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={openAddModal}
						>
							<Plus size="1rem" className="inline-block mr-1" />
							Add planned item
						</button>
					}
				/>

				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-h-9 flex-wrap items-center gap-3">
						<AccountFilter />
						<SegmentedControl
							ariaLabel="Date range mode"
							value={rangeMode}
							onChange={setRangeMode}
							options={[
								{ value: 'preset', label: 'Presets' },
								{ value: 'custom', label: 'Custom' },
							]}
						/>
						{rangeMode === 'preset' ? (
							<PlannedPeriodFilter
								value={period}
								onChange={setPeriod}
								pending={loading}
								ariaLabel="Planned spending period"
							/>
						) : (
							<div className="flex flex-wrap items-center gap-2">
								<input
									type="date"
									aria-label="From date"
									value={customRange.start}
									onChange={(e) =>
										setCustomRange((r) => ({
											...r,
											start: e.target.value,
										}))
									}
									className={cn(dateInputClass, 'px-2 py-1.5')}
								/>
								<span className="text-sm text-white/40">–</span>
								<input
									type="date"
									aria-label="To date"
									value={customRange.end}
									onChange={(e) =>
										setCustomRange((r) => ({
											...r,
											end: e.target.value,
										}))
									}
									className={cn(dateInputClass, 'px-2 py-1.5')}
								/>
								<button
									type="button"
									onClick={() => setCustomRange(defaultCustomRange())}
									className={buttonOutlineClass}
								>
									Reset
								</button>
							</div>
						)}
					</div>

					{!rangeInvalid ? (
						<StatCard
							label="Planned total"
							value={formatMoney(totalCents)}
							valueClassName={
								totalCents >= 0 ? 'text-green-300' : 'text-red-300'
							}
							hint={
								showAllItems
									? 'All planned items.'
									: showFutureOnly
										? 'Items dated today or later.'
										: 'Items dated in this period.'
							}
							align="right"
						/>
					) : null}
				</div>

				{rangeInvalid ? (
					<InlineAlert variant="warning">
						Choose a valid date range (from on or before to).
					</InlineAlert>
				) : null}

				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}
			</div>

			<div className="min-h-0 flex-grow overflow-auto p-4">
			{showEmpty ? (
				<EmptyState
					icon={CalendarRange}
					title="No planned spending"
					description="Add upcoming expenses to track what you expect to spend in this period."
					action={
						<button
							type="button"
							className={buttonPrimaryClass}
							onClick={openAddModal}
						>
							<Plus size="1rem" className="inline-block mr-1" />
							Add planned item
						</button>
					}
				/>
			) : null}

			{!loading && !rangeInvalid && items.length > 0 ? (
				<div className={glassCardClass}>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-white/10 text-left text-white/50">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium text-right">Amount</th>
								<th className="px-4 py-3 font-medium">Date</th>
								<th className="px-4 py-3 font-medium">Category</th>
								<th className="px-4 py-3 font-medium">Notes</th>
								<th className="px-4 py-3 font-medium" />
							</tr>
						</thead>
						<tbody>
							{items.map((item) => {
								const cat = categoryById(activeCategories, item.category_id);
								return (
									<tr
										key={item.id}
										className="border-b border-white/5 text-white/90"
									>
										<td className="px-4 py-3 font-medium">{item.name}</td>
										<td
											className={cn(
												'px-4 py-3 text-right font-mono tabular-nums',
												item.amount_cents >= 0
													? 'text-green-400'
													: 'text-red-400'
											)}
										>
											{formatMoney(item.amount_cents)}
										</td>
										<td className="px-4 py-3 text-white/70">
											{formatPlannedDate(item.start_date)}
										</td>
										<td className="px-4 py-3">
											{cat ? (
												<CategoryPill
													name={categoryLabel(cat, activeCategories)}
													colour={cat.colour}
												/>
											) : (
												<span className="text-white/40">—</span>
											)}
										</td>
										<td className="max-w-[14rem] truncate px-4 py-3 text-white/60">
											{item.notes ?? '—'}
										</td>
										<td className="px-4 py-3 text-right whitespace-nowrap">
											<button
												type="button"
												className={cn(buttonOutlineClass, 'mr-2')}
												onClick={() => openEditModal(item)}
											>
												<Edit2 size="1rem" className="inline-block mr-1" />
												Edit
											</button>
											<button
												type="button"
												className={buttonDangerClass}
												onClick={() => setDeleteTarget(item)}
											>
												<Trash2 size="1rem" className="inline-block mr-1" />
												Delete
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
			</div>

			<Modal
				open={modalOpen}
				onClose={closeModal}
				closeDisabled={submitting}
				title={modalMode === 'add' ? 'Add planned item' : 'Edit planned item'}
				description="When you expect this spend to occur."
				size="md"
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							form={PLANNED_FORM_ID}
							className={buttonPrimaryClass}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : modalMode === 'add' ? (
								'Add'
							) : (
								'Save'
							)}
						</button>
					</div>
				}
			>
				<form id={PLANNED_FORM_ID} onSubmit={onSubmit}>
					{modalError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{modalError}
						</InlineAlert>
					) : null}

					<div className="space-y-4">
						<div>
							<label
								htmlFor="plannedNameInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Name
							</label>
							<input
								id="plannedNameInput"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={cn(inputDarkClass, 'w-full px-3 py-2')}
								placeholder="e.g. Holiday, Car service"
								autoFocus
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
								<label
									htmlFor="plannedAmountInput"
									className="text-sm font-medium text-white/80"
								>
									Amount ($)
								</label>
								<SegmentedControl
									ariaLabel="Planned amount type"
									value={amountType}
									onChange={setAmountType}
									options={[
										{
											value: 'spending',
											label: 'Spending',
											activeClassName:
												'bg-red-500/20 text-red-400 shadow-sm',
											inactiveClassName:
												'text-white/70 hover:bg-red-500/10 hover:text-red-300',
										},
										{
											value: 'income',
											label: 'Income',
											activeClassName:
												'bg-green-500/20 text-green-400 shadow-sm',
											inactiveClassName:
												'text-white/70 hover:bg-green-500/10 hover:text-green-300',
										},
									]}
								/>
							</div>
							<input
								id="plannedAmountInput"
								type="text"
								inputMode="decimal"
								value={amount}
								onChange={(e) => {
									const parsed = parsePlannedAmountInput(
										e.target.value,
										amountType
									);
									setAmount(parsed.value);
									setAmountType(parsed.type);
								}}
								onBlur={() => {
									const magnitudeCents = dollarsToCents(amount);
									if (magnitudeCents !== null) {
										setAmount(
											centsToDollars(Math.abs(magnitudeCents))
										);
									}
								}}
								className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
								placeholder="0.00"
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<label
								htmlFor="plannedDateInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Date
							</label>
							<input
								id="plannedDateInput"
								type="date"
								value={plannedDate}
								onChange={(e) => setPlannedDate(e.target.value)}
								className={cn(dateInputClass, 'w-full px-3 py-2')}
								disabled={submitting}
								required
							/>
						</div>

						<div>
							<label
								htmlFor="plannedCategoryInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Category (optional)
							</label>
							<CategoryPicker
								value={categoryId}
								categories={categories}
								onChange={setCategoryId}
								placeholder="None"
								searchable
								variant="form"
								disabled={submitting}
								className="w-full"
							/>
						</div>

						<div>
							<label
								htmlFor="plannedNotesInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Notes (optional)
							</label>
							<textarea
								id="plannedNotesInput"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className={cn(
									inputDarkClass,
									'min-h-[4.5rem] w-full resize-y px-3 py-2'
								)}
								placeholder="Any extra context"
								disabled={submitting}
							/>
						</div>
					</div>
				</form>
			</Modal>

			<Modal
				open={deleteTarget !== null}
				onClose={closeDeleteModal}
				closeDisabled={submitting}
				title="Delete planned item"
				description={
					deleteTarget !== null
						? `Remove “${deleteTarget.name}” from planned spending?`
						: undefined
				}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							className={buttonOutlineClass}
							onClick={closeDeleteModal}
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							type="button"
							className={buttonDangerClass}
							onClick={() => void onConfirmDelete()}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="inline-block h-4 w-4 animate-spin" />
							) : (
								'Delete'
							)}
						</button>
					</div>
				}
			/>
		</PageShell>
	);
}
