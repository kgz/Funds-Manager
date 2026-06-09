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
