import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllTransactions } from '@/store/thunks/transactions.get.all';
import {
	detectRecurringExpenses,
	type RecurringCandidate,
} from '@/lib/recurringExpenseDetection';
import { Table, type TColumn } from '@/components/table';
import { Loader2, Repeat } from 'lucide-react';

const formatMoney = (n: number) =>
	`$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RecurringExpensesPage = () => {
	const dispatch = useAppDispatch();
	const { transactions, transactionsLoading, transactionsError } =
		useAppSelector((s) => s.TransactionsReducer);
	const list = Array.isArray(transactions) ? transactions : [];

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

	const rows = useMemo(
		() => detectRecurringExpenses(list, minOccurrences),
		[list, minOccurrences]
	);

	const columns: TColumn<RecurringCandidate>[] = useMemo(
		() => [
			{
				key: 'labelSample',
				label: 'Example description',
				sortable: true,
				render: (v, row) => (
					<div className="max-w-md">
						<p className="text-sm truncate" title={v}>
							{v}
						</p>
						<p className="text-[10px] text-gray-500 truncate" title={row.key}>
							{row.key}
						</p>
					</div>
				),
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
				label: 'Typical amount',
				sortable: true,
				render: (v) => (
					<span className="font-mono text-red-300">{formatMoney(v)}</span>
				),
				sortFunction: (a, b) => a - b,
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
		[]
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
						Heuristic only: groups similar outgoing transaction descriptions and
						median spacing. Not bank-confirmed subscriptions.
					</p>
				</div>
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

			<div className="flex-grow overflow-hidden min-h-0">
				<Table<RecurringCandidate>
					columns={columns}
					data={rows}
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
