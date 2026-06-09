export type PortfolioTrendSegment = {
	label: string;
	startIndex: number;
	values: Array<number | null>;
};

export function portfolioTrendSegments(
	totals: number[],
	rows: Array<{ values: Record<string, number> }>,
	accounts: Array<{ accountKey: string; label: string }>,
): PortfolioTrendSegment[] {
	if (totals.length === 0 || accounts.length === 0) {
		return [];
	}

	const firstByAccount = accounts
		.map((account) => ({
			accountKey: account.accountKey,
			label: account.label,
			firstIndex: rows.findIndex((row) => (row.values[account.accountKey] ?? 0) > 0),
		}))
		.filter((account) => account.firstIndex >= 0)
		.sort((left, right) => left.firstIndex - right.firstIndex);

	if (firstByAccount.length === 0) {
		return [];
	}

	const boundaries = [...new Set(firstByAccount.map((account) => account.firstIndex))].sort(
		(left, right) => left - right,
	);

	return boundaries.map((startIndex, segmentIndex) => {
		const endIndex =
			segmentIndex + 1 < boundaries.length ? boundaries[segmentIndex + 1] : totals.length;
		const slice = totals.slice(startIndex, endIndex);
		const trend = linearTrend(slice);
		const activeLabels = firstByAccount
			.filter((account) => account.firstIndex <= startIndex)
			.map((account) => account.label);
		const values: Array<number | null> = totals.map(() => null);
		for (let i = 0; i < trend.length; i++) {
			values[startIndex + i] = trend[i];
		}
		return {
			label: activeLabels.join(' + '),
			startIndex,
			values,
		};
	});
}

export function portfolioTrendAnchorIndex(
	rows: Array<{ values: Record<string, number> }>,
	accountKeys: string[],
): number {
	if (rows.length === 0 || accountKeys.length === 0) {
		return 0;
	}
	let anchor = 0;
	for (const key of accountKeys) {
		const firstIndex = rows.findIndex((row) => (row.values[key] ?? 0) > 0);
		if (firstIndex < 0) {
			continue;
		}
		if (firstIndex > anchor) {
			anchor = firstIndex;
		}
	}
	return anchor;
}

export function linearTrendAligned(
	values: number[],
	anchorIndex: number,
): Array<number | null> {
	const start = Math.min(Math.max(anchorIndex, 0), values.length);
	const slice = values.slice(start);
	if (slice.length === 0) {
		return values.map(() => null);
	}
	const trend = linearTrend(slice);
	return values.map((_, index) => (index < start ? null : trend[index - start] ?? null));
}

export function trendSummaryFromAnchor(
	values: number[],
	anchorIndex: number,
): TrendSummary | null {
	const start = Math.min(Math.max(anchorIndex, 0), values.length);
	return trendSummary(values.slice(start));
}

export function linearTrend(values: number[]): number[] {
	if (values.length === 0) {
		return [];
	}
	if (values.length === 1) {
		return [values[0]];
	}
	const n = values.length;
	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumXX = 0;
	for (let i = 0; i < n; i++) {
		sumX += i;
		sumY += values[i];
		sumXY += i * values[i];
		sumXX += i * i;
	}
	const denom = n * sumXX - sumX * sumX;
	if (denom === 0) {
		return values.map(() => sumY / n);
	}
	const slope = (n * sumXY - sumX * sumY) / denom;
	const intercept = (sumY - slope * sumX) / n;
	return values.map((_, i) => slope * i + intercept);
}

export type TrendSummary = {
	start: number;
	end: number;
	change: number;
	percentChange: number | null;
};

export function trendSummary(values: number[]): TrendSummary | null {
	if (values.length === 0) {
		return null;
	}
	const trend = linearTrend(values);
	const start = trend[0];
	const end = trend[trend.length - 1];
	const change = end - start;
	const percentChange = start !== 0 ? (change / start) * 100 : null;
	return {
		start,
		end,
		change,
		percentChange,
	};
}
