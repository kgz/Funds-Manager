import {
	portfolioTrendSegments,
	type PortfolioTrendSegment,
} from '@/lib/utils/linearTrend';

export type { PortfolioTrendSegment };

export type AccountOnboardingEvent = {
	date: string;
	rowIndex: number;
	trendValue: number;
	isInitial: boolean;
	accounts: Array<{
		accountKey: string;
		label: string;
		startingBalance: number;
	}>;
};

export type TrendSegmentLabel = {
	date: string;
	y: number;
	percentChange: number;
};

export function buildBalanceTrendSegments(
	rows: Array<{ total: number; values: Record<string, number> }>,
	accounts: Array<{ accountKey: string; label: string }>,
): PortfolioTrendSegment[] {
	return portfolioTrendSegments(
		rows.map((row) => row.total),
		rows,
		accounts,
	);
}

export function accountFirstIndexByKey(
	rows: Array<{ values: Record<string, number> }>,
	accounts: Array<{ accountKey: string }>,
): Record<string, number> {
	const result: Record<string, number> = {};
	for (const account of accounts) {
		const firstIndex = rows.findIndex((row) => (row.values[account.accountKey] ?? 0) > 0);
		if (firstIndex >= 0) {
			result[account.accountKey] = firstIndex;
		}
	}
	return result;
}

export function maskAccountsBeforeFirstAppearance<
	TRow extends { [key: string]: string | number | null },
>(rows: TRow[], accounts: Array<{ accountKey: string }>, firstIndexByKey: Record<string, number>): TRow[] {
	return rows.map((row, index) => {
		const overrides: Record<string, null> = {};
		for (const account of accounts) {
			const firstIndex = firstIndexByKey[account.accountKey];
			if (firstIndex !== undefined && index < firstIndex) {
				overrides[account.accountKey] = null;
			}
		}
		return { ...row, ...overrides };
	});
}

export function accountOnboardingIndexInWindow(
	rows: Array<{ values: Record<string, number> }>,
	accountKey: string,
): number | null {
	const firstIndex = rows.findIndex((row) => (row.values[accountKey] ?? 0) > 0);
	if (firstIndex <= 0) {
		return null;
	}
	const previousBalance = rows[firstIndex - 1]?.values[accountKey] ?? 0;
	if (previousBalance > 0) {
		return null;
	}
	return firstIndex;
}

export function buildAccountOnboardingEvents(
	rows: Array<{ date: string; values: Record<string, number> }>,
	accounts: Array<{ accountKey: string; label: string }>,
	segments: PortfolioTrendSegment[],
): AccountOnboardingEvent[] {
	if (rows.length === 0 || segments.length === 0 || accounts.length === 0) {
		return [];
	}

	const firstByAccount = accounts
		.map((account) => ({
			accountKey: account.accountKey,
			label: account.label,
			firstIndex: accountOnboardingIndexInWindow(rows, account.accountKey),
		}))
		.filter(
			(account): account is typeof account & { firstIndex: number } =>
				account.firstIndex !== null,
		);

	return segments.flatMap((segment, segmentIndex) => {
		const rowIndex = segment.startIndex;
		const row = rows[rowIndex];
		if (row === undefined) {
			return [];
		}

		const joining = firstByAccount.filter((account) => account.firstIndex === rowIndex);
		if (joining.length === 0) {
			return [];
		}

		const trendValue = segment.values[rowIndex];
		if (trendValue === null) {
			return [];
		}

		return [
			{
				date: row.date,
				rowIndex,
				trendValue,
				isInitial: segmentIndex === 0,
				accounts: joining.map((account) => ({
					accountKey: account.accountKey,
					label: account.label,
					startingBalance: row.values[account.accountKey] ?? 0,
				})),
			},
		];
	});
}

export function buildTrendSegmentLabels(
	rows: Array<{ date: string; total: number }>,
	segments: PortfolioTrendSegment[],
): TrendSegmentLabel[] {
	const labels: TrendSegmentLabel[] = [];
	for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
		const start = segments[segmentIndex].startIndex;
		const end =
			segmentIndex + 1 < segments.length
				? segments[segmentIndex + 1].startIndex
				: rows.length;
		if (end <= start) {
			continue;
		}
		const slice = rows.slice(start, end);
		const segmentStart = slice[0].total;
		if (segmentStart === 0) {
			continue;
		}
		const segmentEnd = slice[slice.length - 1].total;
		const percentChange = ((segmentEnd - segmentStart) / segmentStart) * 100;
		const midIndex = start + Math.floor((end - start - 1) / 2);
		const trendY = segments[segmentIndex].values[midIndex];
		if (trendY === null) {
			continue;
		}
		labels.push({
			date: rows[midIndex].date,
			y: trendY,
			percentChange,
		});
	}
	return labels;
}

export function portfolioTrendValues(segments: PortfolioTrendSegment[]): Array<number | null> {
	if (segments.length === 0) {
		return [];
	}
	const length = segments[0].values.length;
	return Array.from({ length }, (_, index) => {
		for (const segment of segments) {
			const value = segment.values[index];
			if (value !== null) {
				return value;
			}
		}
		return null;
	});
}

export function applyPortfolioTrendToRows<
	TRow extends Record<string, string | number | null>,
>(
	baseRows: TRow[],
	segments: PortfolioTrendSegment[],
): Array<TRow & { trend: number | null }> {
	const trendValues = portfolioTrendValues(segments);
	return baseRows.map((row, index) => ({
		...row,
		trend: trendValues[index] ?? null,
	}));
}

export function lastPortfolioTrendAnchor(segments: PortfolioTrendSegment[]): number {
	if (segments.length === 0) {
		return 0;
	}
	return segments[segments.length - 1].startIndex;
}
