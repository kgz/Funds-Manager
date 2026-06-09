const STORAGE_KEY = 'funds-account-filter';

export function readStoredAccountFilterId(): string | null {
	return localStorage.getItem(STORAGE_KEY);
}

export function writeStoredAccountFilterId(accountId: string | null): void {
	if (accountId === null || accountId.length === 0) {
		localStorage.removeItem(STORAGE_KEY);
		return;
	}
	localStorage.setItem(STORAGE_KEY, accountId);
}
