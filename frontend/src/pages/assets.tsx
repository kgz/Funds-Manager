import { FormEvent, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { Building2, Edit2, Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';
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
	formatCentsAsDollars,
	isValuationStale,
	parsePositiveDollarsToCents,
	type Asset,
	type AssetKind,
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
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

	useEffect(() => {
		void dispatch(getAssets());
		void dispatch(getLiabilities());
	}, [dispatch]);

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
		const valueCents = parsePositiveDollarsToCents(value);
		if (valueCents === null) {
			setModalError('Enter a value');
			return;
		}

		const payload = {
			name: trimmedName,
			kind,
			value_cents: valueCents,
			valued_at: valuedAt.length >= 10 ? valuedAt : null,
			value_source: valueSource.trim().length > 0 ? valueSource.trim() : null,
			liability_id:
				kind === 'property' && liabilityId.length > 0 ? Number(liabilityId) : null,
			notes: notes.trim().length > 0 ? notes.trim() : null,
		};

		setSubmitting(true);
		setModalError(null);

		const result =
			modalMode === 'add'
				? await dispatch(createAssetThunk(payload))
				: editingItem !== null
					? await dispatch(updateAssetThunk({ id: editingItem.id, payload }))
					: null;

		setSubmitting(false);

		if (result === null) {
			return;
		}

		const thunk = modalMode === 'add' ? createAssetThunk : updateAssetThunk;
		if (thunk.rejected.match(result)) {
			setModalError(readThunkRejectMessage(result, 'Failed to save asset'));
			return;
		}

		closeModal();
		void dispatch(getAssets());
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

							<div>
								<label
									htmlFor="assetValueInput"
									className="mb-1.5 block text-sm font-medium text-white/80"
								>
									Value ($)
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
