import type { Transaction } from '@/store/thunks/transactions.get.all';

export type RecurringCandidate = {
	/** Stable id for table rows; distinct across income vs expense for the same description key. */
	rowId: string;
	key: string;
	labelSample: string;
	modeCategoryId: number | null;
	flow: 'expense' | 'income';
	cadenceLabel: string;
	medianGapDays: number;
	/** typical × 30 / median gap (days); matches summary “Est. monthly”. */
	estimatedMonthlyDollars: number;
	typicalAmountDollars: number;
	minAmountDollars: number;
	maxAmountDollars: number;
	occurrences: number;
	firstDate: string;
	lastDate: string;
	confidence: number;
};

function refLikeToken(word: string): boolean {
	const ok = (c: string) => /[a-z0-9_-]/i.test(c);
	if (word.length >= 8 && [...word].every((c) => ok(c))) {
		return true;
	}
	if (/^\d+$/.test(word)) {
		const len = word.length;
		if ((len >= 6 && len <= 7) || len >= 9) {
			return true;
		}
	}
	return false;
}

function variantKeys(normalized: string): string[] {
	const words = normalized.split(/\s+/).filter(Boolean);
	const keys: string[] = [];
	let w = [...words];
	while (true) {
		const key = w.join(' ');
		if (!key) {
			break;
		}
		if (!keys.includes(key)) {
			keys.push(key);
		}
		if (w.length <= 3) {
			break;
		}
		const last = w[w.length - 1];
		if (!last || !refLikeToken(last)) {
			break;
		}
		w = w.slice(0, -1);
	}
	return keys;
}

export function canonicalExpenseGroupKey(description: string): string {
	const normalized = description.trim().toLowerCase().replace(/\s+/g, ' ');
	const variants = variantKeys(normalized);
	return variants[variants.length - 1] ?? normalized;
}

function parseDay(iso: string): number {
	return new Date(iso).setHours(0, 0, 0, 0);
}

function median(nums: number[]): number {
	if (nums.length === 0) {
		return 0;
	}
	const s = [...nums].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function cadenceFromMedianGap(gap: number): string {
	if (gap >= 5 && gap <= 9) {
		return 'Weekly';
	}
	if (gap >= 12 && gap <= 16) {
		return 'Biweekly';
	}
	if (gap >= 26 && gap <= 34) {
		return 'Monthly';
	}
	if (gap >= 360 && gap <= 370) {
		return 'Yearly';
	}
	if (gap >= 85 && gap <= 95) {
		return '~Quarterly';
	}
	return `~every ${Math.round(gap)} days`;
}

function confidenceScore(args: {
	count: number;
	gapSpread: number;
	amountCv: number;
}): number {
	const countScore = Math.min(40, (args.count - 2) * 10);
	const gapScore = Math.max(0, 35 - Math.min(35, args.gapSpread));
	const amtScore = Math.max(0, 25 - Math.min(25, args.amountCv * 50));
	return Math.round(Math.min(100, countScore + gapScore + amtScore));
}

function modeCategoryId(
	ids: Array<number | null | undefined>
): number | null {
	const tallies = new Map<number, number>();
	for (const id of ids) {
		if (id === null || id === undefined) {
			continue;
		}
		tallies.set(id, (tallies.get(id) ?? 0) + 1);
	}
	let bestId: number | null = null;
	let bestCount = 0;
	for (const [id, count] of tallies) {
		if (count > bestCount) {
			bestCount = count;
			bestId = id;
		}
	}
	return bestId;
}

function detectRecurring(
	transactions: Transaction[],
	minOccurrences: number,
	flow: 'expense' | 'income'
): RecurringCandidate[] {
	const filtered = transactions.filter((tx) => {
		if (tx.deleted_at) {
			return false;
		}
		if (flow === 'expense') {
			return tx.amount < 0;
		}
		return tx.amount > 0;
	});
	const groups = new Map<
		string,
		{
			amounts: number[];
			dates: number[];
			categoryIds: Array<number | null | undefined>;
			sample: string;
		}
	>();

	for (const tx of filtered) {
		const key = canonicalExpenseGroupKey(tx.description);
		const entry = groups.get(key);
		const dollarAmt =
			flow === 'expense' ? Math.abs(tx.amount) / 100 : tx.amount / 100;
		const day = parseDay(tx.transaction_date);
		const cid = tx.category_id;
		if (!entry) {
			groups.set(key, {
				amounts: [dollarAmt],
				dates: [day],
				categoryIds: [cid],
				sample: tx.description,
			});
		} else {
			entry.amounts.push(dollarAmt);
			entry.dates.push(day);
			entry.categoryIds.push(cid);
		}
	}

	const out: RecurringCandidate[] = [];

	for (const [key, g] of groups) {
		if (g.amounts.length < minOccurrences) {
			continue;
		}
		const dates = [...new Set(g.dates)].sort((a, b) => a - b);
		if (dates.length < minOccurrences) {
			continue;
		}
		const gaps: number[] = [];
		for (let i = 1; i < dates.length; i++) {
			gaps.push((dates[i]! - dates[i - 1]!) / (24 * 60 * 60 * 1000));
		}
		const medGap = median(gaps);
		const gapSpread =
			gaps.length > 0
				? median(gaps.map((x) => Math.abs(x - medGap)))
				: 99;
		const medAmt = median(g.amounts);
		const sortedAmt = [...g.amounts].sort((a, b) => a - b);
		const minAmt = sortedAmt[0] ?? 0;
		const maxAmt = sortedAmt[sortedAmt.length - 1] ?? 0;
		const amtDev =
			g.amounts.length > 0
				? median(g.amounts.map((x) => Math.abs(x - medAmt)))
				: 0;
		const amountCv = medAmt > 0 ? amtDev / medAmt : 1;
		const mcat = modeCategoryId(g.categoryIds);
		const medianGapDays = Math.round(medGap * 10) / 10;
		const estimatedMonthlyDollars =
			medianGapDays > 0
				? Math.round(((medAmt * 30) / medianGapDays) * 100) / 100
				: 0;

		out.push({
			rowId: `${flow}:${key}`,
			key,
			labelSample: g.sample,
			modeCategoryId: mcat,
			flow,
			cadenceLabel: cadenceFromMedianGap(medGap),
			medianGapDays,
			estimatedMonthlyDollars,
			typicalAmountDollars: Math.round(medAmt * 100) / 100,
			minAmountDollars: Math.round(minAmt * 100) / 100,
			maxAmountDollars: Math.round(maxAmt * 100) / 100,
			occurrences: g.amounts.length,
			firstDate: new Date(dates[0]!).toISOString().slice(0, 10),
			lastDate: new Date(dates[dates.length - 1]!).toISOString().slice(0, 10),
			confidence: confidenceScore({
				count: g.amounts.length,
				gapSpread,
				amountCv,
			}),
		});
	}

	out.sort((a, b) => b.confidence - a.confidence);
	return out;
}

export function detectRecurringExpenses(
	transactions: Transaction[],
	minOccurrences: number
): RecurringCandidate[] {
	return detectRecurring(transactions, minOccurrences, 'expense');
}

export function detectRecurringIncome(
	transactions: Transaction[],
	minOccurrences: number
): RecurringCandidate[] {
	return detectRecurring(transactions, minOccurrences, 'income');
}
