import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { getAllTransactions } from '@/store/thunks/transactions.get.all';
import { contrastTextColor } from '@/lib/contrastTextColor';
import {
	detectRecurringExpenses,
	detectRecurringIncome,
	type RecurringCandidate,
} from '@/lib/recurringExpenseDetection';
import { Table, type TColumn } from '@/components/table';
import { Loader2, Repeat } from 'lucide-react';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const mainAmountClass = (flow: RecurringCandidate['flow']) =>
	flow === 'income' ? 'text-green-400' : 'text-red-300';

const rangeAmountClass = (flow: RecurringCandidate['flow']) =>
	flow === 'income' ? 'text-green-400/90' : 'text-red-300/90';

const RecurringExpensesPage = () => {
	const dispatch = useAppDispatch();
	const { transactions, transactionsLoading, transactionsError } =
		useAppSelector((s) => s.TransactionsReducer);
	const { categories, categoriesLoading, categoriesError } = useAppSelector(
		(s) => s.CategoryReducer
	);
	const list = Array.isArray(transactions) ? transactions : [];
	const categoryList = useMemo<Category[]>(() => {
		return Array.isArray(categories) ? categories : [];
	}, [categories]);

	const [minOccurrences, setMinOccurrences] = useState(3);

	const fetchOnceRef = useRef(false);
	useEffect(() => {
		if (list.length > 0 || transactionsError || transactionsLoading) {
			return;
		}
		if (fetchOnceRef.current) {
			return;
		}
		fetchOnceRef.current = true;
		void dispatch(getAllTransactions());
	}, [dispatch, list.length, transactionsError, transactionsLoading]);

	const categoriesFetchRef = useRef(false);
	useEffect(() => {
		if (categoryList.length > 0 || categoriesError || categoriesLoading) {
			return;
		}
		if (categoriesFetchRef.current) {
			return;
		}
		categoriesFetchRef.current = true;
		void dispatch(getAllCategories());
	}, [dispatch, categoryList.length, categoriesError, categoriesLoading]);

	const expenseRows = useMemo(
		() => detectRecurringExpenses(list, minOccurrences),
		[list, minOccurrences]
	);
	const incomeRows = useMemo(
		() => detectRecurringIncome(list, minOccurrences),
		[list, minOccurrences]
	);
	const rows = useMemo(() => {
		const merged = [...expenseRows, ...incomeRows];
		merged.sort((a, b) => b.confidence - a.confidence);
		return merged;
	}, [expenseRows, incomeRows]);

	const {
		estimatedMonthlyTotal,
		sumTypicalPerOccurrence,
		medianTypicalMin,
		medianTypicalMax,
		observedChargeMin,
		observedChargeMax,
	} = useMemo(() => {
		let monthly = 0;
		let sumTypical = 0;
		for (const r of expenseRows) {
			sumTypical += r.typicalAmountDollars;
			monthly += r.estimatedMonthlyDollars;
		}
		const typicals = expenseRows.map((r) => r.typicalAmountDollars);
		const mins = expenseRows.map((r) => r.minAmountDollars);
		const maxs = expenseRows.map((r) => r.maxAmountDollars);
		return {
			estimatedMonthlyTotal: Math.round(monthly * 100) / 100,
			sumTypicalPerOccurrence: Math.round(sumTypical * 100) / 100,
			medianTypicalMin:
				typicals.length > 0 ? Math.min(...typicals) : 0,
			medianTypicalMax:
				typicals.length > 0 ? Math.max(...typicals) : 0,
			observedChargeMin: mins.length > 0 ? Math.min(...mins) : 0,
			observedChargeMax: maxs.length > 0 ? Math.max(...maxs) : 0,
		};
	}, [expenseRows]);

	const {
		estimatedMonthlyIncomeTotal,
		sumTypicalIncomePerOccurrence,
	} = useMemo(() => {
		let monthly = 0;
		let sumTypical = 0;
		for (const r of incomeRows) {
			sumTypical += r.typicalAmountDollars;
			monthly += r.estimatedMonthlyDollars;
		}
		return {
			estimatedMonthlyIncomeTotal: Math.round(monthly * 100) / 100,
			sumTypicalIncomePerOccurrence: Math.round(sumTypical * 100) / 100,
		};
	}, [incomeRows]);

	const columns: TColumn<RecurringCandidate>[] = useMemo(
		() => [
			{
				key: 'labelSample',
				label: 'Example description',
				sortable: true,
				sortFunction: (a, b, rowA, rowB) => {
					const catName = (id: number | null) => {
						if (id === null) {
							return '\uffff';
						}
						const c = categoryList.find((x) => String(x.id) === String(id));
						return c?.name ?? String(id);
					};
					const byCat = catName(rowA.modeCategoryId).localeCompare(
						catName(rowB.modeCategoryId)
					);
					if (byCat !== 0) {
						return byCat;
					}
					return a.localeCompare(b);
				},
				render: (v, row) => {
					const cat =
						row.modeCategoryId !== null
							? categoryList.find(
									(c) => String(c.id) === String(row.modeCategoryId)
								)
							: undefined;
					const showDeleted =
						cat?.deleted_at && row.modeCategoryId !== null;
					return (
						<div className="max-w-md">
							<div className="flex flex-wrap gap-1 mb-1.5">
								{row.modeCategoryId !== null && cat && !cat.deleted_at ? (
									<span
										className="inline-block px-2 py-0.5 rounded text-xs shrink-0"
										style={{
											backgroundColor: cat.colour ?? '#4b5563',
											color: contrastTextColor(cat.colour ?? '#4b5563'),
										}}
									>
										{cat.name}
									</span>
								) : row.modeCategoryId !== null && showDeleted ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-white/80 bg-gray-600 shrink-0">
										{cat?.name ?? `ID ${row.modeCategoryId}`} (deleted)
									</span>
								) : row.modeCategoryId !== null && !cat ? (
									<span className="inline-block px-2 py-0.5 rounded text-xs text-white/80 bg-gray-600 shrink-0">
										ID: {row.modeCategoryId}
									</span>
								) : (
									<span className="inline-block px-2 py-0.5 rounded text-xs italic text-gray-400 bg-gray-700 shrink-0">
										Uncategorized
									</span>
								)}
								<span
									className={
										row.flow === 'income'
											? 'inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide shrink-0 border border-green-500/45 text-green-400/95'
											: 'inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide shrink-0 border border-red-500/35 text-red-300/90'
									}
								>
									{row.flow === 'income' ? 'Income' : 'Spending'}
								</span>
							</div>
							<p className="text-sm truncate" title={v}>
								{v}
							</p>
							<p className="text-[10px] text-gray-500 truncate" title={row.key}>
								{row.key}
							</p>
						</div>
					);
				},
			},
			{
				key: 'cadenceLabel',
				label: 'Cadence',
				sortable: true,
				render: (v) => <span className="text-sm">{v}</span>,
			},
			{
				key: 'medianGapDays',
				label: 'Median gap (days)',
				sortable: true,
				render: (v) => (
					<span className="font-mono text-sm">{v}</span>
				),
			},
			{
				key: 'typicalAmountDollars',
				label: 'Typical · est./mo',
				sortable: true,
				sortFunction: (a, b, rowA, rowB) => {
					const byMo =
						rowA.estimatedMonthlyDollars - rowB.estimatedMonthlyDollars;
					if (byMo !== 0) {
						return byMo;
					}
					return a - b;
				},
				render: (v, row) => (
					<div
						className="flex flex-col gap-1 py-0.5 min-w-[6.75rem]"
						title="Median amount · below: typical × 30 ÷ median gap (days)"
					>
						<span
							className={`font-mono text-sm tabular-nums leading-none ${mainAmountClass(row.flow)}`}
						>
							{formatMoney(v)}
						</span>
						<span className="font-mono text-[11px] tabular-nums leading-none text-white/55">
							<span className="text-white/35 mr-0.5" aria-hidden>
								≈
							</span>
							{formatMoney(row.estimatedMonthlyDollars)}
							<span className="text-white/35 font-sans font-normal text-[10px] ml-1">
								/mo
							</span>
						</span>
					</div>
				),
			},
			{
				key: 'minAmountDollars',
				label: 'Min / max',
				sortable: true,
				render: (_v, row) => (
					<span
						className={`font-mono text-sm ${rangeAmountClass(row.flow)}`}
					>
						{formatMoney(row.minAmountDollars)} —{' '}
						{formatMoney(row.maxAmountDollars)}
					</span>
				),
				sortFunction: (a, b, rowA, rowB) =>
					rowA.minAmountDollars - rowB.minAmountDollars,
			},
			{
				key: 'occurrences',
				label: 'Hits',
				sortable: true,
				render: (v) => <span className="text-center">{v}</span>,
				cellClassName: 'text-center',
				headerClassName: 'text-center',
			},
			{
				key: 'firstDate',
				label: 'First',
				sortable: true,
			},
			{
				key: 'lastDate',
				label: 'Last',
				sortable: true,
			},
			{
				key: 'confidence',
				label: 'Score',
				sortable: true,
				render: (v) => (
					<span
						className={
							v >= 70
								? 'text-green-400'
								: v >= 45
									? 'text-amber-300'
									: 'text-gray-400'
						}
					>
						{v}
					</span>
				),
			},
		],
		[categoryList]
	);

	const initialLoading =
		transactionsLoading && list.length === 0 && !transactionsError;

	if (initialLoading) {
		return (
			<div className="flex items-center justify-center h-screen w-full">
				<Loader2 className="w-12 h-12 animate-spin text-secondary-default" />
			</div>
		);
	}

	if (transactionsError) {
		return (
			<div className="p-6 text-red-400">Error: {transactionsError}</div>
		);
	}

	return (
		<div className="flex flex-col h-screen w-full p-4">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-secondary-default/20 pb-4 mb-4">
				<div>
					<h1 className="text-xl font-semibold text-white flex items-center gap-2">
						<Repeat className="w-6 h-6 text-secondary-default" />
						Repeat payments
					</h1>
					<p className="text-sm text-white/60 mt-1 max-w-2xl">
						Heuristic only: groups similar transaction descriptions (spending and
						income) by median spacing. Not bank-confirmed.
					</p>
				</div>
				<div className="flex flex-col items-end gap-2">
					{expenseRows.length > 0 || incomeRows.length > 0 ? (
						<div className="flex flex-row flex-wrap gap-3 justify-end items-stretch">
							<div className="text-left rounded border border-secondary-default/30 bg-gray-900/80 px-4 py-2 min-w-[13rem]">
								<p className="text-[10px] uppercase tracking-wide text-white/50">
									Est. monthly income (median gaps)
								</p>
								<p className="text-lg font-semibold font-mono text-green-400">
									{formatMoney(estimatedMonthlyIncomeTotal)}
								</p>
								<p className="text-[11px] text-white/45 mt-1">
									Sum of typical credits (once each):{' '}
									<span className="font-mono text-white/70">
										{formatMoney(sumTypicalIncomePerOccurrence)}
									</span>
								</p>
							</div>
							<div className="text-right rounded border border-secondary-default/30 bg-gray-900/80 px-4 py-2 min-w-[13rem]">
								<p className="text-[10px] uppercase tracking-wide text-white/50">
									Est. monthly (from median gaps)
								</p>
								<p className="text-lg font-semibold font-mono text-red-300">
									{formatMoney(estimatedMonthlyTotal)}
								</p>
								<p className="text-[11px] text-white/45 mt-1">
									Sum of typical charges (once each):{' '}
									<span className="font-mono text-white/70">
										{formatMoney(sumTypicalPerOccurrence)}
									</span>
								</p>
								<p className="text-[11px] text-white/45 mt-1">
									Typical (median) across patterns:{' '}
									<span className="font-mono text-white/70">
										{formatMoney(medianTypicalMin)} —{' '}
										{formatMoney(medianTypicalMax)}
									</span>
								</p>
								<p className="text-[11px] text-white/45">
									Observed charge (all hits):{' '}
									<span className="font-mono text-white/70">
										{formatMoney(observedChargeMin)} —{' '}
										{formatMoney(observedChargeMax)}
									</span>
								</p>
							</div>
						</div>
					) : null}
					<label className="flex items-center gap-2 text-sm text-white/80">
						<span>Minimum occurrences</span>
						<select
							value={minOccurrences}
							onChange={(e) =>
								setMinOccurrences(Number.parseInt(e.target.value, 10))
							}
							className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
						>
							<option value={2}>2</option>
							<option value={3}>3</option>
							<option value={4}>4</option>
							<option value={5}>5</option>
						</select>
					</label>
				</div>
			</div>

			<div className="flex-grow overflow-hidden min-h-0">
				<Table<RecurringCandidate>
					columns={columns}
					data={rows}
					rowKey="rowId"
					header={{ sticky: true }}
					loading={transactionsLoading}
					emptyStateMessage={
						rows.length === 0 && !transactionsLoading
							? 'No repeat patterns found — lower “minimum occurrences” or add more history.'
							: 'Loading…'
					}
				/>
			</div>
		</div>
	);
};

export default RecurringExpensesPage;
