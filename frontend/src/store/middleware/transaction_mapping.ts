import { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store'; // Import AppDispatch
import { setTransactions } from '../slices/transactionsSlice';
import type { Transaction } from '../thunks/transactions.get.all';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

// --- Action Type Identification ---
// TODO: Replace these with the actual action types dispatched by your transaction slice
// when transactions are successfully fetched, created, updated, or deleted.
// These are examples based on common Redux Toolkit patterns.
const TRANSACTION_UPDATE_ACTIONS = [
    'transactions/getAll/fulfilled',
	'mapping/get/fulfilled',
	'categories/getAll/fulfilled'
    // 'transactions/createTransaction/fulfilled',
    // 'transactions/updateTransaction/fulfilled',
    // 'transactions/deleteTransaction/fulfilled',
    // Add any other relevant action types here
];

export const transactionWatcherMiddleware: Middleware<object, RootState> =
    (store: MiddlewareAPI<AppDispatch, RootState>) => (next) => (action: unknown) => {
        const result = next(action); // Pass the action along first

        if (!isRecord(action) || typeof action.type !== "string") {
			return result;
		}

        if (TRANSACTION_UPDATE_ACTIONS.includes(action.type)) {
			const transactions = store.getState().TransactionsReducer.transactions;
			const categoriesRaw = store.getState().CategoryReducer.categories;
			const mappingsRaw = store.getState().MappingReducer.mappings;

			if (!Array.isArray(transactions) || !Array.isArray(categoriesRaw) || !Array.isArray(mappingsRaw)) {
				return result;
			}

			const categories = categoriesRaw.filter((category) => category.deleted_at === null);
			const mappings = mappingsRaw.filter((mapping) =>
				categories.some((category) => Number(category.id) === Number(mapping.category_id))
			);

			const n = transactions.map((tx) => {
				let matchedCategoryId: number | null = null;
				for (const mapping of mappings) {
					try {
						const patternMatches = mapping.match_type === 'Exact'
							? tx.description.toLowerCase() === mapping.pattern.toLowerCase()
							: new RegExp(mapping.pattern, 'i').test(tx.description);

						if (patternMatches) {
							matchedCategoryId = mapping.category_id;
							break;
						}
					} catch (e) {
						console.warn(`Invalid regex pattern skipped for mapping ID ${mapping.id}: ${mapping.pattern}`, e);
					}
				}

				let resolvedCategoryId: number | undefined =
					typeof tx.category_id === 'number' ? tx.category_id : undefined;

				if (matchedCategoryId !== null) {
					const mappingCategory = categories.find(
						(x) => Number(x.id) === Number(matchedCategoryId)
					);
					if (mappingCategory) {
						resolvedCategoryId = matchedCategoryId;
					}
				}

				const nextTx: Transaction = {
					...tx,
					category_id: resolvedCategoryId,
				};

				return nextTx;
			});
            store.dispatch(setTransactions(n));
        }

        return result;
    };