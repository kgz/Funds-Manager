import { DateTime } from 'luxon';

export type DashboardPeriod = 'this-month' | 'last-3-months' | 'all';

export const DASHBOARD_PERIOD_STORAGE_KEY = 'dashboardDateRange';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
	'this-month': 'This month',
	'last-3-months': 'Last 3 months',
	all: 'All time',
};

export const COMPARISON_LABELS: Record<Exclude<DashboardPeriod, 'all'>, string> = {
	'this-month': 'vs last month',
	'last-3-months': 'vs prior 3 months',
};

export function readStoredPeriod(): DashboardPeriod {
	const stored = localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
	if (stored === 'this-month' || stored === 'last-3-months' || stored === 'all') {
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
	const start = now.minus({ months: 2 }).startOf('month').toISODate();
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
	const currentStart = now.minus({ months: 2 }).startOf('month');
	const prevEnd = currentStart.minus({ days: 1 }).toISODate();
	const prevStart = currentStart.minus({ months: 3 }).toISODate();
	if (prevStart === null || prevEnd === null) {
		return null;
	}
	return { start: prevStart, end: prevEnd };
}
