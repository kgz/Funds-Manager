import { useCallback, useEffect, useState } from 'react';
import { fetchPlannedMatchSuggestionCount } from '@/types/plannedSpending';
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

export function notifyPlannedMatchesChanged(): void {
	notifyActionableItemsChanged();
}

export type ActionableCounts = {
	transfers: number;
	plannedMatches: number;
};

async function fetchActionableCounts(): Promise<ActionableCounts> {
	const [transferSuggestions, plannedMatchCount] = await Promise.all([
		fetchTransferSuggestions(),
		fetchPlannedMatchSuggestionCount(),
	]);
	return {
		transfers: transferSuggestions.length,
		plannedMatches: plannedMatchCount,
	};
}

export function useActionableCounts(): ActionableCounts {
	const [counts, setCounts] = useState<ActionableCounts>({
		transfers: 0,
		plannedMatches: 0,
	});

	const refresh = useCallback(() => {
		void fetchActionableCounts()
			.then(setCounts)
			.catch(() =>
				setCounts({
					transfers: 0,
					plannedMatches: 0,
				})
			);
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

	return counts;
}

export function useActionableItemCount(): number {
	const { transfers } = useActionableCounts();
	return transfers;
}
