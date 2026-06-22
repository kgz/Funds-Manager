import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListChecks, Loader2 } from 'lucide-react';
import { CategoryPill } from '@/components/CategoryPill';
import { SegmentedControl } from '@/components/layout/SegmentedControl';
import { EmptyState } from '@/components/layout/EmptyState';
import { GlassCard } from '@/components/layout/GlassCard';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { SearchInput } from '@/components/layout/SearchInput';
import { selectDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { categoryLabel } from '@/lib/utils/categoryGroups';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories } from '@/store/thunks/category.get.all';
import {
	fetchCategoryLenderMappings,
	fetchLenderExpenseBuckets,
	upsertCategoryLenderMapping,
	type CategoryLenderMappingRow,
	type LenderExpenseBucket,
} from '@/types/lender-expenses';

type MappingFilter = 'all' | 'overrides' | 'excluded';

function bucketLabelForKey(buckets: LenderExpenseBucket[], key: string | null): string | null {
	if (key === null) {
		return null;
	}
	const bucket = buckets.find((item) => item.bucketKey === key);
	return bucket?.label ?? key.replace(/_/g, ' ');
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

	if (loading) {
		return <PageLoadingState label="Loading category mappings…" />;
	}

	return (
		<>
			<InlineAlert variant="info" className="mb-6">
				Map each app category to a lender living-expense bucket, or choose{' '}
				<strong className="font-medium text-white/90">Excluded</strong> for debt repayments and
				other non-living spend (e.g. home loan, car loan). Income categories default to excluded.
			</InlineAlert>

			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}

			<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<SearchInput
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder="Search categories…"
					className="w-full lg:max-w-sm"
				/>
				<SegmentedControl
					value={filter}
					onChange={setFilter}
					ariaLabel="Mapping filter"
					options={[
						{ value: 'all', label: 'All' },
						{ value: 'overrides', label: 'Overrides' },
						{ value: 'excluded', label: 'Excluded' },
					]}
				/>
			</div>

			{filteredMappings.length === 0 ? (
				<EmptyState
					icon={ListChecks}
					title="No categories match"
					description="Try clearing the search or changing the filter."
				/>
			) : (
				<GlassCard className="overflow-hidden p-0">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[56rem] text-sm">
							<thead>
								<tr className="border-b border-white/10 bg-white/[0.02] text-left text-xs font-medium uppercase tracking-wider text-white/50">
									<th className="px-4 py-3">App category</th>
									<th className="px-4 py-3">Default bucket</th>
									<th className="px-4 py-3">Lender bucket</th>
									<th className="px-4 py-3">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filteredMappings.map((row) => {
									const meta = categoryMeta.get(String(row.categoryId));
									const displayName = meta?.displayName ?? row.categoryName;
									const defaultLabel = bucketLabelForKey(buckets, row.defaultBucketKey);
									const isSaving = savingCategoryId === row.categoryId;
									const selectValue = row.isExcluded ? '' : (row.bucketKey ?? '');
									return (
										<tr key={row.categoryId} className="text-white/90">
											<td className="px-4 py-4 align-middle">
												{meta?.colour ? (
													<CategoryPill name={displayName} colour={meta.colour} />
												) : (
													<span className="font-medium">{displayName}</span>
												)}
											</td>
											<td className="px-4 py-4 align-middle text-white/55">
												{row.defaultBucketKey === null
													? '—'
													: (defaultLabel ?? 'Other living expenses')}
											</td>
											<td className="px-4 py-4 align-middle">
												<div className="relative max-w-md">
													<select
														className={cn(selectDarkClass, 'w-full min-w-[14rem] px-3 py-2')}
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
														<option value="" className="bg-gray-950 text-white">
															Excluded
														</option>
														{buckets.map((bucket) => (
															<option
																key={bucket.bucketKey}
																value={bucket.bucketKey}
																className="bg-gray-950 text-white"
															>
																{bucket.label}
															</option>
														))}
													</select>
													{isSaving ? (
														<Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/50" />
													) : null}
												</div>
											</td>
											<td className="px-4 py-4 align-middle">
												{row.isExcluded ? (
													<span
														className={cn(
															'rounded px-2 py-0.5 text-xs',
															row.isManualExclude
																? 'bg-amber-500/20 text-amber-200'
																: 'bg-white/10 text-white/55'
														)}
													>
														{row.isManualExclude ? 'Excluded' : 'Income default'}
													</span>
												) : row.isOverride ? (
													<span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
														Override
													</span>
												) : (
													<span className="rounded bg-white/5 px-2 py-0.5 text-xs text-white/45">
														Default
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</GlassCard>
			)}
		</>
	);
}
