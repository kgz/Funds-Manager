import { FormEvent, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import {
	Building2,
	Edit2,
	Loader2,
	Plus,
	Trash2,
	TriangleAlert,
} from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { Modal } from '@/components/layout/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/layout/StatCard';
import {
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	dateInputClass,
	glassCardClass,
	inputDarkClass,
	selectDarkClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getLiabilities } from '@/store/thunks/liabilities';
import {
	createAssetThunk,
	deleteAssetThunk,
	getAssets,
	updateAssetThunk,
} from '@/store/thunks/assets';
import {
	assetKindLabel,
	ASSET_KIND_OPTIONS,
	createAssetValuation,
	deleteAssetValuation,
	fetchAssetValuations,
	formatCentsAsDollars,
	isValuationStale,
	parsePositiveDollarsToCents,
	type Asset,
	type AssetKind,
	type AssetValuation,
} from '@/types/assets';

type ModalMode = 'add' | 'edit';

const ASSET_FORM_ID = 'asset-form';

const formatMoney = (cents: number) =>
	`$${Math.abs(cents / 100).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

function toKind(value: string): AssetKind {
	const match = ASSET_KIND_OPTIONS.find((option) => option.value === value);
	return match ? match.value : 'other';
}

function formatValuedAt(valuedAt: string | null): string {
	if (!valuedAt) {
		return '—';
	}
	const parsed = DateTime.fromISO(valuedAt);
	return parsed.isValid ? parsed.toFormat('d MMM yyyy') : '—';
}

export default function AssetsPage() {
	const dispatch = useAppDispatch();
	const { items, totalValueCents, loading, error } = useAppSelector(
		(state) => state.AssetsReducer
	);
	const liabilities = useAppSelector((state) => state.LiabilitiesReducer.items);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>('add');
	const [editingItem, setEditingItem] = useState<Asset | null>(null);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<AssetKind>('property');
	const [value, setValue] = useState('');
	const [valuedAt, setValuedAt] = useState('');
	const [valueSource, setValueSource] = useState('');
	const [liabilityId, setLiabilityId] = useState('');
	const [notes, setNotes] = useState('');
	const [purchasePrice, setPurchasePrice] = useState('');
	const [purchaseDate, setPurchaseDate] = useState('');
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [valuations, setValuations] = useState<AssetValuation[]>([]);
	const [valuationsLoading, setValuationsLoading] = useState(false);
	const [valDate, setValDate] = useState('');
	const [valAmount, setValAmount] = useState('');
	const [valSource, setValSource] = useState('');
	const [valSubmitting, setValSubmitting] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

	useEffect(() => {
		void dispatch(getAssets());
		void dispatch(getLiabilities());
	}, [dispatch]);

	const resetValuationForm = () => {
		setValDate(DateTime.now().toISODate() ?? '');
		setValAmount('');
		setValSource('');
	};

	const loadValuations = async (assetId: string) => {
		setValuationsLoading(true);
		try {
			setValuations(await fetchAssetValuations(assetId));
		} catch {
			setValuations([]);
		} finally {
			setValuationsLoading(false);
		}
	};

	const openAddModal = () => {
		setModalMode('add');
		setEditingItem(null);
		setName('');
		setKind('property');
		setValue('');
		setValuedAt(DateTime.now().toISODate() ?? '');
		setValueSource('');
		setLiabilityId('');
		setNotes('');
		setPurchasePrice('');
		setPurchaseDate('');
		setValuations([]);
		setModalError(null);
		setModalOpen(true);
	};

	const openEditModal = (item: Asset) => {
		setModalMode('edit');
		setEditingItem(item);
		setName(item.name);
		setKind(item.kind);
		setValue(formatCentsAsDollars(item.value_cents));
		setValuedAt(item.valued_at ?? '');
		setValueSource(item.value_source ?? '');
		setLiabilityId(item.liability_id ?? '');
		setNotes(item.notes ?? '');
		setValuations([]);
		resetValuationForm();
		setModalError(null);
		setModalOpen(true);
		void loadValuations(item.id);
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

		const liabilityIdValue =
			kind === 'property' && liabilityId.length > 0 ? Number(liabilityId) : null;
		const notesValue = notes.trim().length > 0 ? notes.trim() : null;

		// Edit only touches metadata; value is managed through the valuation history.
		if (modalMode === 'edit' && editingItem !== null) {
			const payload = {
				name: trimmedName,
				kind,
				value_cents: editingItem.value_cents,
				valued_at: editingItem.valued_at,
				value_source: editingItem.value_source,
				liability_id: liabilityIdValue,
				notes: notesValue,
			};
			setSubmitting(true);
			setModalError(null);
			const result = await dispatch(updateAssetThunk({ id: editingItem.id, payload }));
			setSubmitting(false);
			if (updateAssetThunk.rejected.match(result)) {
				setModalError(readThunkRejectMessage(result, 'Failed to save asset'));
				return;
			}
			closeModal();
			void dispatch(getAssets());
			return;
		}

		const valueCents = parsePositiveDollarsToCents(value);
		if (valueCents === null) {
			setModalError('Enter a value');
			return;
		}

		let purchasePriceCents: number | null = null;
		if (purchasePrice.trim().length > 0) {
			purchasePriceCents = parsePositiveDollarsToCents(purchasePrice);
			if (purchasePriceCents === null) {
				setModalError('Enter a valid purchase price');
				return;
			}
			if (purchaseDate.length < 10) {
				setModalError('Enter a purchase date');
				return;
			}
		}

		const payload = {
			name: trimmedName,
			kind,
			value_cents: valueCents,
			valued_at: valuedAt.length >= 10 ? valuedAt : null,
			value_source: valueSource.trim().length > 0 ? valueSource.trim() : null,
			liability_id: liabilityIdValue,
			notes: notesValue,
			purchase_price_cents: purchasePriceCents,
			purchase_date:
				purchasePriceCents !== null && purchaseDate.length >= 10 ? purchaseDate : null,
		};

		setSubmitting(true);
		setModalError(null);

		const result = await dispatch(createAssetThunk(payload));

		setSubmitting(false);

		if (createAssetThunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save asset'));
			return;
		}

		closeModal();
		void dispatch(getAssets());
	};

	const onAddValuation = async () => {
		if (editingItem === null) {
			return;
		}
		const amountCents = parsePositiveDollarsToCents(valAmount);
		if (amountCents === null) {
			setModalError('Enter a valuation amount');
			return;
		}
		if (valDate.length < 10) {
			setModalError('Enter a valuation date');
			return;
		}
		setValSubmitting(true);
		setModalError(null);
		try {
			await createAssetValuation(editingItem.id, {
				value_cents: amountCents,
				valued_at: valDate,
				source: valSource.trim().length > 0 ? valSource.trim() : null,
			});
			resetValuationForm();
			await loadValuations(editingItem.id);
			void dispatch(getAssets());
		} catch {
			setModalError('Failed to add valuation');
		} finally {
			setValSubmitting(false);
		}
	};

	const onRemoveValuation = async (valuationId: string) => {
		if (editingItem === null) {
			return;
		}
		setValSubmitting(true);
		setModalError(null);
		try {
			await deleteAssetValuation(editingItem.id, valuationId);
			await loadValuations(editingItem.id);
			void dispatch(getAssets());
		} catch {
			setModalError('Failed to remove valuation');
		} finally {
			setValSubmitting(false);
		}
	};

	const onConfirmDelete = async () => {
		if (deleteTarget === null) {
			return;
		}
		setSubmitting(true);
		const result = await dispatch(deleteAssetThunk(deleteTarget.id));
		setSubmitting(false);

		if (deleteAssetThunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to delete asset'));
			return;
		}

		closeDeleteModal();
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;
	const showEmpty = !loading && items.length === 0 && error === null;

	if (initialLoading) {
		return <PageLoadingState label="Loading assets…" />;
	}

	if (error !== null && items.length === 0) {
		return (
			<ErrorState
				title="Could not load assets"
				message={error}
				onRetry={() => void dispatch(getAssets())}
			/>
		);
	}

	return (
		<PageShell variant="table">
			<div className="space-y-3 border-b border-white/10 p-4">
				<PageHeader
					title="Assets"
					subtitle="What you own — property, vehicles, super, and balances held outside the app."
					icon={<Building2 className="h-6 w-6 text-secondary-default" />}
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
						<button type="button" className={buttonPrimaryClass} onClick={openAddModal}>
							<Plus size="1rem" className="inline-block mr-1" />
							Add asset
						</button>
					}
				/>

				<div className="flex justify-end">
					<StatCard
						label="Total value"
						value={formatMoney(totalValueCents)}
						valueClassName="text-green-300"
						hint="Sum of all asset values."
						align="right"
					/>
				</div>

				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}
			</div>

			{showEmpty ? (
				<EmptyState
					icon={Building2}
					title="No assets yet"
					description="Add property, vehicles, super and external balances to build your net worth."
					action={
						<button type="button" className={buttonPrimaryClass} onClick={openAddModal}>
							<Plus size="1rem" className="inline-block mr-1" />
							Add asset
						</button>
					}
				/>
			) : null}

			{!loading && items.length > 0 ? (
				<div className={glassCardClass}>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-white/10 text-left text-white/50">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Type</th>
								<th className="px-4 py-3 font-medium text-right">Value</th>
								<th className="px-4 py-3 font-medium">Valued</th>
								<th className="px-4 py-3 font-medium">Source</th>
								<th className="px-4 py-3 font-medium" />
							</tr>
						</thead>
						<tbody>
							{items.map((item) => {
								const stale = isValuationStale(item.valued_at);
								return (
									<tr key={item.id} className="border-b border-white/5 text-white/90">
										<td className="px-4 py-3 font-medium">{item.name}</td>
										<td className="px-4 py-3">
											<span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/70">
												{assetKindLabel(item.kind)}
											</span>
										</td>
										<td className="px-4 py-3 text-right font-mono tabular-nums text-green-300">
											{formatMoney(item.value_cents)}
										</td>
										<td className="px-4 py-3 text-white/70">
											<span className="inline-flex items-center gap-1.5">
												{formatValuedAt(item.valued_at)}
												{stale ? (
													<span
														className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.65rem] text-amber-300"
														title="Valuation is missing or older than 12 months"
													>
														<TriangleAlert size="0.7rem" />
														Stale
													</span>
												) : null}
											</span>
										</td>
										<td className="max-w-[14rem] truncate px-4 py-3 text-white/60">
											{item.value_source ?? '—'}
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

			<Modal
				open={modalOpen}
				onClose={closeModal}
				closeDisabled={submitting}
				title={modalMode === 'add' ? 'Add asset' : 'Edit asset'}
				description="Record what you own and how it was valued."
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
							form={ASSET_FORM_ID}
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
				<form id={ASSET_FORM_ID} onSubmit={onSubmit}>
					{modalError !== null ? (
						<InlineAlert variant="error" className="mb-4">
							{modalError}
						</InlineAlert>
					) : null}

					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="assetNameInput"
									className="mb-1.5 block text-sm font-medium text-white/80"
								>
									Name
								</label>
								<input
									id="assetNameInput"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className={cn(inputDarkClass, 'w-full px-3 py-2')}
									placeholder="e.g. 123 Main St"
									autoFocus
									disabled={submitting}
									required
								/>
							</div>

							<div>
								<label
									htmlFor="assetKindInput"
									className="mb-1.5 block text-sm font-medium text-white/80"
								>
									Type
								</label>
								<select
									id="assetKindInput"
									value={kind}
									onChange={(e) => setKind(toKind(e.target.value))}
									className={cn(selectDarkClass, 'w-full')}
									disabled={submitting}
								>
									{ASSET_KIND_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							{modalMode === 'add' ? (
								<>
									<div>
										<label
											htmlFor="assetValueInput"
											className="mb-1.5 block text-sm font-medium text-white/80"
										>
											Current value ($)
										</label>
										<input
											id="assetValueInput"
											type="text"
											inputMode="decimal"
											value={value}
											onChange={(e) => setValue(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
											placeholder="0.00"
											disabled={submitting}
											required
										/>
									</div>

									<div>
										<label
											htmlFor="assetValuedAtInput"
											className="mb-1.5 block text-sm font-medium text-white/80"
										>
											Valued as at (optional)
										</label>
										<input
											id="assetValuedAtInput"
											type="date"
											value={valuedAt}
											onChange={(e) => setValuedAt(e.target.value)}
											className={cn(dateInputClass, 'w-full px-3 py-2')}
											disabled={submitting}
										/>
									</div>

									<div className="sm:col-span-2">
										<label
											htmlFor="assetSourceInput"
											className="mb-1.5 block text-sm font-medium text-white/80"
										>
											Valuation source (optional)
										</label>
										<input
											id="assetSourceInput"
											type="text"
											value={valueSource}
											onChange={(e) => setValueSource(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-3 py-2')}
											placeholder="e.g. council rates notice, owner estimate"
											disabled={submitting}
										/>
									</div>

									<div>
										<label
											htmlFor="assetPurchasePriceInput"
											className="mb-1.5 block text-sm font-medium text-white/80"
										>
											Bought at ($, optional)
										</label>
										<input
											id="assetPurchasePriceInput"
											type="text"
											inputMode="decimal"
											value={purchasePrice}
											onChange={(e) => setPurchasePrice(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-3 py-2 font-mono')}
											placeholder="0.00"
											disabled={submitting}
										/>
									</div>

									<div>
										<label
											htmlFor="assetPurchaseDateInput"
											className="mb-1.5 block text-sm font-medium text-white/80"
										>
											Purchase date
										</label>
										<input
											id="assetPurchaseDateInput"
											type="date"
											value={purchaseDate}
											onChange={(e) => setPurchaseDate(e.target.value)}
											className={cn(dateInputClass, 'w-full px-3 py-2')}
											disabled={submitting}
										/>
									</div>
								</>
							) : null}

							{kind === 'property' ? (
								<div className="sm:col-span-2">
									<label
										htmlFor="assetLiabilityInput"
										className="mb-1.5 block text-sm font-medium text-white/80"
									>
										Linked loan (optional)
									</label>
									<select
										id="assetLiabilityInput"
										value={liabilityId}
										onChange={(e) => setLiabilityId(e.target.value)}
										className={cn(selectDarkClass, 'w-full')}
										disabled={submitting}
									>
										<option value="">None</option>
										{liabilities.map((liability) => (
											<option key={liability.id} value={liability.id}>
												{liability.name}
											</option>
										))}
									</select>
								</div>
							) : null}
						</div>

						<div>
							<label
								htmlFor="assetNotesInput"
								className="mb-1.5 block text-sm font-medium text-white/80"
							>
								Notes (optional)
							</label>
							<textarea
								id="assetNotesInput"
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

						{modalMode === 'edit' ? (
							<div className="rounded-lg border border-white/10 bg-white/5 p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-sm font-medium text-white/80">
										Valuation history
									</span>
									{valuationsLoading ? (
										<Loader2 className="h-4 w-4 animate-spin text-secondary-default" />
									) : null}
								</div>

								{!valuationsLoading && valuations.length === 0 ? (
									<p className="text-xs text-white/50">No valuations recorded yet.</p>
								) : null}

								{valuations.length > 0 ? (
									<ul className="mb-3 space-y-1.5">
										{valuations.map((entry) => (
											<li
												key={entry.id}
												className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-sm"
											>
												<span className="text-white/70">
													{formatValuedAt(entry.valued_at)}
												</span>
												<span className="font-mono tabular-nums text-green-300">
													{formatMoney(entry.value_cents)}
												</span>
												<span className="flex-1 truncate text-xs text-white/40">
													{entry.source ?? ''}
												</span>
												<button
													type="button"
													className="text-white/40 transition hover:text-red-300"
													onClick={() => void onRemoveValuation(entry.id)}
													disabled={valSubmitting}
													aria-label="Remove valuation"
												>
													<Trash2 size="0.9rem" />
												</button>
											</li>
										))}
									</ul>
								) : null}

								<div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
									<div>
										<label
											htmlFor="valDateInput"
											className="mb-1 block text-xs text-white/60"
										>
											Date
										</label>
										<input
											id="valDateInput"
											type="date"
											value={valDate}
											onChange={(e) => setValDate(e.target.value)}
											className={cn(dateInputClass, 'w-full px-2 py-1.5 text-sm')}
											disabled={valSubmitting}
										/>
									</div>
									<div>
										<label
											htmlFor="valAmountInput"
											className="mb-1 block text-xs text-white/60"
										>
											Value ($)
										</label>
										<input
											id="valAmountInput"
											type="text"
											inputMode="decimal"
											value={valAmount}
											onChange={(e) => setValAmount(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-2 py-1.5 font-mono text-sm')}
											placeholder="0.00"
											disabled={valSubmitting}
										/>
									</div>
									<div>
										<label
											htmlFor="valSourceInput"
											className="mb-1 block text-xs text-white/60"
										>
											Source (optional)
										</label>
										<input
											id="valSourceInput"
											type="text"
											value={valSource}
											onChange={(e) => setValSource(e.target.value)}
											className={cn(inputDarkClass, 'w-full px-2 py-1.5 text-sm')}
											placeholder="e.g. agent appraisal"
											disabled={valSubmitting}
										/>
									</div>
									<button
										type="button"
										className={cn(buttonOutlineClass, 'justify-center')}
										onClick={() => void onAddValuation()}
										disabled={valSubmitting}
									>
										{valSubmitting ? (
											<Loader2 className="inline-block h-4 w-4 animate-spin" />
										) : (
											<>
												<Plus size="0.9rem" className="mr-1 inline-block" />
												Add
											</>
										)}
									</button>
								</div>
							</div>
						) : null}
					</div>
				</form>
			</Modal>

			<Modal
				open={deleteTarget !== null}
				onClose={closeDeleteModal}
				closeDisabled={submitting}
				title="Delete asset"
				description={
					deleteTarget !== null
						? `Remove “${deleteTarget.name}” from assets?`
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
