import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Check, Loader2, Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import {
	dateInputClass,
	eyebrowClass,
	glassCardClass,
	inputDarkClass,
	pageActionsClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
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

type AssetFormMode = 'add' | 'edit' | null;

const assetBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const assetBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const assetBtnGhostClass =
	'inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

const assetBtnAccentClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-secondary-default/45 bg-secondary-default/10 px-3 text-[13px] font-medium tracking-[0.02em] text-secondary-default transition-colors hover:bg-secondary-default/20 disabled:cursor-not-allowed disabled:opacity-50';

const assetBtnDangerClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-[color-mix(in_oklch,var(--danger)_38%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_6%,var(--surface))] px-3 text-[13px] font-medium tracking-[0.02em] text-[var(--danger)] transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_14%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const assetDialogClass =
	'fixed inset-0 m-auto flex w-[min(480px,calc(100vw-32px))] max-h-[min(680px,calc(100vh-48px))] flex-col overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const assetDialogWideClass =
	'fixed inset-0 m-auto flex w-[min(560px,calc(100vw-32px))] max-h-[min(680px,calc(100vh-48px))] flex-col overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const assetModalBodyClass =
	'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[22px] pb-[18px] pt-3.5 text-[13px] leading-[1.55] text-paper-fg [&_p]:m-0';

const assetModalFieldClass = 'flex flex-col gap-1.5';

const assetModalFieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted';

const assetFormErrorClass =
	'm-0 rounded-paper border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] px-2.5 py-2 text-xs text-[var(--danger)]';

const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

const headerTotalClass =
	'hidden flex-col items-end gap-0.5 rounded-paper border border-paper-border bg-[color-mix(in_oklch,var(--success)_4%,var(--surface))] px-3.5 py-2 sm:flex';

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

function assetCountLabel(count: number): string {
	if (count === 0) {
		return 'No assets recorded';
	}
	return `${count} asset${count === 1 ? '' : 's'}`;
}

function kindPillClass(kind: AssetKind): string {
	switch (kind) {
		case 'property':
			return 'border-[color-mix(in_oklch,oklch(55%_0.1_55)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.1_55)_8%,var(--surface))] text-[oklch(42%_0.08_55)]';
		case 'vehicle':
			return 'border-[color-mix(in_oklch,oklch(55%_0.1_250)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.1_250)_8%,var(--surface))] text-[oklch(42%_0.08_250)]';
		case 'super':
			return 'border-[color-mix(in_oklch,var(--success)_28%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[oklch(40%_0.1_155)]';
		case 'savings':
			return 'border-[color-mix(in_oklch,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))] text-[oklch(42%_0.06_230)]';
		case 'investment':
			return 'border-[color-mix(in_oklch,oklch(55%_0.12_290)_28%,var(--border))] bg-[color-mix(in_oklch,oklch(55%_0.12_290)_8%,var(--surface))] text-[oklch(42%_0.1_290)]';
		default:
			return 'border-paper-border bg-paper text-paper-muted';
	}
}

function AssetKindPill({ kind }: { kind: AssetKind }) {
	return (
		<span
			className={cn(
				'inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-medium tracking-[0.02em] whitespace-nowrap',
				kindPillClass(kind)
			)}
		>
			{assetKindLabel(kind)}
		</span>
	);
}

function StalePill() {
	return (
		<span
			className="inline-flex h-[18px] items-center rounded-full border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] px-1.5 text-[10px] font-medium text-[oklch(45%_0.12_75)]"
			title="Valuation is missing or older than 12 months"
		>
			Stale
		</span>
	);
}

export default function AssetsPage() {
	const dispatch = useAppDispatch();
	const { items, totalValueCents, loading, error } = useAppSelector(
		(state) => state.AssetsReducer
	);
	const liabilities = useAppSelector((state) => state.LiabilitiesReducer.items);

	const [formMode, setFormMode] = useState<AssetFormMode>(null);
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
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	const addDialogRef = useRef<HTMLDialogElement>(null);
	const editDialogRef = useRef<HTMLDialogElement>(null);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void dispatch(getAssets());
		void dispatch(getLiabilities());
	}, [dispatch]);

	useEffect(() => {
		if (!toast) {
			return;
		}
		const timer = window.setTimeout(() => setToast(null), 3200);
		return () => window.clearTimeout(timer);
	}, [toast]);

	useEffect(() => {
		const dialog = addDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (formMode === 'add' && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => nameInputRef.current?.focus());
		} else if (formMode !== 'add' && dialog.open) {
			dialog.close();
		}
	}, [formMode]);

	useEffect(() => {
		const dialog = editDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (formMode === 'edit' && editingItem !== null && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => nameInputRef.current?.focus());
		} else if ((formMode !== 'edit' || editingItem === null) && dialog.open) {
			dialog.close();
		}
	}, [formMode, editingItem]);

	useEffect(() => {
		const dialog = deleteDialogRef.current;
		if (dialog === null) {
			return;
		}
		if (deleteTarget !== null && !dialog.open) {
			dialog.showModal();
		} else if (deleteTarget === null && dialog.open) {
			dialog.close();
		}
	}, [deleteTarget]);

	const sortedValuations = useMemo(
		() =>
			[...valuations].sort((left, right) =>
				right.valued_at.localeCompare(left.valued_at)
			),
		[valuations]
	);

	const latestValuationId = sortedValuations[0]?.id ?? null;

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

	const resetFormFields = () => {
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
	};

	const openAddModal = () => {
		setEditingItem(null);
		resetFormFields();
		setFormMode('add');
	};

	const openEditModal = (item: Asset) => {
		setEditingItem(item);
		setName(item.name);
		setKind(item.kind);
		setValue(formatCentsAsDollars(item.value_cents));
		setValuedAt(item.valued_at ?? '');
		setValueSource(item.value_source ?? '');
		setLiabilityId(item.liability_id ?? '');
		setNotes(item.notes ?? '');
		setPurchasePrice('');
		setPurchaseDate('');
		setValuations([]);
		resetValuationForm();
		setModalError(null);
		setFormMode('edit');
		void loadValuations(item.id);
	};

	const closeFormModal = () => {
		if (submitting || valSubmitting) {
			return;
		}
		setFormMode(null);
		setEditingItem(null);
		setModalError(null);
	};

	const closeDeleteModal = () => {
		if (submitting) {
			return;
		}
		setDeleteTarget(null);
		setDeleteError(null);
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setModalError('Name is required.');
			return;
		}

		const liabilityIdValue =
			kind === 'property' && liabilityId.length > 0 ? Number(liabilityId) : null;
		const notesValue = notes.trim().length > 0 ? notes.trim() : null;

		if (formMode === 'edit' && editingItem !== null) {
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
			setToast(`“${trimmedName}” updated.`);
			setFormMode(null);
			setEditingItem(null);
			void dispatch(getAssets());
			return;
		}

		const valueCents = parsePositiveDollarsToCents(value);
		if (valueCents === null) {
			setModalError('Enter a valid current value.');
			return;
		}

		let purchasePriceCents: number | null = null;
		if (purchasePrice.trim().length > 0) {
			purchasePriceCents = parsePositiveDollarsToCents(purchasePrice);
			if (purchasePriceCents === null) {
				setModalError('Enter a valid purchase price.');
				return;
			}
			if (purchaseDate.length < 10) {
				setModalError('Enter a purchase date.');
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

		setToast(`“${trimmedName}” added.`);
		setFormMode(null);
		void dispatch(getAssets());
	};

	const onAddValuation = async () => {
		if (editingItem === null) {
			return;
		}
		const amountCents = parsePositiveDollarsToCents(valAmount);
		if (amountCents === null) {
			setModalError('Enter a valid valuation amount.');
			return;
		}
		if (valDate.length < 10) {
			setModalError('Valuation date is required.');
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
			setToast('Valuation added.');
		} catch {
			setModalError('Failed to add valuation');
		} finally {
			setValSubmitting(false);
		}
	};

	const onRemoveValuation = async (valuationId: string) => {
		if (editingItem === null || valuations.length <= 1) {
			return;
		}
		setValSubmitting(true);
		setModalError(null);
		try {
			await deleteAssetValuation(editingItem.id, valuationId);
			await loadValuations(editingItem.id);
			void dispatch(getAssets());
			setToast('Valuation removed.');
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
		const deletedName = deleteTarget.name;
		setSubmitting(true);
		setDeleteError(null);
		const result = await dispatch(deleteAssetThunk(deleteTarget.id));
		setSubmitting(false);

		if (deleteAssetThunk.rejected.match(result)) {
			setDeleteError(readThunkRejectMessage(result, 'Failed to delete asset'));
			return;
		}

		setToast(`“${deletedName}” deleted.`);
		setDeleteTarget(null);
		void dispatch(getAssets());
	};

	const initialLoading = loading && items.length === 0 && error === null;
	const isRefreshing = loading && items.length > 0;

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
			<header className={pageHeaderClass}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className={pageTitleClass}>Assets</h1>
							{isRefreshing ? (
								<Loader2
									className="h-4 w-4 animate-spin text-secondary-default"
									aria-label="Loading"
								/>
							) : null}
						</div>
						<p className={pageSubtitleClass}>
							What you own — property, vehicles, super, and external balances for
							net worth
						</p>
					</div>
					<div className={pageActionsClass}>
						<div className={headerTotalClass} aria-live="polite">
							<span className="text-[10px] font-medium uppercase tracking-[0.06em] text-paper-muted">
								Total value
							</span>
							<strong className="font-mono text-lg font-medium tracking-[-0.01em] tabular-nums text-[var(--success)]">
								{formatMoney(totalValueCents)}
							</strong>
						</div>
						<button
							type="button"
							className={assetBtnPrimaryClass}
							onClick={openAddModal}
						>
							<Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
							Add asset
						</button>
					</div>
				</div>
			</header>

			<div className={pageBodyClass}>
				{error !== null && items.length > 0 ? (
					<InlineAlert variant="error">{error}</InlineAlert>
				) : null}

				<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
					<div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
						<div className="min-w-0">
							<h2 className={panelTitleClass}>Your assets</h2>
							<p className={panelHintClass}>{assetCountLabel(items.length)}</p>
						</div>
					</div>

					{items.length === 0 ? (
						<div className="px-6 py-12 text-center">
							<div
								className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-[10px] border border-paper-border bg-paper text-paper-muted"
								aria-hidden
							>
								<Shield className="h-[22px] w-[22px]" strokeWidth={1.6} />
							</div>
							<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-paper-fg">
								No assets yet
							</h3>
							<p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-snug text-paper-muted">
								Add property, super, vehicles, or external balances to track what
								you own.
							</p>
							<div className="mt-4">
								<button
									type="button"
									className={assetBtnPrimaryClass}
									onClick={openAddModal}
								>
									<Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
									Add asset
								</button>
							</div>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-[13px]">
								<thead>
									<tr>
										<th className={tableThClass}>Name</th>
										<th className={cn(tableThClass, 'w-[108px]')}>Type</th>
										<th className={cn(tableThClass, 'w-[128px] text-right')}>
											Value
										</th>
										<th className={cn(tableThClass, 'w-[148px]')}>Valued</th>
										<th className={tableThClass}>Source</th>
										<th className={cn(tableThClass, 'text-right')}>
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => {
										const stale = isValuationStale(item.valued_at);
										return (
											<tr key={item.id}>
												<td className={cn(tableTdClass, 'font-medium')}>
													{item.name}
												</td>
												<td className={tableTdClass}>
													<AssetKindPill kind={item.kind} />
												</td>
												<td
													className={cn(
														tableTdClass,
														'text-right font-mono tabular-nums text-[var(--success)]'
													)}
												>
													{formatMoney(item.value_cents)}
												</td>
												<td className={tableTdClass}>
													<span className="inline-flex flex-wrap items-center gap-1.5">
														<span className="font-mono tabular-nums text-paper-fg">
															{formatValuedAt(item.valued_at)}
														</span>
														{stale ? <StalePill /> : null}
													</span>
												</td>
												<td
													className={cn(
														tableTdClass,
														'max-w-[180px] truncate text-paper-muted'
													)}
												>
													{item.value_source ?? '—'}
												</td>
												<td className={cn(tableTdClass, 'text-right')}>
													<div className="flex justify-end gap-1.5">
														<button
															type="button"
															className={assetBtnGhostClass}
															onClick={() => openEditModal(item)}
															aria-label={`Edit ${item.name}`}
														>
															<Pencil className="h-3.5 w-3.5" strokeWidth={2} />
															Edit
														</button>
														<button
															type="button"
															className={assetBtnGhostClass}
															onClick={() => {
																setDeleteError(null);
																setDeleteTarget(item);
															}}
															aria-label={`Delete ${item.name}`}
														>
															<Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
															Delete
														</button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>

			<dialog
				ref={addDialogRef}
				className={assetDialogClass}
				aria-labelledby="add-asset-title"
				onCancel={(event) => {
					event.preventDefault();
					closeFormModal();
				}}
				onClose={() => {
					if (!submitting) {
						setFormMode((mode) => (mode === 'add' ? null : mode));
					}
				}}
			>
				<form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Assets</span>
							<h2
								id="add-asset-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Add asset
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Record what you own and its current valuation.
							</p>
						</div>
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					<div className={assetModalBodyClass}>
						{modalError !== null && formMode === 'add' ? (
							<p className={assetFormErrorClass}>{modalError}</p>
						) : null}

						<label className={assetModalFieldClass}>
							<span className={assetModalFieldLabelClass}>Name</span>
							<input
								ref={nameInputRef}
								id="assetNameInput"
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
								placeholder="e.g. Family home, AustralianSuper"
								disabled={submitting}
								required
							/>
						</label>

						<label className={assetModalFieldClass}>
							<span className={assetModalFieldLabelClass}>Type</span>
							<select
								id="assetKindInput"
								value={kind}
								onChange={(event) => setKind(toKind(event.target.value))}
								className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
								disabled={submitting}
							>
								{ASSET_KIND_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Current value ($)</span>
								<input
									id="assetValueInput"
									type="text"
									inputMode="decimal"
									value={value}
									onChange={(event) => setValue(event.target.value)}
									className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
									placeholder="0.00"
									disabled={submitting}
									required
								/>
							</label>
							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Valued as at</span>
								<input
									id="assetValuedAtInput"
									type="date"
									value={valuedAt}
									onChange={(event) => setValuedAt(event.target.value)}
									className={cn(dateInputClass, 'h-8 w-full px-2.5')}
									disabled={submitting}
								/>
							</label>
						</div>

						<label className={assetModalFieldClass}>
							<span className={assetModalFieldLabelClass}>Valuation source</span>
							<input
								id="assetSourceInput"
								type="text"
								value={valueSource}
								onChange={(event) => setValueSource(event.target.value)}
								className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
								placeholder="e.g. Bank valuation, member statement"
								disabled={submitting}
							/>
						</label>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Purchase price ($)</span>
								<input
									id="assetPurchasePriceInput"
									type="text"
									inputMode="decimal"
									value={purchasePrice}
									onChange={(event) => setPurchasePrice(event.target.value)}
									className={cn(inputDarkClass, 'h-8 w-full px-2.5 font-mono')}
									placeholder="Optional"
									disabled={submitting}
								/>
								<p className="text-xs leading-snug text-paper-muted">
									Optional — for cost base tracking.
								</p>
							</label>
							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Purchase date</span>
								<input
									id="assetPurchaseDateInput"
									type="date"
									value={purchaseDate}
									onChange={(event) => setPurchaseDate(event.target.value)}
									className={cn(dateInputClass, 'h-8 w-full px-2.5')}
									disabled={submitting}
								/>
							</label>
						</div>

						{kind === 'property' ? (
							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Linked loan</span>
								<select
									id="assetLiabilityInput"
									value={liabilityId}
									onChange={(event) => setLiabilityId(event.target.value)}
									className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
									disabled={submitting}
								>
									<option value="">None</option>
									{liabilities.map((liability) => (
										<option key={liability.id} value={liability.id}>
											{liability.name}
										</option>
									))}
								</select>
								<p className="text-xs leading-snug text-paper-muted">
									Link a liability when this asset secures a loan.
								</p>
							</label>
						) : null}

						<label className={assetModalFieldClass}>
							<span className={assetModalFieldLabelClass}>Notes</span>
							<textarea
								id="assetNotesInput"
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								className={cn(
									inputDarkClass,
									'min-h-[72px] w-full resize-y px-2.5 py-2'
								)}
								placeholder="Optional context"
								disabled={submitting}
							/>
						</label>
					</div>

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting}
							className={assetBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting}
							className={assetBtnPrimaryClass}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Add asset'
							)}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				ref={editDialogRef}
				className={assetDialogWideClass}
				aria-labelledby="edit-asset-title"
				onCancel={(event) => {
					event.preventDefault();
					closeFormModal();
				}}
				onClose={() => {
					if (!submitting && !valSubmitting) {
						setFormMode((mode) => (mode === 'edit' ? null : mode));
						setEditingItem(null);
					}
				}}
			>
				<form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Assets</span>
							<h2
								id="edit-asset-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Edit asset
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								Update metadata here — change values via valuation history below.
							</p>
						</div>
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting || valSubmitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					{editingItem !== null ? (
						<div className={assetModalBodyClass}>
							{modalError !== null && formMode === 'edit' ? (
								<p className={assetFormErrorClass}>{modalError}</p>
							) : null}

							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Name</span>
								<input
									ref={nameInputRef}
									id="editAssetNameInput"
									type="text"
									value={name}
									onChange={(event) => setName(event.target.value)}
									className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
									disabled={submitting}
									required
								/>
							</label>

							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Type</span>
								<select
									id="editAssetKindInput"
									value={kind}
									onChange={(event) => setKind(toKind(event.target.value))}
									className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
									disabled={submitting}
								>
									{ASSET_KIND_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>

							{kind === 'property' ? (
								<label className={assetModalFieldClass}>
									<span className={assetModalFieldLabelClass}>Linked loan</span>
									<select
										id="editAssetLiabilityInput"
										value={liabilityId}
										onChange={(event) => setLiabilityId(event.target.value)}
										className={cn(selectDarkClass, 'h-8 w-full px-2.5')}
										disabled={submitting}
									>
										<option value="">None</option>
										{liabilities.map((liability) => (
											<option key={liability.id} value={liability.id}>
												{liability.name}
											</option>
										))}
									</select>
								</label>
							) : null}

							<label className={assetModalFieldClass}>
								<span className={assetModalFieldLabelClass}>Notes</span>
								<textarea
									id="editAssetNotesInput"
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									className={cn(
										inputDarkClass,
										'min-h-[72px] w-full resize-y px-2.5 py-2'
									)}
									placeholder="Optional context"
									disabled={submitting}
								/>
							</label>

							<div className="mt-1 border-t border-paper-border pt-3.5">
								<div className="mb-2.5">
									<h3 className="m-0 text-xs font-semibold tracking-[0.02em] text-paper-fg">
										Valuation history
									</h3>
									<p className="mt-0.5 text-[11.5px] text-paper-muted">
										Add or remove past valuations — the newest date sets the table
										value.
									</p>
								</div>

								{valuationsLoading ? (
									<div className="mb-3 flex justify-center py-2">
										<Loader2 className="h-4 w-4 animate-spin text-secondary-default" />
									</div>
								) : null}

								{!valuationsLoading && sortedValuations.length === 0 ? (
									<p className="mb-3 text-xs text-paper-muted">
										No valuations recorded yet.
									</p>
								) : null}

								{sortedValuations.length > 0 ? (
									<div className="mb-3 flex flex-col gap-1.5">
										{sortedValuations.map((entry) => {
											const isCurrent = entry.id === latestValuationId;
											const canRemove = valuations.length > 1;
											return (
												<div
													key={entry.id}
													className={cn(
														'rounded-paper border border-paper-border bg-paper px-2.5 py-2 text-[12.5px]',
														isCurrent &&
															'border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_5%,var(--surface))]'
													)}
												>
													<div className="mb-1 flex items-center justify-between gap-2">
														<span className="font-mono tabular-nums text-paper-fg">
															{formatValuedAt(entry.valued_at)}
															{isCurrent ? ' · current' : ''}
														</span>
														{canRemove ? (
															<button
																type="button"
																className={cn(assetBtnGhostClass, 'h-[26px]')}
																onClick={() => void onRemoveValuation(entry.id)}
																disabled={valSubmitting}
															>
																Remove
															</button>
														) : null}
													</div>
													<div className="flex items-center justify-between gap-2">
														<span className="truncate text-[11.5px] text-paper-muted">
															{entry.source ?? '—'}
														</span>
														<span className="font-mono font-medium tabular-nums text-[var(--success)]">
															{formatMoney(entry.value_cents)}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								) : null}

								<div className="grid grid-cols-1 gap-2.5 rounded-paper border border-dashed border-paper-border bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))] p-3 sm:grid-cols-2">
									<label className={assetModalFieldClass}>
										<span className={assetModalFieldLabelClass}>Date</span>
										<input
											id="valDateInput"
											type="date"
											value={valDate}
											onChange={(event) => setValDate(event.target.value)}
											className={cn(dateInputClass, 'h-8 w-full px-2.5')}
											disabled={valSubmitting}
										/>
									</label>
									<label className={assetModalFieldClass}>
										<span className={assetModalFieldLabelClass}>Value ($)</span>
										<input
											id="valAmountInput"
											type="text"
											inputMode="decimal"
											value={valAmount}
											onChange={(event) => setValAmount(event.target.value)}
											className={cn(
												inputDarkClass,
												'h-8 w-full px-2.5 font-mono'
											)}
											placeholder="0.00"
											disabled={valSubmitting}
										/>
									</label>
									<label className={cn(assetModalFieldClass, 'sm:col-span-2')}>
										<span className={assetModalFieldLabelClass}>Source</span>
										<input
											id="valSourceInput"
											type="text"
											value={valSource}
											onChange={(event) => setValSource(event.target.value)}
											className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
											placeholder="e.g. Agent appraisal"
											disabled={valSubmitting}
										/>
									</label>
									<div className="flex justify-end sm:col-span-2">
										<button
											type="button"
											className={assetBtnAccentClass}
											onClick={() => void onAddValuation()}
											disabled={valSubmitting}
										>
											{valSubmitting ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												'Add valuation'
											)}
										</button>
									</div>
								</div>
							</div>
						</div>
					) : null}

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeFormModal}
							disabled={submitting || valSubmitting}
							className={assetBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || valSubmitting}
							className={assetBtnPrimaryClass}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Save changes'
							)}
						</button>
					</div>
				</form>
			</dialog>

			<dialog
				ref={deleteDialogRef}
				className={assetDialogClass}
				aria-labelledby="delete-asset-title"
				onCancel={(event) => {
					event.preventDefault();
					closeDeleteModal();
				}}
				onClose={() => {
					if (!submitting) {
						setDeleteTarget(null);
						setDeleteError(null);
					}
				}}
			>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[18px]">
						<div className="min-w-0">
							<span className={cn(eyebrowClass, 'mb-1 block')}>Assets</span>
							<h2
								id="delete-asset-title"
								className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
							>
								Delete asset
							</h2>
							<p className="mt-1 text-[12.5px] text-paper-muted">
								{deleteTarget !== null
									? `Remove “${deleteTarget.name}” and its valuation history? This cannot be undone.`
									: null}
							</p>
							{deleteError !== null ? (
								<p className={cn(assetFormErrorClass, 'mt-3')}>{deleteError}</p>
							) : null}
						</div>
						<button
							type="button"
							onClick={closeDeleteModal}
							disabled={submitting}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
							aria-label="Close"
						>
							<X className="h-4 w-4" strokeWidth={2} />
						</button>
					</div>

					<div className="flex shrink-0 justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
						<button
							type="button"
							onClick={closeDeleteModal}
							disabled={submitting}
							className={assetBtnClass}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void onConfirmDelete()}
							disabled={submitting}
							className={assetBtnDangerClass}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Delete'
							)}
						</button>
					</div>
				</div>
			</dialog>

			{toast !== null ? (
				<div
					role="status"
					className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-paper-fg px-4 py-2.5 text-[13px] font-medium text-paper-surface shadow-2xl shadow-paper-fg/25"
				>
					<span className="text-[var(--success)]">
						<Check size={15} />
					</span>
					<span>{toast}</span>
				</div>
			) : null}
		</PageShell>
	);
}
