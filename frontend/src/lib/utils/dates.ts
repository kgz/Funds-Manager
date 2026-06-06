import { DateTime } from 'luxon';

export function formatMonthLabel(month: string): string {
	const dt = DateTime.fromFormat(month, 'LLL yyyy');
	return dt.isValid ? dt.toFormat('MMMM yyyy') : month;
}

export function formatTransactionDate(iso: string): string {
	const dt = DateTime.fromISO(iso.slice(0, 10));
	return dt.isValid ? dt.toFormat('d MMMM yyyy') : iso.slice(0, 10);
}

export function formatChartAxisDate(iso: string, spanDays: number): string {
	const dt = DateTime.fromISO(iso);
	if (!dt.isValid) {
		return iso;
	}
	if (spanDays > 365) {
		return dt.toFormat('MMM yyyy');
	}
	return dt.toFormat('d MMM');
}

export function formatChartTooltipDate(iso: string): string {
	const dt = DateTime.fromISO(iso);
	return dt.isValid ? dt.toFormat('cccc d MMMM yyyy') : iso;
}

export function chartDateSpanDays(dates: string[]): number {
	if (dates.length < 2) {
		return 0;
	}
	const start = DateTime.fromISO(dates[0]);
	const end = DateTime.fromISO(dates[dates.length - 1]);
	if (!start.isValid || !end.isValid) {
		return 0;
	}
	return end.diff(start, 'days').days;
}
