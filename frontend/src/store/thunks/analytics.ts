import axios from 'axios';
import type { Transaction } from '@/types/transaction';

export type DashboardAnalytics = {
	monthlySummary: Array<{
		month: string;
		spending: number;
		receiving: number;
	}>;
	spendingByCategory: Array<{
		groupKey: string;
		categoryId: number | null;
		name: string;
		colour: string | null;
		value: number;
		percent: number;
	}>;
	incomeByCategory: Array<{
		groupKey: string;
		categoryId: number | null;
		name: string;
		colour: string | null;
		value: number;
		percent: number;
	}>;
	balanceSeries: Array<{
		date: string;
		balance: number;
	}>;
};

export type BreakdownParentRow = {
	sectionKey: string;
	categoryId: number | null;
	label: string;
	colour: string | undefined;
	spending: number;
	income: number;
	txnCount: number;
	subRows: Array<{
		key: string;
		labelSample: string;
		spending: number;
		income: number;
		count: number;
	}>;
};

export type RecurringCandidateRow = {
	rowId: string;
	key: string;
	labelSample: string;
	modeCategoryId: number | null;
	flow: 'expense' | 'income';
	cadenceLabel: string;
	medianGapDays: number;
	estimatedMonthlyDollars: number;
	typicalAmountDollars: number;
	minAmountDollars: number;
	maxAmountDollars: number;
	occurrences: number;
	firstDate: string;
	lastDate: string;
	confidence: number;
};

export type PaginatedTransactionsResponse = {
	items: Transaction[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
};

export type DashboardDateRange = {
	start?: string;
	end?: string;
};

export type DashboardKpiSummary = {
	spending: number;
	income: number;
	net: number;
	balance: number | null;
};

export async function fetchDashboardKpis(
	dateRange?: DashboardDateRange,
	signal?: AbortSignal
): Promise<DashboardKpiSummary> {
	const params = new URLSearchParams();
	if (dateRange?.start !== undefined) {
		params.set('start', dateRange.start);
	}
	if (dateRange?.end !== undefined) {
		params.set('end', dateRange.end);
	}
	const response = await axios.get(`/api/analytics/kpis?${params.toString()}`, {
		signal,
	});
	return response.data as DashboardKpiSummary;
}

export async function fetchDashboardAnalytics(
	groupByParent: boolean,
	dateRange?: DashboardDateRange,
	signal?: AbortSignal
): Promise<DashboardAnalytics> {
	const params = new URLSearchParams();
	if (groupByParent) {
		params.set('group_by_parent', 'true');
	}
	if (dateRange?.start !== undefined) {
		params.set('start', dateRange.start);
	}
	if (dateRange?.end !== undefined) {
		params.set('end', dateRange.end);
	}
	const response = await axios.get(`/api/analytics/dashboard?${params.toString()}`, {
		signal,
	});
	return response.data as DashboardAnalytics;
}

export async function fetchBreakdownAnalytics(
	start: string,
	end: string,
	signal?: AbortSignal
): Promise<BreakdownParentRow[]> {
	const params = new URLSearchParams({ start, end });
	const response = await axios.get(`/api/analytics/breakdown?${params.toString()}`, {
		signal,
	});
	return response.data as BreakdownParentRow[];
}

export async function fetchRecurringAnalytics(
	minOccurrences = 3,
	signal?: AbortSignal
): Promise<RecurringCandidateRow[]> {
	const params = new URLSearchParams({ min_occurrences: String(minOccurrences) });
	const response = await axios.get(`/api/analytics/recurring?${params.toString()}`, {
		signal,
	});
	return response.data as RecurringCandidateRow[];
}

export type SpendingNameRow = {
	name: string;
	totalDollars: number;
	count: number;
};

export async function fetchSpendingDrilldownByName(params: {
	groupKey: string;
	groupByParent: boolean;
	signal?: AbortSignal;
}): Promise<SpendingNameRow[]> {
	const search = new URLSearchParams({ group_key: params.groupKey });
	if (params.groupByParent) {
		search.set('group_by_parent', 'true');
	}
	const response = await axios.get(
		`/api/analytics/spending-drilldown-by-name?${search.toString()}`,
		{ signal: params.signal }
	);
	const data = response.data as Array<{
		name: string;
		totalDollars: number;
		count: number;
	}>;
	return data;
}

export async function fetchIncomeDrilldownByName(params: {
	groupKey: string;
	groupByParent: boolean;
	signal?: AbortSignal;
}): Promise<SpendingNameRow[]> {
	const search = new URLSearchParams({ group_key: params.groupKey });
	if (params.groupByParent) {
		search.set('group_by_parent', 'true');
	}
	const response = await axios.get(
		`/api/analytics/income-drilldown-by-name?${search.toString()}`,
		{ signal: params.signal }
	);
	const data = response.data as Array<{
		name: string;
		totalDollars: number;
		count: number;
	}>;
	return data;
}

export async function fetchIncomeDrilldown(params: {
	groupKey: string;
	groupByParent: boolean;
	page: number;
	perPage?: number;
	signal?: AbortSignal;
}): Promise<PaginatedTransactionsResponse> {
	const search = new URLSearchParams({
		group_key: params.groupKey,
		page: String(params.page),
		per_page: String(params.perPage ?? 50),
	});
	if (params.groupByParent) {
		search.set('group_by_parent', 'true');
	}
	const response = await axios.get(
		`/api/analytics/income-drilldown?${search.toString()}`,
		{ signal: params.signal }
	);
	const data = response.data as {
		items: Transaction[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	};
	return {
		items: data.items,
		total: data.total,
		page: data.page,
		perPage: data.per_page,
		totalPages: data.total_pages,
	};
}

export async function fetchSpendingDrilldown(params: {
	groupKey: string;
	groupByParent: boolean;
	page: number;
	perPage?: number;
	signal?: AbortSignal;
}): Promise<PaginatedTransactionsResponse> {
	const search = new URLSearchParams({
		group_key: params.groupKey,
		page: String(params.page),
		per_page: String(params.perPage ?? 50),
	});
	if (params.groupByParent) {
		search.set('group_by_parent', 'true');
	}
	const response = await axios.get(
		`/api/analytics/spending-drilldown?${search.toString()}`,
		{ signal: params.signal }
	);
	const data = response.data as {
		items: Transaction[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	};
	return {
		items: data.items,
		total: data.total,
		page: data.page,
		perPage: data.per_page,
		totalPages: data.total_pages,
	};
}
