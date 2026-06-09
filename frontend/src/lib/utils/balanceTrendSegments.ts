import {
	portfolioTrendSegments,
	type PortfolioTrendSegment,
} from '@/lib/utils/linearTrend';

export type { PortfolioTrendSegment };

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
