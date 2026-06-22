import { useCallback, useEffect, useState } from 'react';
import { fetchTransferSuggestions } from '@/types/transfer';

export const ACTIONABLE_ITEMS_CHANGED = 'actionable-items-changed';

/** @deprecated use notifyActionableItemsChanged */
export const TRANSFER_SUGGESTIONS_CHANGED = ACTIONABLE_ITEMS_CHANGED;

export function notifyActionableItemsChanged(): void {
	window.dispatchEvent(new Event(ACTIONABLE_ITEMS_CHANGED));
}

export function notifyTransferSuggestionsChanged(): void {
	notifyActionableItemsChanged();
}

async function fetchActionableItemCount(): Promise<number> {
	const transferSuggestions = await fetchTransferSuggestions();
	return transferSuggestions.length;
}

export function useActionableItemCount(): number {
	const [count, setCount] = useState(0);

	const refresh = useCallback(() => {
		void fetchActionableItemCount()
			.then(setCount)
			.catch(() => setCount(0));
	}, []);

	useEffect(() => {
		refresh();
		const onChanged = () => refresh();
		window.addEventListener(ACTIONABLE_ITEMS_CHANGED, onChanged);
		window.addEventListener('focus', onChanged);
		return () => {
			window.removeEventListener(ACTIONABLE_ITEMS_CHANGED, onChanged);
			window.removeEventListener('focus', onChanged);
		};
	}, [refresh]);

	return count;
}
