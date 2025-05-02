import { Middleware, MiddlewareAPI, Dispatch, AnyAction, type Action } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store'; // Import AppDispatch
import { setTransactions } from '../slices/transactionsSlice';
import type { Transaction } from '../thunks/transactions.get.all';

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

// @ts-expect-error
export const transactionWatcherMiddleware: Middleware<{}, RootState> =
    (store: MiddlewareAPI<AppDispatch, RootState>) => (next: AppDispatch) => (action: Action) => {
        const result = next(action); // Pass the action along first

        if (TRANSACTION_UPDATE_ACTIONS.includes(action.type)) {
			const mappings = store.getState().MappingReducer.mappings;
			const transactions = store.getState().TransactionsReducer.transactions;
			const categories = store.getState().CategoryReducer.categories.filter(x=>x.deleted_at===null);

			const n = [...transactions].map(tx => {
				let matchedCategoryId: number | null = null;
				for (const mapping of mappings) { // Mappings are pre-sorted by priority
					try {
						const patternMatches = mapping.match_type === 'Exact'
							? tx.description.toLowerCase() === mapping.pattern.toLowerCase() // Case-insensitive exact match
							: new RegExp(mapping.pattern, 'i').test(tx.description); // Case-insensitive regex match
	
						if (patternMatches) {
							matchedCategoryId = mapping.category_id;
							break; // Stop at the first match (highest priority)
						}
					} catch (e) {
						console.warn(`Invalid regex pattern skipped for mapping ID ${mapping.id}: ${mapping.pattern}`, e);
					}
				}

				const category = categories.find(x=> Number(x.id) === Number(matchedCategoryId))
				
				return {
					...tx,
					category_id: Boolean(category) ? matchedCategoryId : null
				} as Transaction;
			});
            console.log('Transaction update detected, running category mapping...', {n, mappings});
            store.dispatch(setTransactions(n));
        }

        return result;
    };