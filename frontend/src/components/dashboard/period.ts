import { DateTime } from 'luxon';

export type DashboardPeriod = 'this-month' | 'last-3-months' | 'all';

export const DASHBOARD_PERIOD_STORAGE_KEY = 'dashboardDateRange';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
	'this-month': 'This month',
	'last-3-months': 'Last 3 months',
	all: 'All time',
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
