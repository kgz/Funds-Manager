import { DateTime } from 'luxon';

export type DashboardPeriod =
	| 'this-month'
	| 'last-3-months'
	| 'last-6-months'
	| 'last-12-months'
	| 'all';

export const DASHBOARD_PERIOD_STORAGE_KEY = 'dashboardDateRange';

const PERIOD_VALUES: DashboardPeriod[] = [
	'this-month',
	'last-3-months',
	'last-6-months',
	'last-12-months',
	'all',
];

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
	'this-month': 'This month',
	'last-3-months': '3 months',
	'last-6-months': '6 months',
	'last-12-months': '1 year',
	all: 'All time',
};

export const COMPARISON_LABELS: Record<Exclude<DashboardPeriod, 'all'>, string> = {
	'this-month': 'vs last month',
	'last-3-months': 'vs prior 3 months',
	'last-6-months': 'vs prior 6 months',
	'last-12-months': 'vs prior year',
};

function isDashboardPeriod(value: string): value is DashboardPeriod {
	return PERIOD_VALUES.includes(value as DashboardPeriod);
}

function rollingMonthsStart(monthsInclusive: number): string | null {
	const now = DateTime.now();
	return now.minus({ months: monthsInclusive - 1 }).startOf('month').toISODate();
}

function previousRollingRange(
	currentStartIso: string,
	spanMonths: number
): { start: string; end: string } | null {
	const currentStart = DateTime.fromISO(currentStartIso);
	if (!currentStart.isValid) {
		return null;
	}
	const prevEnd = currentStart.minus({ days: 1 });
	const prevStart = currentStart.minus({ months: spanMonths });
	const start = prevStart.toISODate();
	const end = prevEnd.toISODate();
	if (start === null || end === null) {
		return null;
	}
	return { start, end };
}

export function readStoredPeriod(): DashboardPeriod {
	const stored = localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
	if (stored !== null && isDashboardPeriod(stored)) {
		return stored;
	}
	return 'all';
}

export function periodDateRange(period: DashboardPeriod): { start?: string; end?: string } {
	if (period === 'all') {
		return {};
	}
	const now = DateTime.now();
	const end = now.toISODate();
	if (end === null) {
		return {};
	}
	if (period === 'this-month') {
		const start = now.startOf('month').toISODate();
		return start === null ? {} : { start, end };
	}
	const monthsInclusive =
		period === 'last-3-months'
			? 3
			: period === 'last-6-months'
				? 6
				: 12;
	const start = rollingMonthsStart(monthsInclusive);
	return start === null ? {} : { start, end };
}

export function previousPeriodDateRange(
	period: Exclude<DashboardPeriod, 'all'>
): { start: string; end: string } | null {
	const now = DateTime.now();
	if (period === 'this-month') {
		const prev = now.minus({ months: 1 });
		const start = prev.startOf('month').toISODate();
		const end = prev.endOf('month').toISODate();
		if (start === null || end === null) {
			return null;
		}
		return { start, end };
	}
	const monthsInclusive =
		period === 'last-3-months'
			? 3
			: period === 'last-6-months'
				? 6
				: 12;
	const currentStart = rollingMonthsStart(monthsInclusive);
	if (currentStart === null) {
		return null;
	}
	return previousRollingRange(currentStart, monthsInclusive);
}
