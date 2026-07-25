import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListChecks, Loader2 } from 'lucide-react';
import { CategoryPill } from '@/components/CategoryPill';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { SearchInput } from '@/components/layout/SearchInput';
import { glassCardClass, selectDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { categoryLabel } from '@/lib/utils/categoryGroups';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import {
	fetchCategoryLenderMappings,
	fetchLenderExpenseBuckets,
	upsertCategoryLenderMapping,
	type CategoryLenderMappingRow,
	type LenderExpenseBucket,
} from '@/types/lender-expenses';
import {
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
	LivingExpensesCallout,
	MappingStatusPill,
	SortDir,
	SortHeader,
	tableTdClass,
} from './shared';

type MappingFilter = 'all' | 'overrides' | 'excluded';
type MappingSortKey = 'name' | 'default' | 'lender' | 'status';

function bucketLabelForKey(buckets: LenderExpenseBucket[], key: string | null): string | null {
	if (key === null) {
		return null;
	}
	const bucket = buckets.find((item) => item.bucketKey === key);
	return bucket?.label ?? key.replace(/_/g, ' ');
}

function mappingStatus(row: CategoryLenderMappingRow): 'default' | 'override' | 'excluded' {
	if (row.isExcluded) {
		return 'excluded';
	}
	if (row.isOverride) {
		return 'override';
	}
	return 'default';
}

function categoryIsChild(categoryId: number, categories: Category[]): boolean {
	const category = categories.find((item) => Number(item.id) === categoryId);
	return category?.parent_category_id != null && category.parent_category_id.length > 0;
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b) * (dir === 'asc' ? 1 : -1);
	}
	if (a === b) {
		return 0;
	}
	return (a < b ? -1 : 1) * (dir === 'asc' ? 1 : -1);
}

function mappingSortValue(
	row: CategoryLenderMappingRow,
	displayName: string,
	defaultLabel: string | null,
	key: MappingSortKey
): string | number {
	if (key === 'name') {
		return displayName.toLowerCase();
	}
	if (key === 'default') {
		return (defaultLabel ?? '').toLowerCase();
	}
	if (key === 'lender') {
		return (row.bucketLabel ?? '').toLowerCase();
	}
	const status = mappingStatus(row);
	if (status === 'override') {
		return 1;
	}
	if (status === 'excluded') {
		return 2;
	}
	return 0;
}

export function LenderExpenseMappingsPage() {
	const dispatch = useAppDispatch();
	const { categories } = useAppSelector((state) => state.CategoryReducer);
	const [buckets, setBuckets] = useState<LenderExpenseBucket[]>([]);
	const [mappings, setMappings] = useState<CategoryLenderMappingRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [filter, setFilter] = useState<MappingFilter>('all');
	const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
	const [sortKey, setSortKey] = useState<MappingSortKey>('name');
	const [sortDir, setSortDir] = useState<SortDir>('asc');

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [bucketList, mappingRows] = await Promise.all([
				fetchLenderExpenseBuckets(),
				fetchCategoryLenderMappings(),
			]);
			setBuckets(bucketList);
			setMappings(mappingRows);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load mappings');
			setBuckets([]);
			setMappings([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (categories.length === 0) {
			void dispatch(getAllCategories({ withCounts: false }));
		}
	}, [categories.length, dispatch]);

	useEffect(() => {
		void load();
	}, [load]);

	const onMappingChange = async (categoryId: number, bucketKey: string | null) => {
		setSavingCategoryId(categoryId);
		setError(null);
		try {
			await upsertCategoryLenderMapping(categoryId, bucketKey);
			const mappingRows = await fetchCategoryLenderMappings();
			setMappings(mappingRows);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to save mapping');
		} finally {
			setSavingCategoryId(null);
		}
	};

	const categoryMeta = useMemo(() => {
		const byId = new Map<string, { colour: string | undefined; displayName: string }>();
		for (const category of categories) {
			byId.set(String(category.id), {
				colour: category.colour ?? undefined,
				displayName: categoryLabel(category, categories),
			});
		}
		return byId;
	}, [categories]);

	const filteredMappings = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return mappings.filter((row) => {
			if (filter === 'overrides' && !row.isOverride) {
				return false;
			}
			if (filter === 'excluded' && !row.isExcluded) {
				return false;
			}
			if (query.length === 0) {
				return true;
			}
			const meta = categoryMeta.get(String(row.categoryId));
			const haystack = `${row.categoryName} ${meta?.displayName ?? ''} ${row.bucketLabel ?? ''}`.toLowerCase();
			return haystack.includes(query);
		});
	}, [categoryMeta, filter, mappings, searchQuery]);

	const sortedMappings = useMemo(() => {
		return [...filteredMappings].sort((left, right) => {
			const leftMeta = categoryMeta.get(String(left.categoryId));
			const rightMeta = categoryMeta.get(String(right.categoryId));
			const leftName = leftMeta?.displayName ?? left.categoryName;
			const rightName = rightMeta?.displayName ?? right.categoryName;
			const leftDefault = bucketLabelForKey(buckets, left.defaultBucketKey);
			const rightDefault = bucketLabelForKey(buckets, right.defaultBucketKey);
			const cmp = compareValues(
				mappingSortValue(left, leftName, leftDefault, sortKey),
				mappingSortValue(right, rightName, rightDefault, sortKey),
				sortDir
			);
			if (cmp !== 0) {
				return cmp;
			}
			return leftName.localeCompare(rightName);
		});
	}, [buckets, categoryMeta, filteredMappings, sortDir, sortKey]);

	const onSort = (key: MappingSortKey) => {
		if (sortKey === key) {
			setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortKey(key);
		setSortDir(key === 'status' ? 'desc' : 'asc');
	};

	if (loading) {
		return <PageLoadingState label="Loading category mappings…" />;
	}

	if (error !== null && mappings.length === 0) {
		return (
			<ErrorState
				title="Error loading mappings"
				message={error}
				onRetry={() => void load()}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<LivingExpensesCallout>
				<p className="m-0">
					Map app categories to lender buckets or Excluded. Salary/income and loan categories
					are excluded by default.
				</p>
			</LivingExpensesCallout>

			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			<section className={cn(glassCardClass, 'overflow-hidden p-0')}>
				<div className="flex flex-wrap items-center gap-2.5 border-b border-paper-border px-4 py-3">
					<SearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search categories…"
						className="w-full min-w-[12rem] max-w-[260px]"
					/>
					<div className={leSegmentedClass} role="group" aria-label="Mapping status">
						{(
							[
								{ value: 'all', label: 'All' },
								{ value: 'overrides', label: 'Overrides' },
								{ value: 'excluded', label: 'Excluded' },
							] as const
						).map((option) => (
							<button
								key={option.value}
								type="button"
								className={cn(
									leSegmentButtonClass,
									filter === option.value && leSegmentButtonActiveClass
								)}
								aria-pressed={filter === option.value}
								onClick={() => setFilter(option.value)}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>

				{sortedMappings.length === 0 ? (
					<div className="px-4 py-6">
						<EmptyState
							icon={ListChecks}
							compact
							title="No categories match"
							description="Try clearing the search or changing the filter."
						/>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[56rem] border-collapse text-[13px]">
							<thead>
								<tr>
									<SortHeader
										label="App category"
										active={sortKey === 'name'}
										direction={sortDir}
										onClick={() => onSort('name')}
										className="min-w-[200px]"
									/>
									<SortHeader
										label="Default bucket"
										active={sortKey === 'default'}
										direction={sortDir}
										onClick={() => onSort('default')}
										className="min-w-[160px]"
									/>
									<SortHeader
										label="Lender bucket"
										active={sortKey === 'lender'}
										direction={sortDir}
										onClick={() => onSort('lender')}
										className="min-w-[200px]"
									/>
									<SortHeader
										label="Status"
										active={sortKey === 'status'}
										direction={sortDir}
										onClick={() => onSort('status')}
										className="w-[110px]"
									/>
								</tr>
							</thead>
							<tbody>
								{sortedMappings.map((row) => {
									const meta = categoryMeta.get(String(row.categoryId));
									const displayName = meta?.displayName ?? row.categoryName;
									const defaultLabel = bucketLabelForKey(buckets, row.defaultBucketKey);
									const isSaving = savingCategoryId === row.categoryId;
									const selectValue = row.isExcluded ? '' : (row.bucketKey ?? '');
									const status = mappingStatus(row);
									const isChild = categoryIsChild(row.categoryId, categories);

									return (
										<tr
											key={row.categoryId}
											className="transition-colors hover:[&>td]:bg-[color-mix(in_oklch,var(--fg)_2%,var(--surface))]"
										>
											<td className={tableTdClass}>
												<div className="flex min-w-0 items-center gap-2">
													{isChild ? (
														<span className="inline-block w-4 shrink-0" aria-hidden />
													) : null}
													<CategoryPill
														name={displayName}
														colour={meta?.colour}
														variant="outline"
													/>
												</div>
											</td>
											<td className={cn(tableTdClass, 'text-[12px] text-paper-muted')}>
												{row.defaultBucketKey === null
													? '—'
													: (defaultLabel ?? 'Other living expenses')}
											</td>
											<td className={tableTdClass}>
												<div className="relative max-w-md">
													<select
														className={cn(
															selectDarkClass,
															'h-7 min-w-[11rem] max-w-full px-2 text-[12px]',
															status === 'override' &&
																'border-[color-mix(in_oklch,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_4%,var(--surface))]',
															status === 'excluded' &&
																'border-[color-mix(in_oklch,var(--muted)_40%,var(--border))] text-paper-muted'
														)}
														value={selectValue}
														disabled={isSaving}
														onChange={(event) => {
															const value = event.target.value;
															void onMappingChange(
																row.categoryId,
																value.length === 0 ? null : value
															);
														}}
														aria-label={`Lender bucket for ${displayName}`}
													>
														<option value="" className="bg-paper-surface text-paper-fg">
															Excluded
														</option>
														{buckets.map((bucket) => (
															<option
																key={bucket.bucketKey}
																value={bucket.bucketKey}
																className="bg-paper-surface text-paper-fg"
															>
																{bucket.label}
															</option>
														))}
													</select>
													{isSaving ? (
														<Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-paper-muted" />
													) : null}
												</div>
											</td>
											<td className={tableTdClass}>
												<MappingStatusPill status={status} />
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
	);
}
